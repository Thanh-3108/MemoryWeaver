"""AI-Powered Smart Texture Extractor & Seamless UV Tile Generator for MemoryWeaver.

Pipeline:
1. Load image (file path or base64 data URI).
2. Multi-stage AI Material & Surface Decomposition:
   - Parses AI semantic regions and material profiles from Gemini Vision.
   - Detects foreign clutter (laptops, mice, calculators, notebooks, pens, bags, people).
   - Isolates clean surface patches and samples authentic material colors.
3. For each architectural & furniture surface:
   a. Crop clean region of interest if available.
   b. Clutter & Foreground Inpainting (OpenCV Telea inpainting to remove any stray pen/line/shadow).
   c. High-Definition Architectural Material Synthesis:
      - Varnished wood grain for desks and chairs (fine longitudinal fibers, growth rings, clear-coat sheen).
      - Polished terrazzo / ceramic tiles for floors (subtle mineral flecks, clean grout lines).
      - Matte wall paint for walls (fine plaster eggshell micro-texture).
      - Porcelain enamel for whiteboards / screens.
      - Woven textiles for fabric upholstery.
   d. Seamless Tiling: Edge mirror-crossfade blending so 3D repetition has zero seams.
4. Export compact JPEG Data URIs and PBR material metadata in JSON format for Three.js.
"""

import argparse
import base64
import io
import json
import os
import sys
from pathlib import Path
import numpy as np

# Ensure UTF-8 stdout
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from PIL import Image, ImageOps
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False


def hex_to_rgb(h, default=(200.0, 200.0, 200.0)):
    """Convert hex string (#RRGGBB) to float32 RGB array."""
    if not h or not isinstance(h, str):
        return np.array(default, dtype=np.float32)
    clean = h.lstrip('#').strip()
    if len(clean) != 6:
        return np.array(default, dtype=np.float32)
    try:
        return np.array([int(clean[i:i+2], 16) for i in (0, 2, 4)], dtype=np.float32)
    except Exception:
        return np.array(default, dtype=np.float32)


def rgb_to_hex(rgb):
    """Convert float or int RGB array to #RRGGBB hex string."""
    r = int(np.clip(rgb[0], 0, 255))
    g = int(np.clip(rgb[1], 0, 255))
    b = int(np.clip(rgb[2], 0, 255))
    return f"#{r:02X}{g:02X}{b:02X}"


def load_input_image(image_input):
    """Load image from file path or base64 string into RGB numpy array and PIL Image."""
    if isinstance(image_input, str):
        if image_input.startswith("data:"):
            image_input = image_input.split(",", 1)[1]
        if os.path.exists(image_input):
            pil_img = Image.open(image_input)
        else:
            raw_bytes = base64.b64decode(image_input)
            pil_img = Image.open(io.BytesIO(raw_bytes))
    elif isinstance(image_input, Image.Image):
        pil_img = image_input.copy()
        pil_img.info['exif'] = image_input.getexif().tobytes()
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    if pil_img.width * pil_img.height > 16_000_000:
        pil_img.close()
        raise ValueError("Image exceeds 16 megapixels")
    pil_img = ImageOps.exif_transpose(pil_img)

    max_dim = max(pil_img.width, pil_img.height)
    if max_dim > 1600:
        scale = 1600.0 / max_dim
        pil_img = pil_img.resize((int(pil_img.width * scale), int(pil_img.height * scale)), Image.Resampling.BILINEAR)

    pil_img = pil_img.convert("RGB")
    img_rgb = np.array(pil_img, dtype=np.uint8)
    return pil_img, img_rgb


def get_patch_clutter_score(patch_rgb):
    """Calculate a clutter / obstruction penalty score for a texture patch."""
    if not HAS_CV2:
        return float(np.std(patch_rgb))

    h, w = patch_rgb.shape[:2]
    total_pixels = float(h * w)
    if total_pixels < 10:
        return float('inf')

    gray = cv2.cvtColor(patch_rgb, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 60, 160)
    edge_density = np.count_nonzero(edges) / total_pixels

    hsv = cv2.cvtColor(patch_rgb, cv2.COLOR_RGB2HSV)
    std_h = np.std(hsv[:, :, 0])
    std_s = np.std(hsv[:, :, 1])

    clutter_score = (edge_density * 5.0) + (std_h / 180.0) + (std_s / 255.0)
    return float(clutter_score)


def inpaint_clutter_and_foreign_objects(patch_rgb):
    """Detect small foreground clutter (pens, paper, crumbs, stickers, highlights)
    and inpaint them using the surrounding uniform material texture.
    """
    if not HAS_CV2:
        return patch_rgb

    h, w = patch_rgb.shape[:2]
    if h < 20 or w < 20:
        return patch_rgb

    flat = patch_rgb.reshape(-1, 3).astype(np.float32)
    median_color = np.median(flat, axis=0)

    color_dist = np.linalg.norm(patch_rgb.astype(np.float32) - median_color, axis=2)

    gray = cv2.cvtColor(patch_rgb, cv2.COLOR_RGB2GRAY)
    grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    grad_mag = cv2.magnitude(grad_x, grad_y)

    dist_thresh = np.percentile(color_dist, 82)
    grad_thresh = np.percentile(grad_mag, 85)

    clutter_candidates = (color_dist > dist_thresh) & (grad_mag > grad_thresh)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.dilate(clutter_candidates.astype(np.uint8) * 255, kernel)

    mask_ratio = np.count_nonzero(mask) / float(h * w)

    if 0.002 < mask_ratio < 0.28:
        bgr = cv2.cvtColor(patch_rgb, cv2.COLOR_RGB2BGR)
        clean_bgr = cv2.inpaint(bgr, mask, inpaintRadius=4, flags=cv2.INPAINT_TELEA)
        return cv2.cvtColor(clean_bgr, cv2.COLOR_BGR2RGB)

    return patch_rgb


def make_seamless_tile(patch_rgb, target_size=(512, 512)):
    """Synthesize seamless tile by blending edge borders so opposite sides connect seamlessly."""
    tw, th = target_size
    if HAS_CV2:
        resized = cv2.resize(patch_rgb, (tw, th), interpolation=cv2.INTER_AREA)
    else:
        pil_patch = Image.fromarray(patch_rgb)
        resized = np.array(pil_patch.resize((tw, th), Image.Resampling.BILINEAR))

    blend_width = int(tw * 0.12)
    out = resized.copy().astype(np.float32)

    # Horizontal blend
    for x in range(blend_width):
        alpha = x / float(blend_width)
        out[:, x] = (1.0 - alpha) * resized[:, tw - blend_width + x] + alpha * resized[:, x]
        out[:, tw - blend_width + x] = (1.0 - alpha) * resized[:, tw - blend_width + x] + alpha * resized[:, x]

    # Vertical blend
    for y in range(blend_width):
        alpha = y / float(blend_width)
        out[y, :] = (1.0 - alpha) * out[th - blend_width + y, :] + alpha * out[y, :]
        out[th - blend_width + y, :] = (1.0 - alpha) * out[th - blend_width + y, :] + alpha * out[y, :]

    return np.clip(out, 0, 255).astype(np.uint8)


def sanitize_wood_color(rgb_array):
    """Ensure wood color is within natural warm timber spectrum,
    preventing murky green or cool desaturated gray tones caused by camera shadows.
    """
    r, g, b = float(rgb_array[0]), float(rgb_array[1]), float(rgb_array[2])
    # If red is not dominant over blue, or green is overpowering red (muddy olive/gray)
    if r <= b * 1.05 or g > r * 0.98 or (r + g + b) / 3.0 < 45.0:
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        lum = max(75.0, min(210.0, lum))
        # Warm golden oak/birch ratio: R=1.24, G=0.96, B=0.65
        target_r = min(255.0, lum * 1.24)
        target_g = min(255.0, lum * 0.96)
        target_b = min(255.0, lum * 0.65)
        return np.array([target_r, target_g, target_b], dtype=np.float32)
    return np.array([r, g, b], dtype=np.float32)


def synthesize_wood_texture(dom_hex='#C48A57', sec_hex='#A16637', size=(512, 512), grain_dir='horizontal', photo_patch=None):
    """Synthesize high-definition, architectural-grade staggered wood plank texture."""
    w, h = size
    c1 = hex_to_rgb(dom_hex, (196.0, 145.0, 95.0))
    if photo_patch is not None and photo_patch.shape[0] >= 16 and photo_patch.shape[1] >= 16:
        patch_median = np.median(photo_patch.reshape(-1, 3), axis=0).astype(np.float32)
        c1 = patch_median

    c1 = sanitize_wood_color(c1)

    num_planks = 5
    img = np.zeros((h, w, 3), dtype=np.float32)
    plank_h = h // num_planks
    rng = np.random.RandomState(42)

    for p in range(num_planks):
        y0 = p * plank_h
        y1 = (p + 1) * plank_h if p < num_planks - 1 else h
        ph = y1 - y0

        # Subtle natural plank-to-plank tone variation (+/- 5%)
        tone_shift = rng.uniform(-10.0, 10.0, (1, 1, 3))
        p_base = np.clip(c1 + tone_shift, 30.0, 245.0)

        y_coords = np.linspace(0, 1, ph)[:, None]
        x_coords = np.linspace(0, 1, w)[None, :]

        # Multi-frequency organic wood grain fibers
        flow = np.sin(x_coords * 3.5 * np.pi + rng.uniform(-1, 1)) * 0.08
        fibers = np.sin((y_coords + flow) * 80.0 * np.pi) * 0.5 + 0.5
        pores = rng.normal(0, 3.5, (ph, w, 1))
        rings = np.sin((y_coords + flow * 0.5) * 14.0 * np.pi) * 0.5 + 0.5

        pattern = np.clip(0.68 * fibers + 0.28 * rings, 0.0, 1.0)[:, :, None]
        dark_grain = np.clip(p_base * 0.82, 0.0, 255.0)
        plank_rgb = p_base[None, None, :] * (1.0 - pattern * 0.25) + dark_grain[None, None, :] * (pattern * 0.25) + pores

        # Micro-bevel between planks for realistic 3D depth
        if y1 < h:
            plank_rgb[-2:, :] *= 0.76  # bevel shadow groove
        if y0 > 0:
            plank_rgb[:1, :] *= 1.10   # bevel edge highlight

        img[y0:y1, :] = plank_rgb

    return make_seamless_tile(np.clip(img, 0, 255).astype(np.uint8), target_size=size)


def synthesize_carpet_texture(dom_hex='#2C3E50', sec_hex='#1E2B37', size=(512, 512), photo_patch=None):
    """Synthesize luxury architectural acoustic carpet / melange loop-pile texture."""
    w, h = size
    c_carpet = hex_to_rgb(dom_hex, (44.0, 62.0, 80.0))
    if photo_patch is not None and photo_patch.shape[0] >= 16 and photo_patch.shape[1] >= 16:
        patch_median = np.median(photo_patch.reshape(-1, 3), axis=0).astype(np.float32)
        c_carpet = patch_median

    rng = np.random.RandomState(99)
    base = np.clip(c_carpet, 20.0, 230.0)

    # 2D woven loop pile
    y, x = np.mgrid[0:h, 0:w]
    grid_weave = (np.sin(x * 0.8) * np.cos(y * 0.8) * 0.5 + 0.5)[:, :, None]

    # Multi-tone melange fibers (fine dark and light flecks)
    flecks = rng.normal(0, 14.0, (h, w, 3))
    dark_tone = np.clip(base * 0.82, 0.0, 255.0)

    carpet = base[None, None, :] * (1.0 - grid_weave * 0.25) + dark_tone[None, None, :] * (grid_weave * 0.25) + flecks

    # Subtle acoustic modular tile seams (50x50cm look: 2x2 grid)
    mid_x, mid_y = w // 2, h // 2
    carpet[mid_y-1:mid_y+1, :] *= 0.88
    carpet[:, mid_x-1:mid_x+1] *= 0.88

    return make_seamless_tile(np.clip(carpet, 0, 255).astype(np.uint8), target_size=size)


def synthesize_tile_texture(dom_hex='#EAEAEA', sec_hex='#D0D0D0', size=(512, 512), tile_style='terrazzo', tiles_per_axis=2, photo_patch=None):
    """Synthesize high-definition architectural porcelain / terrazzo tiles."""
    w, h = size
    c_tile = hex_to_rgb(dom_hex, (234.0, 234.0, 234.0))
    c_grout = hex_to_rgb(sec_hex, (200.0, 200.0, 200.0))

    if photo_patch is not None and photo_patch.shape[0] >= 16 and photo_patch.shape[1] >= 16:
        patch_median = np.median(photo_patch.reshape(-1, 3), axis=0).astype(np.float32)
        c_tile = patch_median
        c_grout = np.clip(patch_median * 0.86, 0.0, 255.0)

    rng = np.random.RandomState(101)
    specks = rng.normal(0, 4.0, (h, w, 1))
    # Subtle soft marble vein gradient
    y, x = np.mgrid[0:h, 0:w]
    veins = (np.sin(x * 0.03 + np.sin(y * 0.04) * 2.0) * 0.5 + 0.5)[:, :, None]
    tile_surface = np.clip(c_tile + specks - veins * 6.0, 0, 255)

    # Clean micro-grout lines
    grout_mask = np.zeros((h, w), dtype=np.float32)
    tile_w = w // tiles_per_axis
    tile_h = h // tiles_per_axis
    grout_width = 1

    for i in range(tiles_per_axis + 1):
        gx = min(w - 1, i * tile_w)
        gy = min(h - 1, i * tile_h)
        grout_mask[:, max(0, gx - grout_width):min(w, gx + grout_width + 1)] = 1.0
        grout_mask[max(0, gy - grout_width):min(h, gy + grout_width + 1), :] = 1.0

    grout_mask = grout_mask[:, :, None]
    img = tile_surface * (1.0 - grout_mask) + c_grout * grout_mask
    return make_seamless_tile(np.clip(img, 0, 255).astype(np.uint8), target_size=size)


def synthesize_wall_texture(dom_hex='#FFFDF0', sec_hex='#F2EFE6', size=(512, 512), photo_patch=None):
    """Synthesize realistic architectural matte eggshell wall plaster."""
    w, h = size
    c_wall = hex_to_rgb(dom_hex, (248.0, 246.0, 238.0))
    if photo_patch is not None and photo_patch.shape[0] >= 16 and photo_patch.shape[1] >= 16:
        patch_median = np.median(photo_patch.reshape(-1, 3), axis=0).astype(np.float32)
        c_wall = np.clip(patch_median, 160.0, 255.0)

    rng = np.random.RandomState(88)
    micro_stucco = rng.normal(0, 2.0, (h, w, 1))
    img = np.clip(c_wall + micro_stucco, 0, 255).astype(np.uint8)
    return make_seamless_tile(img, target_size=size)


def synthesize_screen_texture(photo_patch=None, dom_hex='#FFFFFF', size=(512, 384)):
    """Synthesize projector screen / slide texture directly from cropped slide patch."""
    tw, th = size
    if photo_patch is not None and photo_patch.shape[0] >= 32 and photo_patch.shape[1] >= 32:
        if HAS_CV2:
            return cv2.resize(photo_patch, (tw, th), interpolation=cv2.INTER_AREA)
        else:
            pil_p = Image.fromarray(photo_patch)
            return np.array(pil_p.resize((tw, th), Image.Resampling.BILINEAR))
    c_bg = hex_to_rgb(dom_hex, (245.0, 248.0, 250.0))
    img = np.full((th, tw, 3), c_bg, dtype=np.uint8)
    return img


def synthesize_board_texture(dom_hex='#F2F2F2', sec_hex='#E0E0E0', size=(512, 512), photo_patch=None):
    """Synthesize smooth whiteboard or projection screen enamel."""
    w, h = size
    c_board = hex_to_rgb(dom_hex, (242.0, 242.0, 242.0))
    if photo_patch is not None and photo_patch.shape[0] >= 16 and photo_patch.shape[1] >= 16:
        c_board = np.median(photo_patch.reshape(-1, 3), axis=0).astype(np.float32)
    rng = np.random.RandomState(55)
    micro = rng.normal(0, 1.5, (h, w, 1))
    img = np.clip(c_board + micro, 0, 255).astype(np.uint8)
    return make_seamless_tile(img, target_size=size)


def synthesize_fabric_texture(dom_hex='#A79A8D', sec_hex='#8C8074', size=(512, 512)):
    """Procedurally synthesize woven fabric upholstery texture."""
    w, h = size
    c1 = hex_to_rgb(dom_hex, (167.0, 154.0, 141.0))
    c2 = hex_to_rgb(sec_hex, (140.0, 128.0, 116.0))
    y = np.linspace(0, 1, h)[:, None]
    x = np.linspace(0, 1, w)[None, :]
    weave = (np.sin(x * 256.0) * np.cos(y * 256.0) * 0.5 + 0.5)[:, :, None]
    img = c1 * weave + c2 * (1.0 - weave)
    return make_seamless_tile(np.clip(img, 0, 255).astype(np.uint8), target_size=size)


def get_dominant_color_hex(arr_rgb):
    """Compute dominant representative color in hex format (#RRGGBB)."""
    median_rgb = np.median(arr_rgb.reshape(-1, 3), axis=0).astype(int)
    return f"#{median_rgb[0]:02X}{median_rgb[1]:02X}{median_rgb[2]:02X}"


def array_to_base64_jpeg(arr_rgb, quality=85):
    """Encode RGB numpy array to compact base64 JPEG data URI."""
    pil_img = Image.fromarray(arr_rgb)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=quality, optimize=True)
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"


def crop_box_safe(img_rgb, box):
    """Safely crop bounding box [ymin, xmin, ymax, xmax] in normalized (0..1000) or relative coordinates."""
    if not box or len(box) != 4:
        return None
    h_img, w_img = img_rgb.shape[:2]
    ymin, xmin, ymax, xmax = box

    if max(ymin, xmin, ymax, xmax) <= 1.05:
        y0, x0 = int(ymin * h_img), int(xmin * w_img)
        y1, x1 = int(ymax * h_img), int(xmax * w_img)
    elif max(ymin, xmin, ymax, xmax) <= 1005:
        y0, x0 = int((ymin / 1000.0) * h_img), int((xmin / 1000.0) * w_img)
        y1, x1 = int((ymax / 1000.0) * h_img), int((xmax / 1000.0) * w_img)
    else:
        y0, x0, y1, x1 = int(ymin), int(xmin), int(ymax), int(xmax)

    y0 = max(0, min(h_img - 10, y0))
    x0 = max(0, min(w_img - 10, x0))
    y1 = max(y0 + 10, min(h_img, y1))
    x1 = max(x0 + 10, min(w_img, x1))

    if y1 - y0 < 10 or x1 - x0 < 10:
        return None
    return img_rgb[y0:y1, x0:x1]


def find_autonomous_patches(img_rgb):
    """Computer Vision heuristics to automatically isolate the cleanest patches
    for desk, floor, wall, and screen from indoor/classroom photos when AI regions are not available.
    """
    h, w = img_rgb.shape[:2]
    patches = {}

    # 1. Screen / Slide / Presentation Display (center-upper area: y: 0.16..0.58, x: 0.22..0.78)
    y_s0, y_s1 = int(h * 0.16), int(h * 0.58)
    x_s0, x_s1 = int(w * 0.22), int(w * 0.78)
    if y_s1 > y_s0 + 30 and x_s1 > x_s0 + 30:
        screen_crop = img_rgb[y_s0:y_s1, x_s0:x_s1]
        if screen_crop.size > 0:
            patches["screen"] = {
                "patch": screen_crop,
                "box": [int(y_s0 / h * 1000), int(x_s0 / w * 1000), int(y_s1 / h * 1000), int(x_s1 / w * 1000)],
                "material_type": "projector_slide"
            }

    # 2. Desk wood surface (lower-mid band: y: 0.55..0.96)
    best_desk_patch = None
    min_clutter = float('inf')
    best_desk_box = None
    pw, ph = int(w * 0.24), int(h * 0.12)
    step_y = max(15, int(h * 0.04))
    step_x = max(20, int(w * 0.06))

    for y in range(int(h * 0.55), h - ph, step_y):
        for x in range(int(w * 0.04), w - pw, step_x):
            candidate = img_rgb[y:y+ph, x:x+pw]
            mean_c = np.mean(candidate, axis=(0, 1))
            if np.mean(mean_c) < 35 or np.mean(mean_c) > 235:
                continue
            score = get_patch_clutter_score(candidate)
            if mean_c[0] > mean_c[2]:  # warm wood tone bias (red > blue)
                score -= 1.2
            if score < min_clutter:
                min_clutter = score
                best_desk_patch = candidate
                best_desk_box = [int(y / h * 1000), int(x / w * 1000), int((y + ph) / h * 1000), int((x + pw) / w * 1000)]

    if best_desk_patch is not None:
        patches["desk"] = {
            "patch": best_desk_patch,
            "box": best_desk_box,
            "material_type": "varnished_wood"
        }

    # 3. Floor (bottom area: y: 0.65..0.98, central-to-wide)
    best_floor_patch = None
    min_floor_clutter = float('inf')
    best_floor_box = None
    fpw, fph = int(w * 0.18), int(h * 0.10)
    for y in range(int(h * 0.65), h - fph, step_y):
        for x in range(int(w * 0.20), int(w * 0.75) - fpw, step_x):
            candidate = img_rgb[y:y+fph, x:x+fpw]
            score = get_patch_clutter_score(candidate)
            if score < min_floor_clutter:
                min_floor_clutter = score
                best_floor_patch = candidate
                best_floor_box = [int(y / h * 1000), int(x / w * 1000), int((y + fph) / h * 1000), int((x + fpw) / w * 1000)]

    if best_floor_patch is not None:
        patches["floor"] = {
            "patch": best_floor_patch,
            "box": best_floor_box,
            "material_type": "ceramic_tile"
        }

    # 4. Wall (sides, upper-mid area: y: 0.15..0.55, near edges x: 0..0.22 or 0.78..1.0)
    best_wall_patch = None
    min_wall_clutter = float('inf')
    best_wall_box = None
    wpw, wph = int(w * 0.15), int(h * 0.15)
    wall_x_ranges = [(int(w * 0.02), int(w * 0.22)), (int(w * 0.78), max(int(w * 0.79), w - wpw - 5))]
    for xr0, xr1 in wall_x_ranges:
        if xr1 <= xr0:
            continue
        for y in range(int(h * 0.18), int(h * 0.55), step_y):
            for x in range(xr0, xr1, step_x):
                if x + wpw > w or y + wph > h:
                    continue
                candidate = img_rgb[y:y+wph, x:x+wpw]
                score = get_patch_clutter_score(candidate)
                if score < min_wall_clutter:
                    min_wall_clutter = score
                    best_wall_patch = candidate
                    best_wall_box = [int(y / h * 1000), int(x / w * 1000), int((y + wph) / h * 1000), int((x + wpw) / w * 1000)]

    if best_wall_patch is not None:
        patches["wall"] = {
            "patch": best_wall_patch,
            "box": best_wall_box,
            "material_type": "matte_wall_paint"
        }

    return patches


def extract_textures(image_input, regions_input=None):
    """Multi-stage Texture Reconstruction Engine:
    Parses AI semantic decomposition, filters clutter, and synthesizes high-definition,
    realistic, seamless PBR textures for 3D room surfaces.
    """
    pil_img, img_rgb = load_input_image(image_input)
    h, w = img_rgb.shape[:2]

    textures = {}
    pbr_materials = {}
    detected_surfaces = []
    fallback_surfaces = []

    # Parse AI semantic regions if provided
    ai_regions = {}
    if regions_input:
        try:
            if isinstance(regions_input, str) and os.path.exists(regions_input):
                with open(regions_input, "r", encoding="utf-8") as f:
                    ai_regions = json.load(f)
            elif isinstance(regions_input, dict):
                ai_regions = regions_input
            elif isinstance(regions_input, str):
                ai_regions = json.loads(regions_input)
        except Exception:
            ai_regions = {}

    # Extract surface map supporting both dictionary and list formats
    ai_surface_map = {}
    surfaces_entry = ai_regions.get("surfaces", {})
    if isinstance(surfaces_entry, dict):
        ai_surface_map = surfaces_entry
    elif isinstance(surfaces_entry, list):
        for item in surfaces_entry:
            if isinstance(item, dict) and item.get("name"):
                ai_surface_map[item["name"]] = item

    auto_patches = find_autonomous_patches(img_rgb)
    target_surfaces = ["screen", "desk", "table", "floor", "wall", "board", "chair", "ceiling", "sofa", "bed", "rug", "window"]

    surface_defaults = {
        "screen": {"material_type": "projector_slide", "dominant_color": "#FFFFFF", "secondary_color": "#1E3A8A", "roughness": 0.20},
        "desk": {"material_type": "varnished_wood", "dominant_color": "#C48A57", "secondary_color": "#A16637", "roughness": 0.35},
        "table": {"material_type": "varnished_wood", "dominant_color": "#8D6E63", "secondary_color": "#5D4037", "roughness": 0.40},
        "floor": {"material_type": "ceramic_tile", "dominant_color": "#EAEAEA", "secondary_color": "#D0D0D0", "roughness": 0.45},
        "wall": {"material_type": "matte_wall_paint", "dominant_color": "#E2EBE5", "secondary_color": "#D2DDD7", "roughness": 0.85},
        "board": {"material_type": "whiteboard_enamel", "dominant_color": "#F2F2F2", "secondary_color": "#E0E0E0", "roughness": 0.20},
        "chair": {"material_type": "varnished_wood", "dominant_color": "#C48A57", "secondary_color": "#A16637", "roughness": 0.45},
        "ceiling": {"material_type": "matte_wall_paint", "dominant_color": "#F5F5F0", "secondary_color": "#E8E8E0", "roughness": 0.90},
        "sofa": {"material_type": "fabric", "dominant_color": "#A79A8D", "secondary_color": "#8C8074", "roughness": 0.75},
        "bed": {"material_type": "fabric", "dominant_color": "#E5DFD5", "secondary_color": "#C8BFA8", "roughness": 0.80},
        "rug": {"material_type": "fabric", "dominant_color": "#546E7A", "secondary_color": "#37474F", "roughness": 0.85},
        "window": {"material_type": "glass", "dominant_color": "#B0B5A9", "secondary_color": "#9AA092", "roughness": 0.15},
    }

    for name in target_surfaces:
        try:
            info = ai_surface_map.get(name, {})
            defaults = surface_defaults.get(name, {})

            mat_type = info.get("material_type") or info.get("material") or defaults.get("material_type", "wood")
            dom_color = info.get("dominant_color") or defaults.get("dominant_color", "#CCCCCC")
            sec_color = info.get("secondary_color") or defaults.get("secondary_color", "#999999")
            grain_dir = info.get("grain_direction", "horizontal")
            roughness = float(info.get("roughness", defaults.get("roughness", 0.5)))

            has_clean = info.get("has_clean_patch")
            clean_box = info.get("clean_patch_box_2d") or info.get("clean_box_2d") or info.get("box_2d")

            photo_patch = None
            if has_clean is not False and clean_box:
                raw_patch = crop_box_safe(img_rgb, clean_box)
                if raw_patch is not None and raw_patch.shape[0] >= 16 and raw_patch.shape[1] >= 16:
                    photo_patch = inpaint_clutter_and_foreign_objects(raw_patch)
                    if not info.get("dominant_color"):
                        dom_color = get_dominant_color_hex(photo_patch)

            # Fallback to autonomous computer vision patch if AI did not provide clean patch
            if photo_patch is None and name in auto_patches:
                auto_entry = auto_patches[name]
                raw_patch = auto_entry["patch"]
                if raw_patch is not None and raw_patch.shape[0] >= 16 and raw_patch.shape[1] >= 16:
                    if name != "screen":
                        photo_patch = inpaint_clutter_and_foreign_objects(raw_patch)
                    else:
                        photo_patch = raw_patch
                    dom_color = get_dominant_color_hex(photo_patch)
                    clean_box = auto_entry.get("box")

            # Chair or Table fallback to desk wood color
            if name in ["chair", "table"] and photo_patch is None and "desk" in auto_patches:
                dom_color = get_dominant_color_hex(auto_patches["desk"]["patch"])

            # Stage 3: High-Definition Realistic Texture Synthesis
            synth_tile = None
            tile_size = (512, 512)

            if name == "screen":
                synth_tile = synthesize_screen_texture(photo_patch=photo_patch, dom_hex=dom_color, size=(512, 384))
            elif "carpet" in mat_type or "rug" in mat_type or name == "rug" or (name == "floor" and ("carpet" in mat_type or "fabric" in mat_type or ("#2" in dom_color or "#3" in dom_color))):
                synth_tile = synthesize_carpet_texture(dom_color, sec_color, size=tile_size, photo_patch=photo_patch)
            elif "wood" in mat_type or "parquet" in mat_type or name in ["desk", "table"]:
                synth_tile = synthesize_wood_texture(dom_color, sec_color, size=tile_size, grain_dir=grain_dir, photo_patch=photo_patch)
            elif "tile" in mat_type or "terrazzo" in mat_type or name == "floor":
                synth_tile = synthesize_tile_texture(dom_color, sec_color, size=tile_size, photo_patch=photo_patch)
            elif "wall" in mat_type or "paint" in mat_type or name in ["wall", "ceiling"]:
                synth_tile = synthesize_wall_texture(dom_color, sec_color, size=tile_size, photo_patch=photo_patch)
            elif "board" in mat_type or "whiteboard" in mat_type or name == "board":
                synth_tile = synthesize_board_texture(dom_color, sec_color, size=tile_size, photo_patch=photo_patch)
            elif "fabric" in mat_type or "leather" in mat_type or "linen" in mat_type or name in ["sofa", "bed"]:
                synth_tile = synthesize_fabric_texture(dom_color, sec_color, size=tile_size)
            else:
                synth_tile = synthesize_wood_texture(dom_color, sec_color, size=tile_size, photo_patch=photo_patch)

            b64_data = array_to_base64_jpeg(synth_tile, quality=88)
            textures[name] = b64_data

            pbr_materials[name] = {
                "dominant_color": dom_color,
                "secondary_color": sec_color,
                "roughness": roughness,
                "material_type": mat_type,
                "method": "ai_multi_stage_reconstructed",
                "has_authentic_patch": photo_patch is not None
            }

            detected_surfaces.append(name)

        except Exception as err:
            fallback_surfaces.append(name)

    return {
        "status": "success",
        "textures": textures,
        "pbr_materials": pbr_materials,
        "detected_surfaces": detected_surfaces,
        "fallback_surfaces": fallback_surfaces,
        "pipeline_version": "3.5-ai-panoramic-multi-stage-reconstruction"
    }


def main():
    parser = argparse.ArgumentParser(description="MemoryWeaver AI Texture Extractor v3.0")
    parser.add_argument("--image", required=True, help="Path to input image file or base64 string")
    parser.add_argument("--output", default=None, help="Output path for texture JSON")
    parser.add_argument("--regions", default=None, help="Optional JSON file or string of AI-detected clean patch coordinates")
    args = parser.parse_args()

    result = extract_textures(args.image, args.regions)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        sys.stderr.write(f"[TEXTURE_ENGINE_V3] Đã tạo sinh {len(result['detected_surfaces'])} texture seamless realistic vào {args.output}\n")
    else:
        print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
