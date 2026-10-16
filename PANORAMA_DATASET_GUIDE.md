# MemoryWeaver - Indoor Panorama 360° Dataset & 3D Reconstruction Guide

Tài liệu hướng dẫn bộ dữ liệu **200 ảnh Panorama 360°** chất lượng cao và quy trình chuyển đổi không gian toàn cảnh (Equirectangular Panorama) thành căn phòng 3D tương tác chân thực với công nghệ tách bóc & tổng hợp Texture PBR đa chất liệu.

---

## 1. Tổng quan bộ dữ liệu 200 Panorama (`indoor_panoramas_200.json`)

Tệp `scripts/indoor_panoramas_200.json` lưu trữ danh mục **200 không gian nội thất panorama 360°** được chọn lọc từ thư viện mở chuyên nghiệp (Poly Haven CC0), chia đều theo 6 nhóm archetype:

| STT | Nhóm không gian | Số lượng | Ví dụ tiêu biểu |
|:---:|:---|:---:|:---|
| 1 | **Living Rooms & Lounges** (Phòng khách, Phòng sinh hoạt) | 42 | `aft_lounge`, `modern_living_room`, `vintage_living_room`, `cozy_living_room`, `residence` |
| 2 | **Bedrooms & Suites** (Phòng ngủ, Khách sạn) | 10 | `hotel_room`, `bedroom`, `hotel_suite`, `brown_photostudio_07` |
| 3 | **Dining Rooms, Kitchens & Cafes** (Phòng ăn, Bếp, Quán ăn) | 42 | `dining_room`, `kitchen`, `bistro`, `tea_room`, `abandoned_bakery`, `canteen` |
| 4 | **Offices, Libraries & Study Rooms** (Phòng làm việc, Thư viện) | 10 | `small_office`, `study_room`, `reading_room`, `conference_room`, `blender_institute` |
| 5 | **Hospitality, Ballrooms & Galleries** (Hội trường, Sảnh, Bảo tàng) | 46 | `ballroom`, `art_gallery`, `dancing_hall`, `grand_hall`, `music_hall` |
| 6 | **Modern Lofts, Studios & Creative Workshops** (Gác xép, Xưởng nghệ thuật) | 50 | `art_studio`, `artist_workshop`, `loft`, `creative_studio`, `garage` |

Mỗi mục trong catalog gồm:
- `id`: Tên định danh panorama.
- `name`: Tên tiếng Anh chuẩn.
- `archetype`: Mã archetype chuẩn hóa (`living_room`, `bedroom`, `dining_kitchen`, `office_study`, `hospitality_gallery`, `studio_workshop`).
- `archetype_vn`: Tên tiếng Việt thân thiện.
- `tags`: Danh sách từ khóa nhận diện nội thất (sofa, bed, table, window, wood, carpet, marble, leather,...).
- `panorama_url`: Link tải trực tiếp ảnh JPEG tonemapped độ phân giải cao (2K/4K/8K).
- `thumbnail_url`: Link ảnh xem trước thumbnail.
- `polyhaven_page`: Link tài liệu gốc trên Poly Haven.

---

## 2. Công cụ tải Panorama tự động (`download_panoramas.py`)

Script Python `scripts/download_panoramas.py` hỗ trợ xem danh sách và tải ảnh tự động về thư mục cục bộ `scripts/downloaded_panoramas/`:

```bash
# Xem danh sách toàn bộ 200 phòng trong catalog:
python scripts/download_panoramas.py --list

# Tải 5 ảnh phòng khách (Living Rooms) để test thử:
python scripts/download_panoramas.py --category living_room --count 5

# Tải 5 ảnh phòng ngủ (Bedrooms):
python scripts/download_panoramas.py --category bedroom --count 5

# Tải 5 ảnh phòng ăn / bếp (Dining & Kitchen):
python scripts/download_panoramas.py --category dining_kitchen --count 5

# Tải toàn bộ 200 ảnh:
python scripts/download_panoramas.py --all
```

> **Lưu ý:** Thư mục `scripts/downloaded_panoramas/` đã được cấu hình trong `.gitignore` để không làm phình dung lượng git repository.

---

## 3. Công nghệ bóc tách & Tổng hợp Texture PBR Đa tầng (Multi-Stage Texture Engine)

Để giải quyết triệt để lỗi *"phủ texture vào mọi thứ đều đơn sắc một màu gỗ"* và tình trạng bị dính tạp vật (sách vở, chuột, bút, bóng đổ), hệ thống texture được nâng cấp toàn diện:

### A. Tự động nhận diện & cắt vùng bề mặt sạch (Autonomous Patch Isolation)
- **Sofa**: Quét dải ngang tầm trung (`y: 0.42..0.76`) để trích xuất màu vải nỉ hoặc da bọc ghế, tự động phân biệt với màu sàn và màu tường.
- **Bàn trà & Bàn ăn (Table)**: Quét vùng trung tâm tiền cảnh (`y: 0.52..0.82`) để lấy vân gỗ hoặc bề mặt đá marble.
- **Thảm trải sàn (Rug)**: Quét vùng trung tâm sàn nhà (`y: 0.62..0.90`) để lấy chất liệu thảm dệt tiêu âm tương phản với nền sàn.
- **Giường ngủ (Bed)**: Quét mặt chăn bông chần (`duvet`) và đệm để lấy chất liệu vải dệt mềm mại.
- **Sàn (Floor)** & **Tường (Wall)** & **Màn hình (Screen)**: Quét vùng chân sàn, hai bên vách tường và màn hình hiển thị.

### B. Khử tạp vật bằng thuật toán Inpainting vi mô (Clutter Removal)
- Thuật toán OpenCV Inpainting (Telea) phát hiện các vật ngoại lai (chuột, bàn phím, sổ tay, bút, bóng người) và phủ kín bằng hoa văn vật liệu xung quanh.

### C. Bộ tổng hợp 8 chất liệu PBR chân thực (Photorealistic Synthesizers)
1. **`hardwood_parquet`**: Sàn gỗ xương cá / tấm ghép so le 4 hàng, có rãnh vát chamfer vi mô và ánh bóng satin (`roughness: 0.35`).
2. **`carrara_marble`**: Mặt bàn đá cẩm thạch trắng Carrara hoặc đen Nero Marquina với đường vân canxit phân nhánh tự nhiên (`roughness: 0.22`, `metalness: 0.08`).
3. **`aniline_leather`**: Da bọc ghế sofa / armchair cao cấp với hạt lỗ chân lông hữu cơ và vân kéo sáng tối (`roughness: 0.44`).
4. **`woven_linen`**: Vải đay dệt sợi gồ ghề mềm mại cho sofa bọc nỉ và chăn giường (`roughness: 0.78`).
5. **`acoustic_carpet`**: Thảm len dệt tiêu âm dạng vòng lặp (loop-pile) với sợi melange đa sắc (`roughness: 0.90`).
6. **`varnished_wood`**: Mặt bàn gỗ tự nhiên có thớ dọc, mắt gỗ và rãnh ghép mộng (`roughness: 0.38`).
7. **`terrazzo_tile`**: Gạch men bóng hoặc đá mài hạt khoáng kèm chỉ ron vi mô (`roughness: 0.40`).
8. **`matte_wall_paint`**: Sơn tường nhám mờ hạt cát mịn eggshell (`roughness: 0.85`).

### D. Ghép nối UV liền mạch triệt tiêu đường viền (Smooth Cosine Ease Tiling)
- Sử dụng hàm điều hòa cosine `alpha = 0.5 - 0.5 * cos(pi * x / blend_width)` tại biên đối xứng, giúp độ lặp texture trong không gian 3D Three.js không bao giờ để lộ đường ranh giới.

---

## 4. Công cụ Benchmark & Kiểm định Texture (`benchmark_textures_panoramas.py`)

Công cụ kiểm định tự động đo lường chất lượng phân rã và tổng hợp texture trên ảnh panorama thực tế:

```bash
# Chạy benchmark trên ảnh bất kỳ:
python scripts/benchmark_textures_panoramas.py --image scripts/downloaded_panoramas/living_room_aft_lounge.jpg

# Chạy benchmark trên toàn bộ các ảnh đã tải:
python scripts/benchmark_textures_panoramas.py --limit 10
```

Kết quả mẫu:
- **Thời gian xử lý**: ~1.3s - 1.6s cho mỗi ảnh panorama 8K (30-48 Megapixels).
- **Độ phân kỳ màu sắc (Color Variance)**: >30 đến >75, xác nhận các chất liệu (sofa, bàn, sàn, tường, thảm) tách biệt màu sắc tuyệt đối, không còn tình trạng đơn sắc.
- **Độ phân giải**: 512x512 tile seamless, đầy đủ thông số PBR roughness và metalness.
