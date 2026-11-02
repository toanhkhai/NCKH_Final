# Đối chiếu Danh mục đề tài cán bộ

Nguồn: workbook `1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg`, gồm [tab tổng hợp](https://docs.google.com/spreadsheets/d/1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg/edit?gid=844694624#gid=844694624) và [tab cấp Trường](https://docs.google.com/spreadsheets/d/1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg/edit?gid=1326842216#gid=1326842216); các tab Tỉnh, Bộ, Quốc gia và HTQT hiện chưa có hồ sơ có tên.

## Kiểm tra ngày 02/11/2026

- CSV qua proxy Vite khớp từng byte với CSV Google trực tiếp.
- Có 705 hồ sơ có tên; 705 mã định danh duy nhất theo `gid + dòng vật lý`. Ánh xạ tên đề tài, mã, quyết định, năm bắt đầu/kết thúc, đơn vị nguồn, MSCB, kinh phí và cờ nghiệm thu đã đối chiếu lại với các cột CSV, không thấy lệch.
- Số đề tài theo năm giao: 2021: 134; 2022: 92; 2023: 117; 2024: 137; 2025: 172; 2026: 53. Tổng 705 khớp tab tổng hợp. Số theo 9 đơn vị chủ trì cũng khớp tổng hợp.
- Có 271 đề tài nghiệm thu, khớp tab tổng hợp. Có 71 đề tài ngưng/hủy; 45 hồ sơ có quyết định nghiệm thu nhưng chưa cập nhật cờ nên trình bày là chờ nghiệm thu; 318 hồ sơ còn chưa cập nhật trạng thái. Theo xác nhận người dùng, ô cờ nghiệm thu trống được giữ là chưa cập nhật, không suy ra quá hạn.
- Kinh phí chi tiết cộng được 10.546 triệu đồng; tab tổng hợp ghi 10.529 triệu, lệch 17 triệu. Có 1 hồ sơ trống kinh phí và 2 hồ sơ ghi rõ 0. Không sửa Sheet nguồn; bảng giữ giá trị từng dòng và báo điểm cần đối chiếu.

## Lỗi đã sửa

- Điều kiện cũ loại bỏ mọi tên có từ “giai đoạn”, làm mất 18 hồ sơ hợp lệ (705 thành 687). Chỉ bỏ dòng tổng và dòng nhóm năm.
- ID cũ `cấp + STT` trùng giữa các năm, gây lỗi đối soát dòng của React khi lọc/sắp xếp. ID mới theo dòng nguồn; STT trình bày liên tục theo kết quả đang xem, STT gốc giữ trong CSV và liên kết nguồn.
- Lọc đơn vị theo đơn vị chủ trì, khớp cột hiển thị. Tra cứu nhân sự vẫn tìm theo chủ nhiệm và thành viên, hỗ trợ tên không dấu và MSCB; giữ nguyên cụm từ để tránh ghép các từ nằm ở nhiều người khác nhau.
- Lọc theo năm giao lấy năm của nhóm nguồn, tách khỏi năm bắt đầu thực tế. Không tự điền năm kết thúc hoặc tháng còn thiếu.
- Đổi bộ lọc, sắp xếp hoặc số dòng đưa về trang đầu. Phân trang chặn trang vượt số trang hiện có; nút số trang luôn bao quanh trang đang chọn.
- Xếp loại, gia hạn, tài trợ và hợp tác có điều khiển hiển thị rõ; số đếm theo cấp áp dụng các tiêu chí còn lại. Bộ lọc mặc định không giới hạn kinh phí ở 1.000 triệu.
- CSV xuất toàn bộ kết quả đã lọc và sắp xếp, giữ ô kinh phí trống, xử lý dấu phẩy/ngoặc kép/xuống dòng và công thức, kèm liên kết dòng Sheet.
- Thông báo đối chiếu và trạng thái “khớp” được tính từ dữ liệu, bao gồm cả kinh phí; bỏ các nhãn 100% gắn cố định. Liên kết nguồn trong bảng và màn hình chất lượng dùng đúng dòng vật lý.

Các số trên là ảnh chụp tại thời điểm kiểm tra; ứng dụng tiếp tục đọc Sheet trực tiếp.
