# Chế độ xem Đề tài KHCN

Phần Đề tài KHCN ánh xạ phiên đăng nhập hiện có thành hai vai trò. Khách, tài khoản demo và tài khoản thường dùng `user` (view 1). Tài khoản đã đăng nhập có quyền `SUPER_ADMIN` hoặc `DELEGATED` dùng `admin` (view 2). Không thay đổi AuthContext, whitelist hoặc quy tắc phân quyền của Công bố khoa học.

| Nội dung | View 1 — user | View 2 — admin |
| --- | --- | --- |
| Menu Đề tài cán bộ | Tổng quan, Nhân sự nghiên cứu, Danh mục đề tài | Đủ bảy mục hiện có |
| Menu Đề tài người học | Tổng quan, Danh mục đề tài, Người học & hướng dẫn | Đủ sáu mục hiện có |
| Biểu đồ đầu tiên ở Tổng quan cán bộ | Cột chồng số đề tài đã giao theo đơn vị và năm giao | Biểu đồ giao, nghiệm thu và kinh phí hiện có |
| Danh mục cán bộ | Ẩn kinh phí, trạng thái, xếp loại ở bảng, chi tiết mở từ danh mục và CSV; ẩn bộ lọc trạng thái/xếp loại ở danh mục | Giữ đầy đủ cột, chi tiết và CSV |
| Nhân sự nghiên cứu; ba trang người học được phép | Giữ nội dung hiện có | Giữ nội dung hiện có |

`src/services/projectAccess.ts` là nơi xác định vai trò và các trang được mở. Sidebar và App dùng chung quy tắc; đường dẫn trực tiếp, đường dẫn hash cũ, lịch sử điều hướng và đăng xuất từ trang admin đều đưa user về Tổng quan của nhóm tương ứng. Quyền được áp dụng ngay lúc render để trang cũ không hiển thị trong lúc chờ effect đồng bộ URL.

Biểu đồ đơn vị/năm tái sử dụng phép đếm của `buildUnitYearHeatmap`: mỗi đề tài được tính một lần theo đơn vị chủ trì và năm giao; nhóm chưa rõ đơn vị/năm vẫn có mặt. Khi đổi vai trò, cấu hình biểu đồ được thay toàn bộ để không giữ lại chuỗi kinh phí/nghiệm thu.

Đây là phân quyền hiển thị dựa trên phiên tài khoản hiện có ở client. Cơ chế xác thực, nguồn Google Sheets công khai và proxy CSV không thay đổi; các chế độ xem này không tạo cơ chế bảo mật dữ liệu ở máy chủ.

Kiểm chứng: `npm run check`; `tests/project-access.test.mjs` kiểm tra ánh xạ vai trò, tất cả đường dẫn, menu và cột/chi tiết thực tế qua React SSR; `tests/projects.test.mjs` kiểm tra CSV của cả hai chế độ.
