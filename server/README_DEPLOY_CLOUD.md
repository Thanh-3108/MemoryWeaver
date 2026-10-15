# 🌐 HƯỚNG DẪN DEPLOY SERVER LÊN CLOUD (MIỄN PHÍ & KHÔNG ĐỔI IP)

Để điện thoại không bao giờ bị lỗi mất kết nối khi đổi mạng Wi-Fi, bạn có thể triển khai Backend Server lên nền tảng Cloud miễn phí (Render, Railway hoặc Koyeb). Sau khi deploy, server sẽ có một đường link cố định HTTPS (ví dụ: `https://memoryweaver-api.onrender.com`).

---

## CÁCH 1: DEPLOY MIỄN PHÍ LÊN RENDER.COM (Khuyên Dùng - 2 Phút)

1. Đăng ký tài khoản miễn phí tại: [https://render.com](https://render.com) (đăng nhập bằng GitHub).
2. Tạo mới **Web Service** $\rightarrow$ chọn Repository GitHub `MemoryWeaver` của bạn.
3. Cấu hình các thông số:
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install` (hoặc để trống vì server không cần thư viện nặng)
   - **Start Command:** `node server.mjs`
   - **Instance Type:** `Free`
4. Cài đặt Biến Môi Trường (Environment Variables):
   - `GEMINI_API_KEY`: Dán khóa API của bạn (hoặc người dùng có thể tự nhập khóa trong Cài đặt của app).
   - `APP_ACCESS_TOKEN`: Dán mã token bảo mật của bạn.
   - `PORT`: `8787` (hoặc để Render tự cấp).
5. Bấm **Create Web Service** $\rightarrow$ Render sẽ cung cấp URL dạng:
   ```
   https://memoryweaver-api.onrender.com
   ```
6. Mở App MemoryWeaver trên điện thoại $\rightarrow$ vào **Cài đặt** $\rightarrow$ dán URL HTTPS này vào $\rightarrow$ Lưu kết nối!
   Từ nay dù bạn đi đâu, dùng 4G hay bất kỳ mạng Wi-Fi nào, app vẫn kết nối thông suốt 100%!

---

## CÁCH 2: DÙNG NGROK KHI VẪN CHẠY TRÊN MÁY TÍNH (Tạm Thời)

Nếu bạn muốn chạy server trên máy tính nhưng ra ngoài vẫn dùng được 4G:
1. Mở terminal tại máy tính:
   ```bash
   npx ngrok http 8787
   ```
2. Ngrok sẽ sinh ra một URL public dạng: `https://xxxx-xx-xx.ngrok-free.app`.
3. Dán URL này vào mục Cài đặt của App trên điện thoại.
