# Đối chiếu biểu đồ theo 9 đơn vị

Kiểm tra ngày 02/11/2026, 10:24 (UTC+7), trên workbook cán bộ `1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg`.

## Đối chiếu nguồn

Đọc CSV trực tiếp của cả 5 tab chi tiết và [tab tổng hợp](https://docs.google.com/spreadsheets/d/1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg/edit?gid=844694624#gid=844694624). [Tab cấp Trường](https://docs.google.com/spreadsheets/d/1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg/edit?gid=1326842216#gid=1326842216) có 705 hồ sơ; các tab Tỉnh, Bộ, Quốc gia và HTQT hiện chưa có hồ sơ có tên.

Đối chiếu từng cặp đơn vị chủ trì × năm giao với cột đơn vị của các dòng cấp/năm trong tổng hợp: **54/54 ô khớp**, tổng các ô bằng **705**. Hai biến thể viết hoa trong nguồn (`Bệnh Viện`, `Phòng, Trung tâm, Thư viện`) được chuẩn hóa về tên hiển thị tương ứng.

| Đơn vị | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Khoa Y | 47 | 44 | 39 | 52 | 58 | 16 |
| Khoa Dược | 12 | 6 | 10 | 12 | 5 | 7 |
| Khoa RHM | 7 | 4 | 6 | 5 | 7 | 0 |
| Khoa YHCT | 4 | 0 | 3 | 5 | 10 | 1 |
| Khoa YTCC | 8 | 2 | 7 | 8 | 9 | 7 |
| Khoa KHCB | 11 | 4 | 6 | 12 | 17 | 3 |
| Khoa ĐD - KTYH | 9 | 10 | 10 | 9 | 13 | 1 |
| Bệnh viện | 29 | 12 | 16 | 28 | 43 | 9 |
| Phòng, trung tâm, thư viện | 7 | 10 | 20 | 6 | 10 | 9 |
| **Tổng** | **134** | **92** | **117** | **137** | **172** | **53** |

## Điều chỉnh UI và logic

- Tách chú giải màu khỏi vùng vẽ để không đè nhãn năm; hiển thị mọi nhãn năm, rút xuống dòng tên đơn vị dài, có vùng cuộn ngang khi thiếu chỗ.
- Sắp thứ tự đơn vị theo danh mục, Khoa Y ở trên. Ô 0 có màu riêng; màu chữ chọn theo độ sáng nền. Tooltip gọn và giới hạn trong biểu đồ.
- Đếm mỗi hồ sơ đúng một lần theo đơn vị chủ trì và năm giao (`assignmentYear` của nhóm nguồn; chỉ dùng `startYear` nếu thiếu năm giao), thống nhất với bộ lọc chung.
- Bỏ mảng năm 2021–2026 và ngưỡng màu 60 cố định; lấy năm và mức cao nhất theo dữ liệu/bộ lọc. Nguồn hiện tại có mức cao nhất là 58. Chú giải là thang màu của kết quả đang lọc.
- Giữ ô 0 trong các năm/đơn vị thuộc phạm vi đang xem; vẫn biểu diễn nhóm chưa rõ năm hoặc đơn vị ngoài danh mục nếu có. Kết quả rỗng có thông báo riêng.
- Biểu đồ cột bên cạnh dùng các trạng thái riêng biệt từ dữ liệu, tránh gộp trạng thái chưa cập nhật vào “chưa nghiệm thu”.

## Kiểm chứng

- Kiểm thử mô hình: tổng ô bằng tổng hồ sơ; năm giao khác năm bắt đầu; năm mới; số đếm vượt 60; dữ liệu thiếu năm; đơn vị ngoài danh mục; kết quả rỗng; thang màu một hồ sơ.
- Kiểm tra trình duyệt tại `/projects/staff/units`: đủ 6 nhãn năm và 54 ô; chú giải nằm dưới trục. Lọc 2022 còn 92 hồ sơ, lọc thêm Khoa Y còn 44; Khoa RHM năm 2026 báo không có kết quả; đặt lại trở về 705.
- `npm run check`: 27 kiểm thử, TypeScript và bản build thành công.

Các số liệu là kết quả tại thời điểm kiểm tra. Ứng dụng vẫn tải Google Sheets trực tiếp.
