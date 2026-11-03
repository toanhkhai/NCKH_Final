# Dashboard đề tài người học

Nguồn: [tab tổng hợp](https://docs.google.com/spreadsheets/d/1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02/edit?gid=844694624#gid=844694624) và [tab chi tiết](https://docs.google.com/spreadsheets/d/1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02/edit?gid=1326842216#gid=1326842216).

Có hai tab: `TỔNG HƠP - Số tự động` (gid 844694624) và `Đề tài người học` (gid 1326842216). Dashboard đọc cả hai; không ghi vào bảng nguồn.

## Các thành phần đề xuất và đã triển khai

| Màn hình | Nội dung | Dữ liệu sử dụng |
| --- | --- | --- |
| Tổng quan | Tổng chính thức, mức độ cập nhật hồ sơ; nghiệm thu, kinh phí và bài báo ghi nhận; phân bố đơn vị/năm | Số đề tài trên tab tổng hợp và thông tin hồ sơ chi tiết |
| Danh mục đề tài | Tìm theo tên/mã/người tham gia, lọc, phân trang, xuất CSV, xem toàn bộ trường và minh chứng | Đọc cột theo nhãn của mẫu hiện tại, giữ các trường tùy chọn chưa có là chưa cập nhật |
| Người học & hướng dẫn | Lượt chủ nhiệm/thành viên, quy mô nhóm người học, 10 cán bộ hướng dẫn nhiều đề tài nhất, bảng phân công hướng dẫn | Chủ nhiệm và các ô thành viên đã khai báo; 2 ô CBHD gộp theo MSCB hoặc tên và đơn vị; áp dụng bộ lọc hiện tại |
| Tiến độ & nghiệm thu | Gia hạn, hủy, tiến độ có đủ dữ liệu, xếp loại nghiệm thu và hồ sơ cần bổ sung | Thời gian bắt đầu/kết thúc, số tháng gia hạn, cờ trạng thái, xếp loại |
| Kinh phí & sản phẩm | Kinh phí đã ghi nhận, thanh lý, tài trợ/hợp tác, bài báo và bài quốc tế | Kinh phí (triệu đồng), cờ thanh lý/tài trợ/hợp tác, bài báo, minh chứng |
| Chất lượng dữ liệu | Thiếu mã người học, thời gian, kinh phí, trạng thái, minh chứng; so sánh dòng tổng và hồ sơ thực tế | Chi tiết và bảng tổng hợp |

## Quy tắc tính

- Tổng số đề tài chính thức lấy động từ tab tổng hợp. Không dùng dòng “TỔNG SỐ” trên tab chi tiết hoặc số hồ sơ có tên thay cho tổng chính thức; các số này được trình bày riêng để đối chiếu.
- Các dòng có STT và tên đề tài được tính là hồ sơ đã có thông tin chi tiết. Tổng chính thức trừ số hồ sơ có tên là số đề tài cần bổ sung chi tiết. ID nội bộ dựa trên dòng nguồn, không dùng STT vì STT có thể lặp giữa các năm; không tự tạo tên, đơn vị hoặc trạng thái cho hồ sơ chưa có thông tin.
- Giữ ô trống là `null`, không chuyển thành 0 hoặc tự nhận là “chưa nghiệm thu”. Giá trị 0 nhập rõ vẫn là 0. Các tổng kinh phí/bài báo hiển thị số hồ sơ đã có số liệu.
- Bộ lọc “Năm nhóm nguồn” lấy từ các năm trên tab tổng hợp và các dòng chia nhóm năm trên tab chi tiết, không dùng nó để điền vào “Năm bắt đầu” bị thiếu. Tổng chính thức và mức độ cập nhật chi tiết chỉ áp dụng bộ lọc năm. Các bộ lọc khác chỉ áp dụng cho hồ sơ đã có thông tin.
- Chỉ suy ra “Quá hạn dự kiến” khi đã có cờ chưa nghiệm thu, chưa hủy, trạng thái gia hạn và tháng/năm kết thúc hợp lệ. Nếu gia hạn có nhưng thiếu số tháng, giữ là chưa đủ dữ liệu tiến độ. Hạn kết thúc tính đến cuối tháng.
- Nghiệm thu theo năm giao và nghiệm thu theo năm thống kê là hai chỉ tiêu khác nhau; không cộng hai cột này. Dòng tổng giai đoạn cũng không cộng thêm vào từng năm.
- Bảng đối chiếu hiển thị tổng chính thức, số đề tài đã có chi tiết và số đề tài còn thiếu chi tiết theo từng kỳ. Dòng chưa có tên trên tab chi tiết được thống kê ở màn hình Chất lượng dữ liệu, không bị trừ khỏi tổng chính thức.
- Nhân sự người học đếm lượt tham gia, chưa công bố số người duy nhất khi mã định danh còn thiếu. CBHD gộp theo MSCB; nếu thiếu thì theo tên và đơn vị, vì vậy các biến thể cách viết có thể tạo nhóm khác nhau.
- Quy mô nhóm người học tính bằng chủ nhiệm và số thành viên có tên đã khai báo, chia nhóm 1, 2, 3, 4 và từ 5 người trở lên; hồ sơ thiếu chủ nhiệm có nhóm riêng. Biểu đồ 10 cán bộ hướng dẫn nhiều đề tài nhất dùng thanh ngang giảm dần theo số đề tài trong bộ lọc, mỗi cán bộ chỉ tính một lần trong mỗi đề tài; không thêm thanh cộng gộp các cán bộ ngoài top 10.
- Cả hai nhóm đề tài dùng chung đăng nhập. Khách và tài khoản thường dùng view 1; tài khoản quản trị hoặc được ủy quyền dùng view 2. Người học ở view 1 chỉ mở Tổng quan, Danh mục đề tài và Người học & hướng dẫn; view 2 giữ đủ sáu mục. Quy tắc chung tại [project-access.md](project-access.md).

## Kết quả đọc lại nguồn ngày 02/11/2026

- Cả hai tab trả CSV HTTP 200. Nội dung nhận qua proxy `/api/sheet?dataset=learners` khớp từng byte với CSV tải trực tiếp từ đúng Google Sheet và `gid` tương ứng.
- Tổng chính thức 997, hồ sơ có tên 997, không còn dòng chỉ có STT đang chờ tên; tổng kinh phí chi tiết 5.152 triệu đồng khớp tổng hợp. Số hồ sơ và kinh phí từng năm cũng khớp.
- Dòng “TỔNG SỐ” trên chi tiết ghi 1.007, cần được chủ dữ liệu kiểm tra. Ứng dụng cảnh báo chênh lệch và vẫn lấy 997 từ tổng hợp.
- Cả 997 hồ sơ chưa có cờ nghiệm thu, gia hạn, hủy, thanh lý và tài trợ/hợp tác; hiển thị chưa cập nhật, không coi đó là xác nhận 0. Các cột không còn trong mẫu là dữ liệu chưa có.
- Bộ đếm độc lập khớp các trường tên/mã, năm giao, kinh phí, cờ nghiệm thu với bộ đọc ứng dụng. Nội dung proxy production Node khớp từng byte với nguồn trực tiếp. Chi tiết và thời điểm trong [báo cáo production](production-audit.md) và [JSON đối chiếu](production-data-audit.json).

Các số trên là ảnh chụp thời điểm kiểm tra; ứng dụng tải lại nguồn khi mở dashboard và khi bấm Làm mới.
