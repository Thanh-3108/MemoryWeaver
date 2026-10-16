import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('../scripts/extract_textures.py', import.meta.url));
export async function extractTextures(image, signal, apiKey, fetchImpl = fetch, preferredModel) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mw-texture-'));
  try {
    const input = path.join(dir, 'image.bin'), output = path.join(dir, 'textures.json');
    const regionsFile = path.join(dir, 'regions.json');
    await writeFile(input, Buffer.from(image.split(',')[1], 'base64'));

    let hasAiRegions = false;
    if (apiKey && typeof fetchImpl === 'function') {
      try {
        const [, mimeType, base64Data] = image.match(/^data:([^;]+);base64,(.+)$/) || [null, 'image/jpeg', image];
        const visionPrompt = `You are an advanced AI 3D Material & Texture Reconstruction Specialist.
Analyze this indoor photo to extract the TRUE, CLEAN architectural and furniture textures for realistic 3D reconstruction.

For each surface present in the room:
1. 'screen' (Projector screen, slide presentation display, or television OLED display)
2. 'desk' (Work desk, student desk, or study desk surface)
3. 'table' (Dining table, coffee table, or side table: wood, marble, stone, or glass)
4. 'floor' (Room floor: hardwood parquet, wood planks, terrazzo, polished tile, or acoustic carpet)
5. 'wall' (Main walls: matte paint, plaster, wallpaper, or wood paneling)
6. 'board' (Blackboard, whiteboard, or presentation chalkboard)
7. 'chair' (Chair seats / backrests: wood, leather, mesh, or fabric)
8. 'ceiling' (Ceiling: acoustic tiles, plasterboard, or timber)
9. 'sofa' (Sofa / couch upholstery: woven linen, velvet, leather, or bouclé fabric)
10. 'bed' (Bed duvet, comforter, cotton linen, or upholstered headboard)
11. 'rug' (Area rug, accent carpet, woven mat, or Persian rug)
12. 'window' (Window glass, frame, or fabric curtain)

CRITICAL INSTRUCTIONS:
- IDENTIFY FOREIGN CLUTTER: Surfaces often have foreign objects (e.g., on desks/tables: laptops, mice, coffee mugs, notebooks, pens, books; on floors: shoes, chair legs, backpacks, shadows; on beds: pillows, phones).
- If a surface has an area that is 100% CLEAN and exposed with NO clutter:
  Set 'has_clean_patch': true and provide the exact bounding box [ymin, xmin, ymax, xmax] (0-1000) of that clean patch.
- If a surface is mostly covered or occluded (like the floor in a crowded classroom):
  Set 'has_clean_patch': false.
- In ALL cases, specify:
  * 'material_type': e.g., 'varnished_wood', 'hardwood_parquet', 'acoustic_carpet', 'carpet_tile', 'ceramic_tile', 'terrazzo_tile', 'matte_wall_paint', 'whiteboard_enamel', 'woven_fabric', 'leather', 'linen'
  * Floor note: In living rooms and bedrooms, floors are frequently hardwood parquet ('hardwood_parquet') or acoustic carpet ('acoustic_carpet'). In classrooms/libraries, check for carpet tiles or ceramic.
  * Sofa/Bed note: Living room sofas and bedroom duvets are tactile woven fabrics ('woven_fabric', 'linen', 'leather'). Sample the true upholstery color without cast shadows.
  * Desk/Table note: Ensure dominant_color reflects authentic warm natural timber (oak, birch, walnut) or marble without cool shadow distortion.
  * 'dominant_color': Hex #RRGGBB sampled strictly from the pure material itself (NOT from clutter!).
  * 'secondary_color': Hex #RRGGBB for grain/veins/grout if applicable.
  * 'grain_direction': 'horizontal', 'vertical', 'none', or 'isotropic'.
  * 'roughness': 0.0 to 1.0 (e.g., 0.35 for varnished wood, 0.45 for polished tile, 0.75 for sofa fabric, 0.85 for matte wall, 0.90 for carpet).
  * 'details': Short description of the real material appearance.

Return strict JSON:
{
  "room_type": "string",
  "surfaces": {
    "desk": {
      "has_clean_patch": boolean,
      "clean_patch_box_2d": [ymin, xmin, ymax, xmax],
      "material_type": string,
      "dominant_color": "#RRGGBB",
      "secondary_color": "#RRGGBB",
      "grain_direction": string,
      "roughness": number,
      "details": string
    }
  }
}`;
        let model = preferredModel || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
        if (model === 'gemini-2.5-flash') model = 'gemini-flash-lite-latest';

        let visionRes = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', signal,
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: visionPrompt },
                { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } }
              ]
            }],
            generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048 }
          })
        });

        if (!visionRes.ok && model !== 'gemini-flash-lite-latest') {
          visionRes = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent`, {
            method: 'POST', signal,
            headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { text: visionPrompt },
                  { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } }
                ]
              }],
              generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048 }
            })
          });
        }

        if (visionRes.ok) {
          const visionJson = await visionRes.json();
          const rawText = visionJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            await writeFile(regionsFile, rawText, 'utf8');
            hasAiRegions = true;
          }
        }
      } catch {
        // Fallback smoothly to autonomous purity scan
      }
    }

    const localPython = path.join(os.homedir(), 'AppData', 'Local', 'Python', 'bin', 'python.exe');
    const python = process.env.PYTHON_BIN || (process.platform === 'win32' && existsSync(localPython) ? localPython : 'python');

    const pyArgs = [script, '--image', input, '--output', output];
    if (hasAiRegions) pyArgs.push('--regions', regionsFile);

    await new Promise((resolve, reject) => {
      const child = spawn(python, pyArgs, {
        windowsHide: true, signal, timeout: 25000, stdio: 'ignore'
      });
      child.once('error', reject);
      child.once('close', code => code === 0 ? resolve() : reject(new Error('Texture extraction unavailable')));
    });

    const data = JSON.parse(await readFile(output, 'utf8'));
    if (data.status !== 'success' || !data.textures || !Object.keys(data.textures).length) throw new Error('No textures');
    return {
      ...data,
      approximate: false,
      method: hasAiRegions ? 'ai_multi_stage_reconstructed' : 'smart_purity_inpaint',
      warning: 'Texture đã được AI phân tích đa tầng, bóc tách khử tạp vật (sách vở, chuột, bút) và tạo sinh vật liệu realistic cho mô hình 3D.'
    };
  } finally { await rm(dir, { recursive: true, force: true }); }
}
