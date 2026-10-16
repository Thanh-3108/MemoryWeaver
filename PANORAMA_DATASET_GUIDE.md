# MemoryWeaver - Indoor Panorama 360° Dataset & 3D Reconstruction Guide

Tài liệu hướng dẫn bộ dữ liệu 100 ảnh Panorama 360° chất lượng cao và quy trình chuyển đổi không gian toàn cảnh (Equirectangular Panorama) thành căn phòng 3D tương tác chân thực.

---

## 1. Tổng quan bộ dữ liệu 100 Panorama (`indoor_panoramas_100.json`)

Tệp `scripts/indoor_panoramas_100.json` lưu trữ danh mục **100 không gian nội thất panorama 360°** được chọn lọc từ thư viện mở chuyên nghiệp (Poly Haven CC0), chia đều theo 5 nhóm archetype chính:

| STT | Nhóm không gian | Số lượng | Ví dụ tiêu biểu |
|:---:|:---|:---:|:---|
| 1 | **Living Rooms & Lounges** (Phòng khách, Phòng sinh hoạt) | 25 | `aft_lounge`, `modern_living_room`, `vintage_living_room`, `cozy_living_room` |
| 2 | **Bedrooms & Suites** (Phòng ngủ, Khách sạn) | 10 | `hotel_room`, `bedroom`, `hotel_suite` |
| 3 | **Dining Rooms & Kitchens** (Phòng ăn, Bếp) | 22 | `dining_room`, `kitchen`, `bistro`, `tea_room` |
| 4 | **Offices & Study Rooms** (Phòng làm việc, Thư phòng) | 14 | `small_office`, `study_room`, `reading_room`, `conference_room` |
| 5 | **Hospitality & Public Spaces** (Hội trường, Sảnh, Thư viện) | 29 | `library`, `art_gallery`, `ballroom`, `grand_hall` |

Mỗi mục trong JSON gồm:
- `id`: Tên định danh panorama.
- `title`: Tên hiển thị tiếng Anh.
- `category`: Nhóm phòng phân loại.
- `tags`: Các từ khóa nhận diện nội thất (sofa, bed, table, window, wood, carpet,...).
- `url`: Link tải trực tiếp ảnh JPEG tonemapped độ phân giải cao (2K/4K).
- `thumbnail_url`: Link ảnh xem trước thumbnail.

---

## 2. Công cụ tải Panorama tự động (`download_panoramas.py`)

Script Python `scripts/download_panoramas.py` hỗ trợ tải ảnh về thư mục cục bộ `scripts/downloaded_panoramas/` với tiến độ trực quan:

```bash
# Tải 5 ảnh phòng khách (Living Rooms) để test nhanh:
python scripts/download_panoramas.py --category "Living Rooms & Lounges" --limit 5

# Tải 5 ảnh phòng ngủ (Bedrooms):
python scripts/download_panoramas.py --category "Bedrooms & Suites" --limit 5

# Tải 5 ảnh phòng làm việc (Offices):
python scripts/download_panoramas.py --category "Offices & Study Rooms" --limit 5

# Tải toàn bộ 100 ảnh:
python scripts/download_panoramas.py --limit 100
```

> **Lưu ý:** Thư mục `scripts/downloaded_panoramas/` đã được cấu hình trong `.gitignore` để không làm phình dung lượng git repository.

---

## 3. Các nguồn Dataset Panorama học thuật & công nghiệp bổ sung

Nếu muốn mở rộng nghiên cứu sâu hơn về Computer Vision & AI 3D Reconstruction:

1. **Structured3D (Academic Benchmark):**
   - 21,835 ảnh panorama phòng nội thất kèm ground-truth 3D bounding boxes, mesh wireframes và layout tường/trần/sàn.
   - Link: https://structured3d-dataset.org/
2. **Stanford 2D-3D-S (Matterport3D / Stanford):**
   - 1,413 panorama equirectangular 360° đo đạc thực tế kèm bản đồ phân rã ngữ nghĩa 2D-3D.
   - Link: http://buildingparser.stanford.edu/dataset.html
3. **Zillow Indoor Dataset (ZInD):**
   - 71,474 ảnh panorama 360° nội thất nhà ở dân dụng thực tế từ Zillow.
   - Link: https://github.com/zillow/zind
4. **OmniRooms (Hugging Face Datasets):**
   - Bộ sưu tập panorama phòng kèm camera poses và depth maps.

---

## 4. Các cải tiến cốt lõi trong Pipeline dựng 3D từ ảnh Panorama

### A. Sửa lỗi toán học xoay và hướng nhìn đối tượng (Spatial Solvers)
- **Sofa Math Inversion Fix**: Đổi từ `Math.atan2(-dx, -dz)` sang `Math.atan2(dx, -dz)` để sofa quay mặt chính xác về phía TV / Bàn trà thay vì xoay lưng lại.
- **Wall Snapping Yaw**: Sửa góc quay khi sofa áp tường (tường trái `yaw = 90`, tường phải `yaw = -90`) để mặt đệm luôn hướng vào tâm phòng.
- **Bộ giải Bed (Giường ngủ)**: Đầu giường tựa sát tường (`yaw = 0` áp tường sau, `180` tường trước), đuôi giường và chăn nệm duỗi vào lòng phòng.
- **Bộ giải Wardrobe (Tủ áo)**: Lưng tủ áp tường, cánh cửa mở hướng ra phòng.
- **Bộ giải TV / Media Center**: Màn hình OLED luôn quay đối diện ghế sofa hoặc giường ngủ.

### B. Nâng cấp hình học 3D chi tiết (Procedural Geometry)
- **Sofa**: Chân gỗ/kim loại vát kiểu Scandinavian, đệm ngồi đa khoang bồng bềnh, tựa lưng nghiêng nhẹ, gối ôm trang trí, bóng tiếp xúc nền (`contact shadow`).
- **Bàn trà (Coffee Table)**: Phát hiện độ cao thấp (`<= 0.58m`), chân kim loại thanh mảnh, ngăn để tạp chí, phân biệt hoàn toàn với bàn ăn lớn hay bàn học.
- **Giường ngủ (Bed)**: Khung giường gỗ chắc chắn, táp đầu giường bọc nỉ êm ái, đệm lò xo, chăn chần bông gập nếp và gối đôi.
- **Tủ quần áo (Wardrobe)**: Rãnh khe chia đôi cánh cửa và tay nắm đồng/hợp kim.
- **Màn hình TV**: Hỗ trợ treo tường hoặc đặt trên kệ media, màn hình OLED đen bóng chống lóa.

### C. Khử tình trạng "đơn sắc một màu gỗ" (Texture & Material Differentiation)
- Phân tách rõ rệt vật liệu theo từng bề mặt:
  - **Sofa & Giường**: Vật liệu vải dệt (`woven_fabric`), cotton, linen hoặc da (`leather`), không bị gán nhầm sang gỗ.
  - **Thảm trải sàn (Rug)**: Kết cấu sợi len dệt hoặc vòng lặp tiêu âm (`carpet_tile`), tạo điểm nhấn tách biệt với sàn nhà.
  - **Bàn học & Bàn ăn**: Vân gỗ tự nhiên ấm áp (`varnished_wood`) hoặc mặt đá marble.
  - **Sàn phòng khách & ngủ**: Sàn gỗ xương cá / tấm lát parquet hoặc thảm lông.
  - **Đèn chiếu sáng**: Đèn cây góc phòng, đèn trần thả bàn ăn, đèn ngủ táp đầu giường với nguồn sáng vàng ấm.
