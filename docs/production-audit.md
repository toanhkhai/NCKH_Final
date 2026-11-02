# Kiểm tra Đề tài KHCN trước production — 02/11/2026

Đã rà soát 7 menu Cán bộ và 6 menu Người học, bộ đọc dữ liệu, bộ lọc, công thức thống kê, liên kết dòng nguồn, xuất CSV và cách phục vụ bản production. Đã sửa các lỗi mã nguồn phát hiện được. Chưa thể kết luận dữ liệu đã khớp hoàn toàn vì các bất thường trong Sheet bên dưới vẫn tồn tại.

Kết quả máy đọc được, thời điểm tải và SHA-256 của từng nguồn: [production-data-audit.json](production-data-audit.json). Báo cáo chỉ lưu số tổng hợp và số dòng nguồn, không lưu hồ sơ hoặc thông tin cá nhân.

## Đối chiếu nguồn thực tế

Đã đọc 8/8 nguồn qua Node production cục bộ, đồng thời tải CSV trực tiếp từ Google để so sánh: cả 8 nguồn khớp từng byte. Bộ đếm độc lập trên các dòng CSV và bộ đọc của ứng dụng khớp số hồ sơ, tên/mã đề tài, nhóm năm giao, kinh phí và cờ nghiệm thu; cán bộ còn kiểm tra cờ ngưng/hủy. Đây là kiểm tra ánh xạ và tính toán, không xác nhận tính đúng đắn nghiệp vụ của từng nội dung nhập trên Sheet.

| Chỉ tiêu | Cán bộ | Người học |
| --- | ---: | ---: |
| Tổng chính thức trên tổng hợp, kỳ 2021–2030 | 705 | 997 |
| Hồ sơ có tên trên các tab chi tiết | 705 | 997 |
| Nghiệm thu đã được xác nhận trong chi tiết | 271 | Chưa cập nhật cờ ở cả 997 hồ sơ |
| Kinh phí trên tổng hợp, triệu đồng | 10.529 | 5.152 |
| Kinh phí cộng từ các ô đã có số liệu, triệu đồng | 10.546 | 5.152 |
| Hồ sơ chưa có kinh phí | 1 | 0 |

Cán bộ hiện có 705 hồ sơ ở Cấp Trường; bốn tab cấp Tỉnh/Bộ/Quốc gia/HTQT là mẫu chưa có hồ sơ. Không coi các tab này là lỗi tải. Số đề tài theo năm giao, số đã nghiệm thu theo năm giao, số nghiệm thu theo năm thống kê và các ô đã có số liệu theo đơn vị đều khớp bảng tổng hợp. Người học khớp số hồ sơ và kinh phí theo từng năm.

### Các điểm cần chủ dữ liệu xác minh

1. **Kinh phí cán bộ nhóm năm 2025:** tổng hợp 2.755 triệu, các ô chi tiết đã có số liệu cộng được 2.772 triệu, lệch **17 triệu**. Đây cũng là phần chênh của cả kỳ. Cần kiểm tra công thức/phạm vi tính trong [tab tổng hợp cán bộ](https://docs.google.com/spreadsheets/d/1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg/edit?gid=844694624#gid=844694624) và các hồ sơ nhóm 2025; chưa có căn cứ chỉ định một hồ sơ nào gây lệch.
2. **Thiếu kinh phí cán bộ tại [dòng 376](https://docs.google.com/spreadsheets/d/1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg/edit?gid=1326842216#gid=1326842216&range=A376)**, nhóm năm 2024. Không tự điền 0. Vì còn ô thiếu, 10.546 triệu là tổng các ô đã có số liệu, chưa phải tổng kinh phí đầy đủ được xác nhận.
3. **Trùng mã cán bộ tại [dòng 381–382](https://docs.google.com/spreadsheets/d/1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg/edit?gid=1326842216#gid=1326842216&range=A381:A382)**, nhóm năm 2024. Giao diện đã cảnh báo trên cả hai hồ sơ. Giữ hai dòng riêng biệt theo vị trí nguồn; không tự xóa/gộp vì chưa xác minh có phải cùng một đề tài.
4. **Dòng “TỔNG SỐ” ở [chi tiết người học](https://docs.google.com/spreadsheets/d/1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02/edit?gid=1326842216#gid=1326842216) ghi 1.007**, trong khi [tổng hợp](https://docs.google.com/spreadsheets/d/1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02/edit?gid=844694624#gid=844694624) và số hồ sơ có tên đều là **997**. Màn hình Chất lượng dữ liệu đã hiển thị chênh lệch này.
5. **Độ đầy đủ trạng thái:** cán bộ có 434 ô cờ nghiệm thu trống, 705 ô thanh lý trống; 45 hồ sơ có quyết định nghiệm thu nhưng cờ chưa xác nhận. Người học có 997/997 hồ sơ chưa có các cờ nghiệm thu/gia hạn/hủy/thanh lý/tài trợ/hợp tác. Các cột đã bỏ khỏi mẫu được coi là chưa có dữ liệu. Chưa đủ dữ liệu để công bố tỷ lệ tiến độ hoặc thanh lý hoàn chỉnh. Người học chỉ có 12/997 hồ sơ có MSSV/MSHV; chỉ số nhân sự đang trình bày số lượt và số cán bộ nhận diện được, không chứng nhận số người duy nhất.

Đợt kiểm tra này không ghi hoặc sửa Google Sheets.

## Lỗi mã nguồn đã sửa

| Nhóm | Hành vi đã sửa |
| --- | --- |
| Năm và số liệu cố định | Biểu đồ tổng quan/tiến độ dùng năm từ dữ liệu; heatmap tiếp tục mở rộng theo năm và đơn vị thực tế. Bỏ nhận xét, tỷ lệ, hạn mức màu và số tổng gắn cứng. |
| Thiếu dữ liệu | Phân biệt ô trống, 0 và 1 cho bảy loại cờ. Không biến “chưa có thanh lý” thành “chưa thanh lý”, không biến toàn bộ cờ nghiệm thu trống thành 0 đã xác minh. |
| Thời gian và tiến độ | Không tự tạo thời hạn 12 tháng hoặc ngày nghiệm thu mùng 1. Hạn tháng tính đến cuối tháng; gia hạn thay đổi hạn thực hiện. Chỉ suy ra quá hạn khi đủ ngày và cờ cần thiết. Quyết định có nhưng cờ trống hiển thị “Chờ xác nhận nghiệm thu”. |
| Nghiệm thu/xếp loại | Xếp loại chỉ tính trong hồ sơ đã xác nhận nghiệm thu, loại hồ sơ có cờ ngưng/hủy. Phân biệt nghiệm thu theo năm giao với theo năm nghiệm thu; đối chiếu tổng theo cùng nhóm năm giao, kể cả nghiệm thu xảy ra ở kỳ sau. |
| Kinh phí/hợp tác | Các khoảng kinh phí phủ kín mọi giá trị, kể cả âm và chưa biết; không làm rơi 11, 16, 20, 29 triệu. Tài trợ/doanh nghiệp/quốc tế tính hợp, mỗi đề tài một lần. Tổng có thiếu kinh phí được nêu phạm vi rõ. |
| Đơn vị/nhân sự | Lọc đúng đơn vị chủ trì và năm giao. Đơn vị thiếu/không nhận diện được có nhóm riêng, không gán vào phòng/trung tâm. Nhân sự gộp theo MSCB, thiếu mã thì tên và đơn vị; mỗi người chỉ tính một lần trong một đề tài. |
| Chất lượng dữ liệu | Danh sách cảnh báo áp dụng bộ lọc, đối chiếu toàn nguồn có ghi rõ phạm vi riêng. Có phân trang để xem hết hồ sơ; mức độ lấy cảnh báo cao nhất. Trùng mã được cảnh báo, vẫn giữ ID theo dòng vật lý. |
| Tổng hợp | Đọc cột theo nhãn, giữ giá trị thiếu, kiểm tra thay đổi cấu trúc/lặp kỳ; cộng đủ năm cấp thay vì chỉ Cấp Trường. Không báo “khớp” nếu nguồn chưa đủ hoặc kinh phí/năm còn thiếu. |
| Người học | Hỗ trợ mẫu hiện tại có cột mã, cột tùy chọn bị bỏ, kinh phí tổng hợp đổi vị trí và số thành viên theo tiêu đề (nguồn hiện có sáu ô thành viên). Các biểu đồ nhóm giữ phần còn lại thay vì bỏ các nhóm sau top 10. Gộp biến thể Unicode/hoa thường/khoảng trắng của cùng nhãn lớp/đơn vị/khóa, giữ nguyên dữ liệu thô để xem/xuất nguồn. Không tự gộp các viết tắt khác nhau như “RHM A” và “RHMA”. |
| Tải dữ liệu | Mỗi lần đọc thử lại proxy, có thời hạn chờ và thử nguồn trực tiếp; không bỏ proxy vĩnh viễn sau một lỗi. Tab lỗi không làm mất các tab đọc được, có thông báo phần thiếu. Khi mọi nguồn cùng lỗi, giữ bản đọc thành công trước nếu có. |
| Production | Node/Worker/Pages Function phân biệt đúng hai workbook dù gid trùng; chỉ nhận các tab đã cấu hình, bỏ cache dữ liệu, giới hạn thời gian chờ. URL trực tiếp tải được dashboard, API/chunk không tồn tại trả lỗi thay vì HTML giả thành công. |

## Menu và phạm vi dữ liệu

| Nhóm | Menu đã kiểm tra | Quy tắc |
| --- | --- | --- |
| Cán bộ | Tổng quan, Theo 9 đơn vị, Tiến độ, Nhân sự, Kinh phí, Danh mục, Chất lượng | Các thống kê chi tiết cùng áp dụng bộ lọc toàn nhóm. Bấm thẻ đơn vị mở danh mục và giữ đơn vị/năm đang chọn. Bảng tổng hợp/đối chiếu toàn nguồn có ghi rõ phạm vi, không tự áp dụng bộ lọc chi tiết. |
| Người học | Tổng quan, Danh mục, Người học & hướng dẫn, Tiến độ, Kinh phí & sản phẩm, Chất lượng | Tổng chính thức và độ phủ hồ sơ áp dụng năm. Đơn vị/lớp/khóa/trạng thái/từ khóa chỉ lọc chi tiết, có chú thích ngay tại giao diện. |

Liên kết xem nguồn dùng đúng workbook, tab và dòng vật lý; không dùng STT vì STT lặp giữa các năm. CSV xuất toàn bộ kết quả đã lọc; cán bộ giữ thứ tự sắp xếp, không chỉ xuất trang đang xem. Nhóm nghiên cứu ngoài chín đơn vị hoặc năm chưa rõ vẫn được giữ trong thống kê. Các bảng top/danh sách ngắn phục vụ tổng quan có giới hạn trình bày; danh mục và CSV là nơi xem toàn bộ hồ sơ.

## Dữ liệu có động không?

**Có.** Dashboard đọc CSV thật khi mở lần đầu và khi bấm **Làm mới**. Không dùng bộ hồ sơ mẫu hoặc số lượng gắn cứng. Các nhóm năm 2027, 2028, 2029 xuất hiện trong biểu đồ/bộ lọc khi có hồ sơ tương ứng trong các tab hiện có; không cần sửa năm trong code. Bảng tổng hợp chỉ đúng nếu Sheet nguồn cũng cập nhật tổng/công thức tương ứng.

Trang đang mở **chưa tự thăm dò theo chu kỳ hoặc đồng bộ thời gian thực**. Chuyển menu trong cùng nhóm sử dụng bản dữ liệu đang giữ; xem giờ đọc trên giao diện và bấm Làm mới để đọc lại. Các lần đọc dùng `no-store`, nhưng ứng dụng vẫn phụ thuộc bản CSV mà Google trả về. Thêm workbook hoặc tab mới cần cập nhật cấu hình nguồn/proxy, không tự khám phá mọi tab.

## Kiểm chứng và giới hạn production

- `npm run check`: **53 kiểm thử qua**, TypeScript và Vite build thành công. Có kiểm tra năm mới, ngày thiếu, nguồn sai cấu trúc, nguồn lỗi một phần, các khoảng kinh phí, trùng mã, nhãn Unicode, phân trang/xuất CSV, Node HTTP và Cloudflare Worker/Pages Function.
- Đã chạy bản build bằng Node trên cổng 3197 và kiểm tra đủ 13 menu bằng trình duyệt; bộ lọc, mở danh mục từ thẻ đơn vị, năm chưa có hồ sơ, quay lại/tiến tới và làm mới hoạt động. Không thấy cảnh báo/lỗi JavaScript trong phiên kiểm tra này.
- Đã so sánh cả 8 CSV qua Node production với nguồn trực tiếp. Có SHA-256 và thời điểm trong báo cáo JSON. Những số này là ảnh chụp thời điểm kiểm tra, không là bộ dữ liệu cố định của website.
- Cloudflare được kiểm tra bằng mô phỏng request/ASSETS tại máy; chưa triển khai hay xác minh tên miền thực tế. Chưa kiểm tra tải đồng thời hoặc OAuth ở tên miền production vì chưa chốt nền tảng/tên miền.
- Build còn cảnh báo gói JavaScript chính khoảng 1,53 MB trước nén, 497 KB gzip. Đây là phần nên tối ưu tiếp khi đo tốc độ tải trên môi trường thực.
- `npm run lint` chạy thành công nhưng còn cảnh báo biến/import không sử dụng, phần lớn ở module Công bố. Không coi việc build qua là chứng nhận toàn bộ module Công bố, vì phạm vi đợt này là Đề tài KHCN.

**Quyền truy cập hiện tại:** khách chưa đăng nhập vẫn xem được Đề tài KHCN và xuất CSV; API Sheet không kiểm tra phiên đăng nhập và các workbook đang đọc công khai. Đăng nhập hiện chưa giới hạn dữ liệu/chức năng của hai nhóm đề tài. Nếu bản production cần dùng nội bộ, cần chốt và triển khai kiểm soát quyền ở máy chủ cùng quyền xem nguồn Sheet; ẩn nút trên giao diện không đủ.

Với các số tổng/cờ còn thiếu nêu trên, chưa nên công bố rằng dữ liệu đã khớp 100%. Mã nguồn đã có kiểm tra và thể hiện phần thiếu/chênh lệch; bước còn lại là chủ dữ liệu xác minh các dòng/công thức nguồn, chốt phạm vi người được xem, rồi kiểm tra trên nền tảng/tên miền sẽ sử dụng.

## Chạy lại kiểm tra khi Sheet thay đổi

```powershell
npm run check
npm run audit:data
```

Lệnh thứ hai chỉ đọc Sheet, ghi lại báo cáo tổng hợp JSON. Muốn kiểm tra đúng đường proxy của bản đã triển khai:

```powershell
npm run audit:data -- --base-url http://localhost:3000 --compare-direct
```

Có thể thay base URL bằng tên miền triển khai sau này. `mapping: PASS` nghĩa là bộ đọc và các trường đang kiểm tra khớp CSV; `sourceDataNeedsReview: true` nghĩa là dữ liệu nguồn vẫn cần đối chiếu. Lỗi tải hoặc sai ánh xạ trả mã thoát lỗi. Lệnh không sửa Sheet để ép hai bảng khớp nhau.

Node cần phiên bản 22.18+ và chạy từ project gốc bằng `npm run build` rồi `npm start`; giữ cả `server.js` và `src/config/sheets.ts` khi đóng gói server. Cloudflare Pages dùng lệnh build ở project gốc và output `dist`, có `_worker.js` đã được chép từ `public`.
