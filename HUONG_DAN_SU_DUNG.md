# 🧠 HƯỚNG DẪN TRẢI NGHIỆM MEMORYWEAVER (BẢN FINAL)

Chào bạn! Hệ thống MemoryWeaver đã được tái cấu trúc hoàn chỉnh thành **2 trải nghiệm giao diện độc lập**, giải quyết triệt để vấn đề người bệnh Alzheimer bị bối rối khi phải dùng chung giao diện với người soạn phòng:

---

## 🎭 1. HAI CHẾ ĐỘ TRẢI NGHIỆM RIÊNG BIỆT

### 🧑‍⚕️ Chế độ 1: Người Soạn Phòng / Chăm Sóc Viên (Creator Mode)
* **Đối tượng:** Con cháu, người chăm sóc, bác sĩ trị liệu nhận thức.
* **Mục tiêu:** Thu thập ký ức, mô tả chi tiết, kiểm tra không gian 3D và chuẩn bị sẵn các căn phòng trước khi cho người bệnh trải nghiệm.
* **Tính năng:**
  - **Soạn phòng bằng Lời kể + Ảnh cũ:** Nhập câu chuyện ký ức (ví dụ: *Lớp học của Thành lúc 12h trưa, bàn học nằm góc phải cạnh cửa sổ...*) kèm ảnh kỷ niệm.
  - **Trích xuất Texture ảnh thật:** Nút gạt `Texture: Bật/Tắt` để lấy hoa văn tường, sàn, gỗ từ ảnh thực tế vào không gian 3D.
  - **Bộ nhớ phòng liên tục (Room Memory):** Tinh chỉnh phòng từng bước mà không làm mất các đồ vật cũ (*"thêm chiếc cặp sách trên bàn"*, *"đổi ghế sang nâu gỗ"*).
  - **Thư viện Phòng Ký ức (Memory Rooms Library):** Nút `💾 Lưu phòng này` để lưu lại không gian vào máy. Nút `📂 Thư viện phòng` để mở lại các phòng mẫu (*Lớp học 12A của Thành*, *Phòng khách gia đình ấm cúng*,...).
  - **Nút chuyển đổi chuyên dụng:** `🌟 Bắt đầu cho người bệnh` — một chạm để chuyển ngay sang giao diện dành riêng cho người bệnh.

---

### 👵 Chế độ 2: Không Gian Ký Ức Người Bệnh Alzheimer (Patient Mode)
* **Đối tượng:** Người cao tuổi, người suy giảm trí nhớ, bệnh nhân sa sút trí tuệ (Alzheimer / Dementia).
* **Mục tiêu:** Trải nghiệm tĩnh lặng, thân thuộc, kích hoạt lại dòng hồi tưởng quá khứ mà **không bị bối rối bởi công nghệ**.
* **Đặc điểm thiết kế:**
  - **Toàn màn hình 3D (Immersive 100%):** Hoàn toàn ẩn thanh gõ text, ẩn mã token, ẩn thông số kỹ thuật, ẩn các nút bấm thừa.
  - **Hai góc nhìn đơn giản:**
    + `🚶 Bước vào phòng` (Góc nhìn thứ nhất - FPV): Đi lại tự do bằng cần gạt joystick, vuốt nhẹ để nhìn ngắm quanh phòng như đang đứng thực sự trong ký ức.
    + `🏰 Toàn cảnh`: Ngắm nhìn tổng thể căn phòng từ trên cao ấm áp.
  - **Thanh Kỷ Niệm Thân Thuộc dưới chân màn hình:**
    + Hiển thị các điểm neo ký ức: `[ 🪑 Bàn học của Thành ]`, `[ 📋 Bảng lớp học ]`, `[ 🎒 Cặp sách ]`, `[ 🪟 Cửa sổ đón nắng ]`.
    + Người bệnh tay run hoặc mắt kém chỉ cần **chạm nhẹ vào biểu tượng**, camera sẽ tự động bay đến gần đồ vật đó!
  - **Thẻ Ký Ức Nổi To Rõ (Large High-Contrast Memory Card):**
    + Khi chạm vào đồ vật (hoặc tâm ngắm FPV chỉ vào):
    + Xuất hiện khung ký ức với chữ to, độ tương phản cao, nền xanh rừng dịu mắt.
    + Kể lại câu chuyện thân thương gắn liền với đồ vật đó.
    + **Nút 🔊 Nghe giọng đọc:** Đọc to câu chuyện bằng tiếng Việt truyền cảm, chậm rãi, giúp người lớn tuổi nghe kể chuyện mà không mỏi mắt.
    + **Nút 👁️ Đến ngắm cự ly gần:** Đưa góc nhìn đến sát vật thể để ngắm nghía chi tiết.
  - **Khóa an toàn (`🔒 Thoát`):** Yêu cầu xác nhận để người bệnh không vô tình chạm nhầm thoát ra màn hình kỹ thuật.

---

## 🚀 2. CÁCH KHỞI ĐỘNG HỆ THỐNG

### Bước 1: Khởi động Server & Ứng dụng
Click đúp vào file:
```
CHAY_HE_THONG.bat
```
Hệ thống sẽ tự động bật 2 cửa sổ:
- **Cửa sổ 1:** Backend Server AI (`http://localhost:8787`)
- **Cửa sổ 2:** Expo Dev Server (Hiển thị mã QR để quét bằng điện thoại qua app **Expo Go**).

### Bước 2: Trải nghiệm ngay
1. Trên điện thoại, mở **Expo Go** và quét mã QR.
2. Tại màn hình **Người Soạn Phòng**:
   - Bạn có thể bấm ngay `📂 Thư viện phòng` $\rightarrow$ chọn **"Lớp học của Thành (Giờ ăn trưa 12h)"** để mở ngay căn phòng mẫu hoàn chỉnh!
   - Bấm nút **`🌟 Bắt đầu cho người bệnh`** ở góc trên.
   - Thưởng thức trải nghiệm bước đi trong phòng học thời niên thiếu, chạm vào bàn học của Thành, nghe đọc chuyện kỷ niệm giờ ăn trưa 12h!
