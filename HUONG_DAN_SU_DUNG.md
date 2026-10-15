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
1. Trên điện thoại, mở **Expo Go** và quét mã QR (hoặc cài đặt trực tiếp file `MemoryWeaver.apk`).
2. Tại màn hình **Người Soạn Phòng**:
   - Bạn có thể bấm ngay `📂 Thư viện phòng` $\rightarrow$ chọn **"Lớp học của Thành (Giờ ăn trưa 12h)"** để mở ngay căn phòng mẫu hoàn chỉnh!
   - Bấm nút **`🌟 Bắt đầu cho người bệnh`** ở góc trên.
   - Thưởng thức trải nghiệm bước đi trong phòng học thời niên thiếu, chạm vào bàn học của Thành, nghe đọc chuyện kỷ niệm giờ ăn trưa 12h!

---

## 🎙️ 3. TRỢ LÝ GIỌNG NÓI & ĐIỀU KHIỂN KHÔNG GIAN THÔNG MINH

Ứng dụng tích hợp hệ thống điều khiển giọng nói tiếng Việt tự nhiên:
1. **Nút `[ 🎙️ Nói ]`:**
   - Chạm vào nút, hệ thống sẽ cất giọng đọc *"Tôi đang nghe..."* và hiển thị thanh sóng âm lắng nghe.
   - **Tự động ngắt thông minh:** Nếu sau 8 giây không có âm thanh giọng nói, hệ thống sẽ tự động tắt micro và thông báo *"Đã tự động tắt micro do không có giọng nói"*.
2. **Khảo sát vị trí thông minh (Spatial Clarification):**
   - Nếu bạn nói hoặc chat lệnh thêm đồ vật mà **thiếu thông tin vị trí** (ví dụ: *"Thêm một cái ghế"* hay *"Thêm tivi"*):
     + **Giọng nói:** Hệ thống sẽ hỏi lại ngay: *"Bạn muốn đặt nó vào đâu?"*
     + **Chat:** Hệ thống gửi tin nhắn: *"Bạn muốn đặt [vật thể] vào vị trí nào trong phòng? (ví dụ: đằng trước cái bàn, bên cạnh cửa sổ, hay trên tường?)"*
     + Bạn chỉ cần trả lời tiếp (ví dụ: *"đằng trước bàn học"*) $\rightarrow$ AI sẽ tự động ghép nối và đặt đúng vị trí!
3. **Câu nói chốt lại kết quả:**
   - Khi hoàn thành yêu cầu, hệ thống sẽ cất giọng xác nhận trực quan, ví dụ: *"Đã thêm một cái kệ đằng sau cái bàn."*, *"Đã dịch chuyển ghế lại gần cửa sổ."*, *"Đã điều chỉnh kích thước căn phòng."*

---

## 📐 4. MỞ RỘNG PHÒNG THEO ĐO ĐẠC & GẮN ĐỒ LÊN TƯỜNG

- **Mở rộng phòng theo kích thước mét hoặc tỉ lệ:**
  - Nhập hoặc nói: *"Mở rộng phòng thêm 1 mét"*, *"Tăng chiều dài lên 8 mét"*, *"Mở rộng không gian phòng khách"*.
  - AI sẽ điều chỉnh kích thước sàn và tường (`width`, `depth` từ 4m đến 16m) mà vẫn giữ nguyên vị trí hài hòa của các đồ vật bên trong.
- **Tự động hít tường (Wall Snapping):**
  - Các vật thể như `cửa sổ (window)`, `bảng (whiteboard)`, `tranh ảnh (picture)`, `đồng hồ (clock)`, `rèm (curtain)`, `điều hòa (air_conditioner)` được thuật toán Three.js tự động hít sát vào bức tường gần nhất, tính toán độ cao cân đối và xoay góc mặt vào lòng phòng.

---

## ⚙️ 5. CÀI ĐẶT SERVER CLOUD & NHẬP GEMINI API TRỰC TIẾP

Không còn lo lắng việc đổi mạng Wi-Fi làm thay đổi địa chỉ IP máy tính:
1. Mở mục **Cài đặt** trên góc phải ứng dụng.
2. **Nhập URL Server Cloud (HTTPS):** Triển khai server lên Render, Railway hoặc ngrok theo hướng dẫn trong [server/README_DEPLOY_CLOUD.md](file:///F:/MemoryWeaver/MemoryWeaver/server/README_DEPLOY_CLOUD.md).
3. **Khóa Gemini API (Tùy chọn):** Bạn có thể nhập trực tiếp Gemini API Key (`AIzaSy...`) của mình vào ô cài đặt. Ứng dụng sẽ gửi khóa an toàn qua header `X-Gemini-API-Key` đến server.

---

## 📲 6. BẢN CÀI ĐẶT ĐỘC LẬP (APK)

Trong thư mục dự án đã đóng gói sẵn file APK độc lập:
```
F:\MemoryWeaver\MemoryWeaver\MemoryWeaver.apk
```
- Bạn chỉ cần chép file này sang điện thoại Android và bấm cài đặt một lần duy nhất.
- Ứng dụng chạy trực tiếp như app thông thường, tự lưu cấu hình trong bộ nhớ máy, không cần chạy lại các câu lệnh môi trường mỗi lần mở.

---

## 🐙 7. ĐỒNG BỘ MÃ NGUỒN LÊN GITHUB

Toàn bộ mã nguồn dự án đã được quản lý bằng Git với 2 nhánh chính thống:
- `main`: Nhánh production ổn định.
- `develop`: Nhánh phát triển tính năng mới.

Để đồng bộ hoặc push lên repository GitHub của bạn:
1. Chạy file:
   ```
   DONG_BO_GITHUB.bat
   ```
2. Nhập URL repository GitHub của bạn (ví dụ `https://github.com/TenBan/MemoryWeaver.git`).
3. Script sẽ tự động commit và đẩy cả hai nhánh `main` và `develop` lên GitHub.

Các lệnh Git cơ bản dùng hàng ngày:
```bash
git pull origin main                      # Kéo code mới nhất về máy
git checkout develop                      # Chuyển sang nhánh develop để code
git add .                                 # Thêm thay đổi
git commit -m "noi dung thay doi"         # Ghi nhận commit
git push origin develop                   # Đẩy lên GitHub
```
