# Dashboard KHCN hợp nhất

Ứng dụng React/Vite hợp nhất đề tài KHCN và công bố khoa học. Toàn bộ mã nguồn, cấu hình và lệnh chạy nằm trực tiếp trong thư mục `NCKH_Final`.

## Menu

- **Đề tài KHCN → Đề tài Cán bộ:** Tổng quan điều hành, Theo 9 đơn vị, Tiến độ & nghiệm thu, Nhân sự nghiên cứu, Kinh phí & hợp tác, Danh mục đề tài, Chất lượng dữ liệu.
- **Đề tài KHCN → Đề tài người học:** Tổng quan người học, Danh mục đề tài, Người học & hướng dẫn, Tiến độ & nghiệm thu, Kinh phí & sản phẩm, Chất lượng dữ liệu.
- **Công bố khoa học:** Tổng quan công bố, Bài báo trong nước, Bài báo quốc tế, Tra cứu bài báo.

Menu hỗ trợ thu gọn/mở rộng từng nhóm, thiết bị di động và URL trực tiếp theo dạng `/projects/staff/overview`, `/projects/learners/overview` hoặc `/publications/source2`. Điều hướng dùng History API, hỗ trợ Back/Forward. Các link cũ có `/#/` và đường dẫn `/projects/overview` được tự đổi sang URL mới bằng `replaceState`, không thêm một bước thừa trong lịch sử. Bộ lọc của mỗi dashboard được giữ khi chuyển qua lại giữa các nhóm trong cùng phiên sử dụng. Xem [docs/routing.md](docs/routing.md) về cấu hình server khi triển khai.

## Chạy ứng dụng

Khuyến nghị Node.js 24 LTS, tối thiểu 22.18. Mở PowerShell tại thư mục `NCKH_Final`. Một server chạy đủ cả Cán bộ, Người học và Công bố khoa học.

### Chạy để sử dụng hoặc phát triển trên máy

Lần đầu, hoặc sau khi thay đổi các gói phụ thuộc:

```powershell
cd "C:\Users\Admin\Documents\NCKH_Final"
npm ci
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173). Những lần sau chỉ cần `npm run dev` trong cùng thư mục. Giữ cửa sổ PowerShell đang chạy; nhấn `Ctrl+C` để dừng.

Mở thẳng Người học tại [http://localhost:5173/projects/learners/overview](http://localhost:5173/projects/learners/overview).

### Chạy bản đóng gói

```powershell
cd "C:\Users\Admin\Documents\NCKH_Final"
npm run build
npm start
```

Mở [http://localhost:3000](http://localhost:3000). `npm start` phục vụ bản đã build trong `dist` và proxy Google Sheets. Khi sửa mã nguồn, chạy lại `npm run build` trước khi xem bản đóng gói. Nếu thiếu `dist`, server sẽ báo lệnh cần chạy.

### Kiểm tra trước khi sử dụng

```powershell
npm run check
```

Lệnh này chạy kiểm thử bộ đọc dữ liệu Người học, dữ liệu cán bộ, bộ lọc/sắp xếp/phân trang/xuất CSV và kiểm tra TypeScript/build của toàn ứng dụng. Dữ liệu Google Sheets cần kết nối Internet và quyền xem công khai theo liên kết. Kết quả đối chiếu Danh mục đề tài cán bộ: [docs/staff-catalog-audit.md](docs/staff-catalog-audit.md).

Đợt kiểm tra toàn bộ Đề tài KHCN trước production và các chênh lệch cần xử lý ở Sheet: [docs/production-audit.md](docs/production-audit.md). Chạy `npm run audit:data` để đọc lại 8 nguồn và tạo báo cáo tổng hợp; dùng `npm run audit:data -- --base-url http://localhost:3000 --compare-direct` để đối chiếu thêm proxy của bản production với nguồn trực tiếp. Lệnh chỉ đọc, không sửa Google Sheets.

### Xử lý khi không mở được

- Cổng 5173 hoặc 3000 đã dùng: dừng phiên server cũ bằng `Ctrl+C`. Vite giữ cố định 5173 và báo rõ nếu cổng bận.
- Muốn đổi cổng bản đóng gói trong PowerShell: chạy `$env:PORT = '3001'`, rồi `npm start`; mở `http://localhost:3001`.
- Đăng nhập Google: quản trị viên cấu hình `VITE_GOOGLE_CLIENT_ID` trong `.env.local` hoặc biến môi trường build và thêm đúng origin triển khai vào **Authorized JavaScript origins** của OAuth Client ID trong Google Cloud Console. `localhost` và `127.0.0.1` là hai origin khác nhau. Hộp đăng nhập người dùng không hiển thị thông số hoặc công cụ cấu hình OAuth.
- Lỗi **400: origin_mismatch** phải được quản trị viên xử lý trên OAuth Client ID của bản build: trong Google Cloud Console → **Google Auth Platform → Clients**, thêm origin đang sử dụng (giao thức, tên máy và cổng; không kèm đường dẫn) vào **Authorized JavaScript origins**, rồi lưu.
- Để triển khai Cloudflare Pages, dùng `npm run build` từ thư mục gốc và thư mục đầu ra `dist`. Nếu cấu hình triển khai cũ còn trỏ tới `Dashboard-Combined`, đổi đường dẫn project về thư mục gốc. Worker trong `public/_worker.js` được Vite chép vào đầu ra để phục vụ proxy.

## Dữ liệu và quyền truy cập

- Giao diện sử dụng chỉ hiển thị số liệu, bộ lọc và thao tác nghiệp vụ; không hiển thị trạng thái đọc Sheet, thông báo chẩn đoán hay liên kết mở bảng nguồn. Lỗi tải dữ liệu có thông báo ngắn và nút thử lại. Quy tắc tính và đối chiếu chi tiết được lưu trong `docs/`.
- Phần đề tài đọc 6 tab Google Sheets qua `/api/sheet`; Vite dev server, Node server và Cloudflare Worker đều giữ proxy từ project gốc. Nếu proxy không khả dụng, client thử tải CSV trực tiếp từ Google.
- Hai nhóm đề tài đọc dữ liệu khi mở lần đầu và khi tải lại trang. Chưa tự cập nhật liên tục khi trang đang mở. Năm mới được lấy từ dữ liệu; thêm tab/workbook cần cập nhật cấu hình và proxy.
- Phần người học đọc hai tab của bảng `1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02`, dùng `/api/sheet?dataset=learners&gid=...`. Không dùng chung dữ liệu với Cán bộ dù các gid trùng nhau. Xem thiết kế và quy tắc tính tại [docs/learner-dashboard.md](docs/learner-dashboard.md).
- Phần công bố đọc trực tiếp 2 nguồn Google Sheets gốc; bộ lọc, biểu đồ, đăng nhập Google, phân quyền và xuất CSV theo phạm vi được phép đều được giữ lại. Toàn ứng dụng dùng một hộp đăng nhập và một phiên tài khoản.
- Danh sách phân quyền trong `src/nckh/data/whitelist.json`. Khi chạy Vite dev server, thay đổi từ giao diện có thể lưu lại file này qua `/_api/save-whitelist`. Ở bản dựng tĩnh, thay đổi trên giao diện được lưu trong trình duyệt hiện tại; muốn áp dụng chung cho mọi người dùng, hãy cập nhật file và triển khai lại.

Mã giao diện đề tài nằm trong `src/components`, `src/services`, `src/store`. Mã công bố nằm trong `src/nckh`. Điều hướng và bố cục chung nằm trong `src/App.tsx`, `src/components/common/Sidebar.tsx`, `src/styles/combined.css`.

Mã dashboard người học nằm trong `src/learners`. Kiểm thử bộ đọc dữ liệu: `node --test tests/learners.test.mjs` (Node 22.18+ hoặc 24 để chạy TypeScript trực tiếp). Cả hai nhóm đề tài dùng chung tài khoản đăng nhập; hiện chưa giới hạn xem dữ liệu/chức năng theo tài khoản.
