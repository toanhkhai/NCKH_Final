# Dashboard đề tài người học

Nguồn: [Bảng Google Sheets người học](https://docs.google.com/spreadsheets/d/1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02/edit?gid=844694624#gid=844694624).

Có hai tab: `TỔNG HƠP - Số tự động` (gid 844694624) và `Đề tài người học` (gid 1326842216). Dashboard đọc cả hai; không ghi vào bảng nguồn.

## Các thành phần đề xuất và đã triển khai

| Màn hình | Nội dung | Dữ liệu sử dụng |
| --- | --- | --- |
| Tổng quan | Hồ sơ có tên, nghiệm thu, kinh phí và bài báo ghi nhận; phân bố đơn vị/năm; đối chiếu tổng hợp | Tên đề tài, đơn vị quản lý, nhóm năm, cờ nghiệm thu, kinh phí, bài báo |
| Danh mục đề tài | Tìm theo tên/mã/người tham gia, lọc, phân trang, xuất CSV, xem toàn bộ trường và minh chứng | Khung 56 cột của tab chi tiết |
| Người học & hướng dẫn | Lượt chủ nhiệm/thành viên, lớp, khóa, phân công cán bộ hướng dẫn | MSSV/MSHV, lớp/khóa/niên khóa, tối đa 2 CBHD và 4 thành viên |
| Tiến độ & nghiệm thu | Gia hạn, hủy, tiến độ có đủ dữ liệu, xếp loại nghiệm thu và hồ sơ cần bổ sung | Thời gian bắt đầu/kết thúc, số tháng gia hạn, cờ trạng thái, xếp loại |
| Kinh phí & sản phẩm | Kinh phí đã ghi nhận, thanh lý, tài trợ/hợp tác, bài báo và bài quốc tế | Kinh phí (triệu đồng), cờ thanh lý/tài trợ/hợp tác, bài báo, minh chứng |
| Chất lượng dữ liệu | Thiếu mã người học, thời gian, kinh phí, trạng thái, minh chứng; so sánh dòng tổng và hồ sơ thực tế | Chi tiết và bảng tổng hợp |

## Quy tắc tính

- Chỉ các dòng có STT và tên đề tài được tính là hồ sơ; bỏ dòng tổng, dòng năm và dòng chỉ có STT. ID nội bộ dựa trên dòng nguồn, không dùng STT vì STT có thể lặp giữa các năm.
- Giữ ô trống là `null`, không chuyển thành 0 hoặc tự nhận là “chưa nghiệm thu”. Giá trị 0 nhập rõ vẫn là 0. Các tổng kinh phí/bài báo hiển thị số hồ sơ đã có số liệu.
- Bộ lọc “Năm nhóm nguồn” lấy từ dòng chia nhóm năm trên sheet, không dùng nó để điền vào “Năm bắt đầu” bị thiếu. Số liệu các năm tương lai trên bảng tổng hợp được trình bày đúng nguồn, không coi là hồ sơ thực tế khi thiếu tên đề tài.
- Chỉ suy ra “Quá hạn dự kiến” khi đã có cờ chưa nghiệm thu, chưa hủy, trạng thái gia hạn và tháng/năm kết thúc hợp lệ. Nếu gia hạn có nhưng thiếu số tháng, giữ là chưa đủ dữ liệu tiến độ. Hạn kết thúc tính đến cuối tháng.
- Nghiệm thu theo năm giao và nghiệm thu theo năm thống kê là hai chỉ tiêu khác nhau; không cộng hai cột này. Dòng tổng giai đoạn cũng không cộng thêm vào từng năm.
- Bảng đối chiếu áp dụng bộ lọc năm, không áp dụng đơn vị/lớp/khóa vì bảng tổng hợp không có các chiều này. Chênh lệch = số giao trên tổng hợp trừ số hồ sơ có tên trong cùng kỳ.
- Nhân sự người học đếm lượt tham gia, chưa công bố số người duy nhất khi mã định danh còn thiếu. CBHD gộp theo MSCB; nếu thiếu thì theo tên và đơn vị, vì vậy các biến thể cách viết có thể tạo nhóm khác nhau.
- Cả hai nhóm đề tài dùng chung đăng nhập, hiện hiển thị cùng dữ liệu/chức năng cho khách và người đã đăng nhập.

## Kết quả kiểm tra nguồn ngày 30/10/2026

- Bảng tổng hợp ghi 223 đề tài; có 143 dòng chi tiết có tên và 80 dòng chỉ có số thứ tự.
- Dòng tổng trên chính tab chi tiết ghi 233, khác cả bảng tổng hợp và số hồ sơ thực tế. Dashboard giữ lại các giá trị nguồn để đối chiếu.
- Có 1 hồ sơ cập nhật cờ nghiệm thu và kinh phí; 142 hồ sơ còn thiếu các trường này. Không nên coi tỷ lệ 1/143 là tỷ lệ nghiệm thu hoàn chỉnh khi 142 trạng thái chưa biết.

Các số trên là ảnh chụp thời điểm kiểm tra; ứng dụng tải lại nguồn khi mở dashboard và khi bấm Làm mới.
