# 🌸 MemoryWeaver (Dệt Ký Ức)

> **Không gian phục hồi ký ức 3D hỗ trợ người cao tuổi và bệnh nhân Alzheimer bằng Trí tuệ Nhân tạo Đa phương thức (Gemini 2.5 & Three.js)**  
> 🔗 **Kho mã nguồn**: [https://github.com/Thanh-3108/MemoryWeaver](https://github.com/Thanh-3108/MemoryWeaver)  
> 📱 **Bản phát hành APK**: [`MemoryWeaver-v1.0.0.apk` (69.6 MB)](./MemoryWeaver-v1.0.0.apk)  
> 📜 **Nhật ký phát triển chi tiết**: [`PROMPT_LOG.md` (111 Prompts)](./PROMPT_LOG.md)

---

## 💡 Giới Thiệu & Sứ Mệnh Nhân Văn

**MemoryWeaver** là ứng dụng hỗ trợ liệu pháp hồi tưởng (**Reminiscence Therapy**) dành riêng cho người cao tuổi và người mắc hội chứng suy giảm trí nhớ (Alzheimer). Bằng cách tái hiện lại những căn phòng thân thuộc trong quá khứ qua hình ảnh cũ hoặc lời kể của người thân, MemoryWeaver mang đến một không gian 3D yên bình, ấm áp giúp người bệnh khơi gợi lại những ký ức tươi đẹp, củng cố nhận thức về bản thân (**Sense of Self**), giảm lo âu và kết nối tình cảm gia đình.

---

## 🚀 TỔNG HỢP CÁC CẢI TIẾN ĐỘT PHÁ SO VỚI BẢN NGÀY HÔM QUA (16/10/2026)

So với phiên bản ban đầu ngày hôm qua (16/10), phiên bản mới nhất hôm nay đã trải qua một cuộc đại tu toàn diện về cơ chế tương tác, mỹ thuật 3D, kiến trúc đồng bộ và trải nghiệm người dùng:

| Tiêu chí | Phiên bản hôm qua (16/10/2026) | Phiên bản mới nhất hôm nay (17/10/2026) |
| :--- | :--- | :--- |
| **Cơ chế khám phá không gian** | Dùng cần điều khiển FPS truyền thống: Người già khó thao tác, dễ bị va đập, kẹt góc tường hoặc bay lạc ra ngoài khoảng không đen tối (*the void*). | **Chuyển đổi hoàn toàn sang 3D Point-and-Explore**: Chạm vào bất kỳ đồ vật nào là camera tự động bay êm đến trước mặt vật thể; chạm vào sàn/tường là camera chọn góc nhìn bao quát, tuyệt đối không nhìn thấy *the void*. |
| **Phân chia vai trò Người chăm sóc & Người bệnh** | Trộn chung giao diện trên cùng một màn hình điện thoại (nhiều nút bấm, hộp chat và cài đặt gây rối mắt người bệnh). | **Tách biệt 100% chuyên biệt**: Người chăm sóc quản lý trên máy tính qua Cổng Web chuyên nghiệp (`http://localhost:8787`); Người bệnh chỉ sử dụng giao diện APK toàn màn hình 3D thuần túy, an yên. |
| **Cơ chế Đồng bộ trực tiếp (Live Sync Engine)** | Chưa hỗ trợ đồng bộ thời gian thực giữa hai thiết bị. | **Đồng bộ trực tiếp PC ↔ Mobile**: Người chăm sóc soạn phòng trên PC rồi bấm *"Phát hành"* là điện thoại tự động cập nhật ngay; người chăm sóc có thể gửi lời nhắc uống thuốc, uống nước trực tiếp lên màn hình điện thoại. |
| **Trải nghiệm đọc sách & nhật ký** | Bấm vào sách chỉ hiện popup văn bản thông thường nhàm chán. | **Cuốn sách 3D mở ra thành vòm cong**: Chữ in trực tiếp trên trang sách 3D, hỗ trợ vuốt cảm ứng (Swipe) lật trang tới/lui, lồng tiếng đọc dịu êm và cho phép chỉnh sửa nội dung trang sách. |
| **Thư viện đồ vật 3D** | Giới hạn ở một số đồ gia dụng cơ bản; tất cả đều là các khối hộp chữ nhật thô cứng. | **Mở rộng thêm 19 chủng loại mới**: Nhạc cụ (guitar, piano, violin, trống, sáo), đồ chơi & kỷ vật (bình hoa, ấm trà, mô hình, tượng), thiết bị y tế (xe lăn, gậy chống), đồ sinh hoạt (chậu cá cảnh, radio, máy khâu, rèm cửa) với hình khối đa dạng (hình trụ, hình cầu, vòng nhẫn, compound meshes). |
| **Xử lý vật phẩm bất ngờ của AI** | AI dễ gặp hallucination hoặc không biết hiển thị khi người dùng yêu cầu đồ vật lạ. | **Bộ khung chỉ dẫn AI cực dài (Section 11 `server/room.mjs`)**: Hướng dẫn AI tự động ánh xạ mọi đồ vật bất ngờ thành hình khối 3D phù hợp kèm mảnh ký ức (Memory Fragments) và câu chuyện hồi tưởng giàu cảm xúc. |
| **Tối ưu màn hình xoay ngang (Landscape)** | Bị chèn ép bởi các banner dọc, khung 3D bị bẹp rúm, thanh dock chiếm 1/4 màn hình. | **Tối ưu tràn viền Landscape**: Tự động ẩn dải hướng dẫn, thu nhỏ thanh tiêu đề, giải phóng hơn 90% diện tích màn hình cho không gian 3D. |
| **Thanh điều hướng phòng** | Thanh dock nằm cố định chiếm diện tích lớn ở đáy màn hình. | **Menu điều hướng thu gọn (Retractable Slide Menu)**: Mặc định thu gọn thành nút tròn mềm mại `🧭 Điều hướng & Góc nhìn ▾`, mở ra các góc nhìn định sẵn (Cửa vào, Giữa phòng, Bàn kỷ vật) và thu gọn lại tiện lợi. |
| **Nút xoay góc nhìn Trái / Phải** | Bị ngược hướng (bấm Phải xoay Trái); nút màu đen đậm che khuất tầm nhìn. | **Đảo chiều chuẩn Three.js**: Bấm Trái quay Trái, bấm Phải quay Phải; nút được làm trong suốt (`opacity: 0.38`), viền mảnh thanh lịch, không gây phân tâm. |
| **Huy hiệu kiểm tra logic AI** | Hiển thị dòng *"🛡️ Đạt chuẩn logic không gian"* không cần thiết. | **Đã loại bỏ hoàn toàn** để trả lại giao diện sạch sẽ, tự nhiên cho người bệnh. |
| **Nút bật/tắt âm thanh** | Nằm lộ liễu trên góc màn hình 3D. | **Ẩn vào hộp thoại ⚙️ Cài đặt**, tích hợp điều khiển âm thanh êm dịu đồng bộ trực tiếp với WebView. |
| **Chất lượng màu sắc Texture** | Bị xỉn màu, tối và bợt khi qua bộ lọc tone mapping. | **Đồng bộ không gian màu `sRGBColorSpace`**: Màu sắc đồ vật và kỷ vật hiển thị tươi sáng, sắc nét và chân thực. |
| **Trải nghiệm đăng nhập & cấu hình** | Người dùng phải tự tìm và chép mã token 48 ký tự phức tạp. | **Tự Động Điền Sẵn (Zero-Config Auto-Fill)**: Mã `APP_ACCESS_TOKEN` và IP LAN mặc định đã được nhúng sẵn 100% vào ứng dụng. Mở app là tự kết nối! |
| **Đóng gói phát hành** | Chỉ chạy dưới dạng code nguồn Expo Go. | **Xuất thành công Standalone Release APK (`MemoryWeaver-v1.0.0.apk`)** dung lượng 69.6 MB, cài đặt trực tiếp lên điện thoại không cần công cụ dev. |

---

## 🛠️ Kiến Trúc Hệ Thống & Công Nghệ

```
┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
│     MÁY TÍNH (Người Chăm Sóc)   │                 │     ĐIỆN THOẠI (Người Bệnh)     │
│  Mở Web: http://localhost:8787  │                 │    App APK Standalone trên máy  │
│  • Tạo & sửa phòng 3D bằng AI   │                 │   • Không gian 3D Point-and-    │
│  • Bóc tách ảnh kỷ niệm         │                 │     Explore tương tác trực giác │
│  • Phát hành phòng lên điện thoại│                 │   • Nghe giọng đọc & lật sách 3D│
│  • Đặt lịch nhắc uống thuốc     │                 │   • Nhận thẻ thông báo dịu êm   │
└────────────────┬────────────────┘                 └────────────────▲────────────────┘
                 │                                                   │
                 │ POST /api/sync/publish                            │ GET /api/sync/latest
                 │ POST /api/sync/message                            │ (Tự động đồng bộ ngầm)
                 ▼                                                   │
        ┌────────────────────────────────────────────────────────────┴┐
        │            SERVER BACKEND MEMORYWEAVER (PORT 8787)          │
        │     • Node.js ES Modules + Gemini 2.5 AI SDK                │
        │     • Chạy cục bộ: http://192.168.1.xxx:8787 (Wi-Fi)        │
        │     • Hoặc qua Cloudflare: https://xxx.trycloudflare.com    │
        └─────────────────────────────────────────────────────────────┘
```

- **Ứng dụng Mobile**: React Native 0.86, Expo 57, React Native WebView, Three.js 3D Engine, AsyncStorage, SecureStore.
- **Backend Server**: Node.js v20+, Google Gemini AI (Flash-Lite / Pro Multimodal), Cloudflare Tunnel / LocalTunnel.

---

## 📖 Hướng Dẫn Vận Hành Từng Bước

### Bước 1: Khởi động Server trên Máy tính (1 cú nhấp chuột)
1. Chạy file [`CHAY_SERVER.bat`](./CHAY_SERVER.bat).
2. Chọn chế độ:
   - Gõ `1` (Enter): Chế độ **Cloudflare HTTPS** (Khuyên dùng — Điện thoại dùng 4G hoặc Wi-Fi khác vẫn kết nối được).
   - Gõ `2` (Enter): Chế độ **Wi-Fi LAN** (Nếu cả 2 máy cùng chung 1 mạng Wi-Fi gia đình).
3. Màn hình sẽ tự động hiển thị link truy cập và mã Token.

### Bước 2: Cài đặt file APK lên Điện thoại Người Bệnh
1. Tải file [`MemoryWeaver-v1.0.0.apk`](./MemoryWeaver-v1.0.0.apk) sang điện thoại và cài đặt.
2. Mở ứng dụng: Do hệ thống đã **Tự Động Điền Sẵn Token**, bạn chỉ cần kiểm tra địa chỉ Server trong mục **⚙️ Cài đặt** (nếu dùng Cloudflare thì dán link Cloudflare vào) và bấm **"Lưu kết nối"**.

### Bước 3: Soạn phòng và đồng hành cùng Người Bệnh
1. Trên máy tính, người chăm sóc mở trình duyệt truy cập: `http://localhost:8787`
2. Gõ mô tả căn phòng cũ hoặc tải ảnh lên để AI tạo không gian 3D.
3. Khi bấm **"✨ Tạo phòng bằng AI"** hoặc **"✏️ Chỉnh sửa chi tiết"**, không gian 3D sẽ **tự động đồng bộ ngay lập tức** sang điện thoại của người bệnh (đồng thời nút *"🚀 ĐỒNG BỘ SANG MÁY NGƯỜI BỆNH"* vẫn luôn sẵn sàng để xuất bản chủ động bất cứ lúc nào).
4. Thêm/xóa lịch sinh hoạt & uống thuốc tự động đẩy sang thiết bị, và gửi lời nhắn tức thì với phản hồi 2 chiều.


---

## 📂 Cấu Trúc Thư Mục

```text
MemoryWeaver/
├── CHAY_SERVER.bat              # Script 1-click khởi chạy Server AI & Cloudflare
├── MemoryWeaver-v1.0.0.apk      # Bản cài đặt APK Android hoàn chỉnh (69.6 MB)
├── PROMPT_LOG.md                # Toàn bộ nhật ký 111 prompt từ ngày đầu đến nay
├── README.md                    # Tài liệu dự án & bảng so sánh cải tiến
├── server/                      # Mã nguồn Backend Server (Node.js)
│   ├── server.mjs               # API Server, Live Sync Hub & xác thực Token
│   ├── room.mjs                 # Logic AI Gemini, bộ khung prompt 19 đồ vật mới
│   ├── public/caregiver.html    # Cổng Web quản lý dành riêng cho Người Chăm Sóc
│   └── .env                     # Khóa Gemini API & APP_ACCESS_TOKEN
└── expo-app/                    # Mã nguồn Ứng dụng Di động
    ├── App.js                   # Giao diện chính Mobile (Patient & Creator Mode)
    ├── viewer/room.html         # Three.js 3D Engine, Point-and-Explore, sách 3D
    └── android/                 # Android Gradle native project để build APK
```

---

## 🏆 Giấy Phép & Bản Quyền
Dự án được phát triển với tinh thần cống hiến vì cộng đồng và nâng cao chất lượng cuộc sống cho người cao tuổi. Mọi đóng góp xin gửi về kho lưu trữ [Thanh-3108/MemoryWeaver](https://github.com/Thanh-3108/MemoryWeaver).
