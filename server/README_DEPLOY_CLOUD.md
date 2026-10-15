# 🌐 HƯỚNG DẪN ĐƯA SERVER LÊN CLOUD (KHÔNG LO ĐỔI IP)

Để điện thoại không bao giờ bị mất kết nối khi đổi mạng Wi-Fi hay dùng 4G/5G, bạn có 2 giải pháp hoàn hảo:

---

## 🚀 GIẢI PHÁP 1: BẬT CHẾ ĐỘ CLOUD TRÊN MÁY TÍNH (1 CLICK - 3 GIÂY)

Không cần cài đặt hay đăng ký bất kỳ tài khoản nào:
1. Nhấp đúp vào **`CHAY_SERVER.bat`**.
2. Chọn số **`1`** (Chế độ Cloud HTTPS).
3. Máy tính sẽ tự động cấp một đường link Cloud HTTPS toàn cầu (ví dụ: `https://abc-xyz.trycloudflare.com`).
4. Mở App MemoryWeaver trên điện thoại $\rightarrow$ vào mục **Cài đặt** (Bánh răng) $\rightarrow$ dán đường link HTTPS này vào và bấm **Lưu**.

> Điện thoại ở bất kỳ đâu, dùng 4G/5G hay Wi-Fi nào cũng kết nối thông suốt về máy tính!

---

## ☁️ GIẢI PHÁP 2: DEPLOY LÊN CLOUD 24/7 (RENDER SINGAPORE - MIỄN PHÍ)

Nếu muốn server hoạt động 24/7 ngay cả khi bạn tắt máy tính:

1. Đăng ký tài khoản miễn phí tại: [https://render.com](https://render.com) (đăng nhập bằng GitHub).
2. Tạo mới: Chọn **New +** $\rightarrow$ **Blueprint**.
3. Chọn Repository GitHub `MemoryWeaver` của bạn.
4. Render sẽ tự động đọc file cấu hình **`render.yaml`** đã chuẩn bị sẵn:
   - **Khu vực:** Singapore (mạng cực nhanh về Việt Nam).
   - **Runtime:** Node.js 22.
   - **Gói:** Miễn phí 100% (Free Plan).
5. Nhập biến môi trường `GEMINI_API_KEY`: Dán khóa Gemini API của bạn vào.
6. Bấm **Apply** $\rightarrow$ Sau 2 phút, bạn sẽ có một tên miền cố định vĩnh viễn dạng:
   ```
   https://memoryweaver-ai-server.onrender.com
   ```
7. Mở App trên điện thoại $\rightarrow$ vào Cài đặt $\rightarrow$ dán địa chỉ này vào và dùng mãi mãi không bao giờ phải đổi lại!

---

## 🛠️ GIẢI PHÁP 3: RAILWAY / DOCKER

Mã nguồn đã tích hợp sẵn **`railway.json`** và **`server/Dockerfile`**:
* Trên Railway: Chỉ cần chọn **Deploy from GitHub repo** $\rightarrow$ Hệ thống tự động nhận diện `Dockerfile` và deploy trong 1 phút.
