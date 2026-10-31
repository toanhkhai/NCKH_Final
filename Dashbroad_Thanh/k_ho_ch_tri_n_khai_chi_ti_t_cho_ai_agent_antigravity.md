# KẾ HOẠCH TRIỂN KHAI DASHBOARD THỐNG KÊ ĐỀ TÀI KHCN (React + Google Sheets)

> **Quyết định đã chốt:** Tab 6 = HTQT · Năm tính theo đúng sheet · Công khai · Chạy trên server của trường (xem mục 3 và 10).

> Nguồn dữ liệu: file Google Sheets `Template Báo cáo đề tài GV (hiển thị)` (ID `1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg`), giai đoạn 2021–2030, đơn vị: Trường ĐH Y Dược Cần Thơ (ĐHYDCT).
> Yêu cầu cốt lõi: **mỗi lần load/refresh trang, web đọc lại dữ liệu mới nhất trực tiếp từ các sheet** (không cần realtime push).

---

## 1. KẾT QUẢ PHÂN TÍCH 6 SHEET

Đã đọc thật cả 6 tab bằng endpoint `export?format=csv&gid=…` (không cần đăng nhập → file đang để chế độ "Anyone with the link can view").

| # | gid | Tab (suy ra từ nội dung) | Vai trò | Dữ liệu hiện tại |
|---|-----|--------------------------|---------|------------------|
| 1 | `844694624` | **TỔNG HỢP – Số tự động** | Bảng tổng hợp theo năm × cấp (công thức tự tính từ các tab còn lại) | Có số liệu |
| 2 | `1326842216` | **Cấp Trường** | Bảng chi tiết từng đề tài (nguồn dữ liệu gốc chính) | ~705 đề tài (2021–2026) |
| 3 | `80327175` | **Cấp Tỉnh** | Cùng cấu trúc, có thêm cột "Nơi giao" + "Mô tả tác động" | Trống (chỉ có hàng tổng = 0) |
| 4 | `1053013808` | **Cấp Bộ** | Như trên | Trống |
| 5 | `660559511` | **Cấp Quốc gia** | Như trên | Trống |
| 6 | `603726587` | **Hợp tác quốc tế (HTQT)** *(giả định)* | Tiêu đề ô vẫn ghi "Cấp Quốc gia" (copy từ tab 5) nhưng Tab 1 có dòng `HTQT` → gần như chắc chắn là tab HTQT | Trống |

### 1.1 Tab 1 – TỔNG HỢP (gid 844694624)
- Header ở **dòng 15**, mỗi năm chiếm khối **7 dòng**: `CẤP TRƯỜNG / CẤP TỈNH / CẤP BỘ / CẤP QUỐC GIA / HTQT` + 2 dòng trống. Dòng đầu là khối `2021-2030` (tổng cộng).
- Cột: `Tên đề tài (cấp)`, `Tổng số đề tài đã giao`, **9 đơn vị** (Khoa Y, Khoa Dược, Khoa RHM, Khoa YHCT, Khoa YTCC, Khoa KHCB, Khoa ĐD-KTYH, Bệnh viện, Phòng/TT/Thư viện), `Tổng số đã nghiệm thu theo năm giao`, `Tổng số nghiệm thu theo năm thống kê`, `Kinh phí (Triệu đồng)`.
- Số liệu đã **đối chiếu chéo đúng 100%**:

| Năm | Đã giao | Nghiệm thu (theo năm giao) | Nghiệm thu (theo năm TK) | Kinh phí (triệu) |
|-----|--------:|---------------------------:|-------------------------:|-----------------:|
| 2021 | 134 | 84 | 1 | 1.658 |
| 2022 | 92 | 62 | 39 | 1.453 |
| 2023 | 117 | 68 | 52 | 1.686 |
| 2024 | 137 | 46 | 71 | 2.166 |
| 2025 | 172 | 11 | 77 | 2.755 |
| 2026 | 53 | 0 | 31 | 811 |
| **Σ** | **705** | **271** | **271** | **10.529** |

- Cấp Tỉnh/Bộ/QG/HTQT: toàn bộ = 0 → dashboard phải có **empty-state đẹp**, không được vỡ layout, và tự hiện ra khi sheet được nhập số liệu.

### 1.2 Tab 2 – Cấp Trường (gid 1326842216) – bảng dữ liệu gốc
- Tiêu đề nhóm ở dòng 14, **header thật ở dòng 15**, dữ liệu từ dòng 16.
- **Dòng 16 = TỔNG SỐ, dòng 17 = "2021"** … là các **dòng tổng hợp xen lẫn dữ liệu** (cột STT chứa *số lượng*, cột Tên chứa *năm*). Mỗi năm có 1 dòng subtotal rồi mới đến các đề tài (STT 1, 2, 3…).
- Nhóm cột (≈ 49 cột): 
  1. **Định danh**: STT, Tên đề tài, Mã số, Quyết định giao, Số hợp đồng
  2. **Thời gian**: Tháng/Năm bắt đầu, Tháng/Năm kết thúc, Gia hạn (0/1), Số tháng gia hạn, Tháng/năm gia hạn
  3. **Đơn vị giao đề tài** (9 nhóm như Tab 1)
  4. **Nhân sự**: Chủ nhiệm + MSCB + Đơn vị; Cán bộ tham gia 1…4 (mỗi người 3 cột). *Tab Tỉnh/Bộ/QG có tới **15 thành viên**.*
  5. **Hợp tác/tài trợ**: Có đơn vị tài trợ, Đơn vị tài trợ, Nơi thực hiện, Hợp tác DN/CSYT, Hợp tác quốc tế
  6. **Tài chính**: Kinh phí (triệu đồng), Trạng thái thanh lý hợp đồng
  7. **Nghiệm thu**: Đã nghiệm thu (0/1), Quyết định nghiệm thu, Link minh chứng, Ngày/Tháng/Năm nghiệm thu, **Xếp loại** (Xuất sắc/Tốt/Khá/Trung bình)
  8. **Ngưng/hủy**: Đề tài ngưng (0/1), Quyết định ngưng
  9. **Cập nhật**: Ngày cập nhật, Người cập nhật
- Ví dụ thực tế các tổng ở dòng 16: giao 705, gia hạn **149**, nghiệm thu **271**, ngưng/hủy **71**, có tài trợ 1, hợp tác DN/CSYT 1.

### 1.3 Tab 3–6 (Tỉnh / Bộ / QG / HTQT)
- Cấu trúc gần giống Tab 2 nhưng **khác bố cục cột** (thêm `Nơi giao đề tài`, `Mô tả thêm ý nghĩa/tác động kinh tế – xã hội`, thành viên tới 15 người, **không có** cột `Đơn vị giao đề tài` ở vị trí cũ).
- Chỉ có dòng tổng/năm (2021→2030) toàn số 0. File CSV ~250 dòng vì template đã kéo sẵn các khối năm.

---

## 2. CÁC "BẪY" DỮ LIỆU PHẢI XỬ LÝ (rất quan trọng)

| # | Vấn đề phát hiện | Cách xử lý trong code |
|---|------------------|------------------------|
| 1 | **Số kiểu VN**: `10.529`, `1.658` = *10 529 / 1 658* (dấu `.` là phân tách hàng nghìn). Kinh phí từng đề tài là số nguyên 5–66. | `parseVNNumber()`: bỏ `.` nghìn, đổi `,` → `.`. Test bằng chính 10.529 = Σ từng năm. |
| 2 | **Dòng tổng xen kẽ dòng dữ liệu** (TỔNG SỐ, 2021, 2022…) | Nhận diện: cột Tên khớp `/^(TỔNG SỐ|\d{4})/` hoặc `STT` không phải số thứ tự nhỏ → tách ra `summaryRows`, **không** đưa vào danh sách đề tài. Dùng chúng làm dữ liệu kiểm chứng (reconciliation). |
| 3 | **Tên cột trùng lặp** (`Đơn vị (thuộc Trường…)` lặp 5–16 lần, `MSCB tham gia n`) | Không dùng header làm key. Map theo **nhóm + vị trí**: duyệt cột từ "Chủ nhiệm", cứ 3 cột (Tên, MSCB, Đơn vị) = 1 người. |
| 4 | **Bố cục cột khác nhau giữa các tab** | Mỗi tab có `sheetConfig` (header row, danh sách alias tên cột). Resolve cột bằng **chuẩn hóa header** (bỏ dấu, lowercase) chứ không hard-code số cột. |
| 5 | Tháng dạng text có số 0 đầu: `"01"`, `"05"` | Ép `parseInt`; tạo `startDate`, `endDate`, `acceptDate` (Date). |
| 6 | Cờ 0/1 để trống (`""` thay vì 0) | `toBool("")=false`. |
| 7 | **Mâu thuẫn trạng thái**: một số đề tài (vd STT 30, 40, 44, 51, 52, 60) có *Quyết định nghiệm thu* nhưng cờ "Đã nghiệm thu" trống, chưa có ngày | Trạng thái riêng **"Có QĐ – chờ hoàn tất nghiệm thu"** + hiển thị trong tab *Chất lượng dữ liệu*. |
| 8 | Ô chứa **xuống dòng** trong ghi chú hủy (`"XIN HỦY đã ký…\n có file scan"`) | Dùng Papa Parse (hỗ trợ quoted multiline), không split theo `\n`. |
| 9 | Thành viên ngoài trường: tên dán kèm đơn vị (`"Nguyễn Hoàng Bảo Ngọc - Bệnh viện Đa Khoa…"`), SV/HVCH (`"… - Lớp Dược K45"`), MSCB trống/sai (`B004`, `E037`) | Chuẩn hóa: tách phần sau `-`/`–` thành `externalOrg`; khóa người = `MSCB` nếu có, nếu không `normalize(name)`. Gắn cờ `isExternal`, `isStudent`. |
| 10 | Đơn vị cá nhân lộn xộn (`TT GDYH và HLKNYK`, `Phòng TCNS`, `Văn phòng`, `Phòng KHCN`, `Phòng QLCLGD`) trong khi Tab 1 gộp thành `Phòng, trung tâm, thư viện` | `UNIT_GROUP_MAP` chuẩn hóa về 9 nhóm. Ghi nhận đơn vị lạ vào log để người dùng bổ sung. |
| 11 | Đề tài **hủy** vẫn có thể chưa có ngày/quyết định hợp lệ; ghi chú hủy theo nhiều mẫu (`Hủy QĐ 2781…`, `XIN HỦY…`, `Đã huỷ…`) | Cờ `stopped=1` là chuẩn. Trích `stopDecision` & `stopDate` (regex ngày) dùng để vẽ biểu đồ "đợt hủy hàng loạt" (QĐ 2781 ngày 04/9/2024, QĐ 3964 ngày 10/9/2024 là 2 đợt lớn). |
| 12 | Kinh phí dạng "Triệu đồng" | Hiển thị `X triệu` / `X,XX tỷ` bằng `Intl.NumberFormat('vi-VN')`. |
| 13 | Tab 6 ghi nhãn "Cấp Quốc gia" trùng Tab 5 | Cấu hình thủ công `level: 'HTQT'` theo gid, **không** tin nhãn trong sheet. Hiện cảnh báo dev nếu hai tab nhãn trùng. |

---

## 3. KIẾN TRÚC ĐỌC DỮ LIỆU "MỖI LẦN LOAD LÀ MỚI NHẤT"

```
Browser (React SPA)
   │  mỗi lần mount/refresh → fetch 6 CSV song song (cache:'no-store' + ?_=Date.now())
   ▼
Google Sheets  export?format=csv&gid=…   ← luôn là bản hiện tại của sheet
```

**Quyết định kỹ thuật**

1. **Dùng `export?format=csv&gid=…`** (đã kiểm chứng đọc được) thay vì "Publish to web" (bản publish bị cache ~5 phút, không đảm bảo mới nhất).
2. **CORS**: response cuối cùng của export có `Access-Control-Allow-Origin: *` ⇒ fetch trực tiếp từ browser khả thi. Tuy nhiên bước redirect (307 → `googleusercontent.com`) cần **kiểm thử thật trên trình duyệt** (Phase 0).
3. **Proxy (nên là phương án chính trên server trường)**: một proxy mỏng `/api/sheet?gid=…` (Nginx `proxy_pass` hoặc Node/Express nhỏ, ~20 dòng) gọi export CSV phía server rồi trả về với header `Cache-Control: no-store`. Frontend ưu tiên proxy cùng origin, *fallback direct* nếu cần. Proxy còn giúp giấu ID sheet khỏi client.
4. **Không cần realtime**: chỉ fetch khi load trang + nút **"Làm mới dữ liệu"** + hiển thị `Cập nhật lúc HH:mm:ss` + dùng `lastUpdated` lớn nhất trong cột "Ngày cập nhật" của sheet.
5. **Hiệu năng**: 6 request song song; tab trống rất nhẹ, Tab 2 ≈ 330 KB (gzip còn rất nhỏ). Parse bằng **Web Worker** (Papa Parse `worker:true`) để UI không giật.
6. **Độ bền**: TanStack Query (`staleTime: 0`, `refetchOnWindowFocus: true`, retry 2 lần), có skeleton loading, trạng thái lỗi từng tab (một tab lỗi vẫn hiện được các tab còn lại), giữ bản dữ liệu cuối cùng trong `sessionStorage` làm "dữ liệu tạm" khi mất mạng (kèm banner "đang hiển thị dữ liệu cũ lúc …").

> [!IMPORTANT]
> **Đã chốt: dashboard công khai, triển khai trên server của trường.** Proxy `/api/sheet` chạy trên chính server trường (Nginx `proxy_pass` tới export CSV, hoặc một Node/Express nhỏ) — không dùng Vercel/Netlify. Cùng origin với web nên không còn vấn đề CORS và giấu được ID sheet khỏi client.
> Vì công khai và dữ liệu có **họ tên + MSCB cán bộ**: mặc định **ẩn/che MSCB** ở giao diện (chỉ dùng nội bộ để định danh người), có biến cấu hình `VITE_SHOW_STAFF_ID=false`. Tên cán bộ vẫn hiển thị trừ khi trường yêu cầu ẩn.

---

## 4. CÔNG NGHỆ ĐỀ XUẤT

| Lớp | Lựa chọn | Lý do |
|-----|----------|-------|
| Build | **Vite + React 18 + TypeScript** | Nhanh, type-safe cho mô hình dữ liệu phức tạp |
| Fetch/cache | **@tanstack/react-query** | Retry, trạng thái loading/error, refetch khi focus |
| Parse CSV | **papaparse** (+ worker) | Xử lý multiline/quoted chuẩn |
| Bảng | **@tanstack/react-table** + `@tanstack/react-virtual` | Lọc/sắp xếp/phân trang 700+ dòng mượt |
| Biểu đồ | **Apache ECharts** (`echarts-for-react`) | Có heatmap, sankey, treemap, sunburst, radar, gauge – Recharts không đủ |
| Routing | react-router v6 | Mỗi chế độ xem một URL, chia sẻ được link kèm bộ lọc (query string) |
| State bộ lọc | Zustand + đồng bộ URL | Lọc toàn cục dùng chung mọi trang |
| Style | **CSS thuần (CSS Modules + biến CSS)**, dark/light | Theo chuẩn thiết kế đã thống nhất, không phụ thuộc Tailwind |
| Font/Icon | Inter / Be Vietnam Pro (hỗ trợ tiếng Việt tốt), lucide-react | |
| Test | Vitest + React Testing Library + Playwright | |
| Deploy | Server trường: static build (Nginx/IIS/Apache) + proxy `/api/sheet` | |

---

## 5. MÔ HÌNH DỮ LIỆU CHUẨN HÓA

```ts
type Level = 'TRUONG' | 'TINH' | 'BO' | 'QUOC_GIA' | 'HTQT';
type Status = 'DANG_THUC_HIEN' | 'QUA_HAN' | 'CHO_NGHIEM_THU' | 'DA_NGHIEM_THU' | 'DA_HUY';
type Grade  = 'XUAT_SAC' | 'TOT' | 'KHA' | 'TRUNG_BINH' | null;

interface Project {
  id: string;                 // `${level}-${stt}`
  level: Level;
  stt: number;
  title: string;
  code?: string;              // Mã số đề tài
  assignDecision?: string;    // QĐ giao
  contractNo?: string;
  startDate: Date; endDate: Date;           // từ tháng/năm bắt đầu-kết thúc
  extended: boolean; extendMonths?: number; effectiveEndDate: Date;
  assigningUnit: UnitGroup;   // 9 nhóm chuẩn hóa
  members: Member[];          // [0] = chủ nhiệm (role:'PI')
  hasSponsor: boolean; sponsor?: string; place?: string;
  hasEnterprise: boolean; enterprise?: string;
  hasInternational: boolean; intlPartner?: string;
  budget: number;             // triệu đồng
  liquidated: boolean;
  accepted: boolean; acceptDecision?: string; acceptProofUrl?: string;
  acceptDate?: Date; grade: Grade;
  stopped: boolean; stopDecision?: string; stopDate?: Date;
  impactNote?: string;        // chỉ tab Tỉnh/Bộ/QG/HTQT
  updatedAt?: Date; updatedBy?: string;
  status: Status;             // DERIVED
  durationMonths: number;     // DERIVED
  delayMonths?: number;       // DERIVED (nghiệm thu muộn so với hạn)
  dq: DataQualityFlag[];      // cờ chất lượng dữ liệu
}
interface Member { name: string; staffId?: string; unit?: string; unitGroup?: UnitGroup;
                   role: 'PI'|'MEMBER'; isExternal: boolean; isStudent: boolean; }
```

**Trạng thái (derived) – thứ tự ưu tiên**
1. `stopped` → **Đã hủy/ngưng**
2. `accepted` → **Đã nghiệm thu**
3. có `acceptDecision` nhưng chưa `accepted` → **Chờ hoàn tất nghiệm thu**
4. `effectiveEndDate < hôm nay` → **Quá hạn**
5. còn lại → **Đang thực hiện**

**Hai lớp kiểm chứng (reconciliation) – chạy mỗi lần load**
- Tổng hợp *tự tính từ chi tiết* (đếm theo năm bắt đầu × đơn vị × cấp) **so sánh với Tab 1** và với các dòng subtotal của Tab 2. Lệch → hiện badge "Sai lệch dữ liệu" ở trang *Chất lượng dữ liệu* (vd. 705 / 271 / 10.529 / 149 / 71).
- Quy tắc **"năm giao" = năm bắt đầu** (khớp 134 đề tài 2021 ở Tab 1) — cần xác nhận lại bằng test với dữ liệu thật.

---

## 6. THIẾT KẾ GIAO DIỆN & TRỰC QUAN HÓA

Điều hướng sidebar (có bộ lọc toàn cục trên topbar: **Cấp**, **Năm giao**, **Đơn vị**, **Trạng thái**, ô tìm kiếm).

### Trang 1 — Tổng quan (Executive Overview)
- **KPI cards** (có đếm số chạy + sparkline theo năm): Tổng đề tài **705** · Đã nghiệm thu **271 (38,4%)** · Đang thực hiện · Quá hạn · Đã hủy **71** · Tổng kinh phí **10,5 tỷ** · Tỷ lệ gia hạn **149 (21%)**.
- **Biểu đồ cột chồng + đường**: số đề tài giao theo năm (stack theo đơn vị) + đường kinh phí (trục phải).
- **Donut trạng thái**, **Stacked bar xếp loại** (Xuất sắc/Tốt/Khá/TB) theo năm nghiệm thu.
- **Funnel vòng đời**: Giao → Đang thực hiện → Nghiệm thu → Thanh lý.
- Thẻ "Cấp Tỉnh / Bộ / Quốc gia / HTQT": hiển thị 0 kèm hướng dẫn *"Chưa có dữ liệu — cập nhật trong sheet 'Cấp Tỉnh'"* (tự sáng lên khi có số).

### Trang 2 — Theo đơn vị (9 khoa/đơn vị)
- **Heatmap Đơn vị × Năm** (số đề tài giao).
- **Bar ngang xếp hạng** hiệu suất: tỷ lệ nghiệm thu, tỷ lệ hủy, kinh phí bình quân/đề tài.
- **Radar** so sánh 2–3 đơn vị. Click vào đơn vị → mở **Drill-down panel** (danh sách đề tài + chủ nhiệm).
- Ghi chú đáng chú ý từ dữ liệu: Khoa Y 256 (36%), Bệnh viện 137, Phòng/TT 62 — hiển thị cơ cấu bằng **Treemap**.

### Trang 3 — Tiến độ & Nghiệm thu
- **Timeline/Gantt** các đề tài đang chạy (start→end→gia hạn), tô đỏ quá hạn, lọc theo đơn vị.
- Phân phối **thời lượng thực hiện** (10/12/15/30 tháng) và **độ trễ nghiệm thu** (histogram).
- So sánh "nghiệm thu theo năm giao" vs "theo năm thống kê" (dual bar) — phản ánh chính hai cột của Tab 1.
- Bảng **cảnh báo**: đề tài sắp đến hạn (≤ 60 ngày), quá hạn, chờ nghiệm thu.
- **Đợt hủy hàng loạt**: timeline các Quyết định hủy (QĐ 2781 – 04/9/2024; QĐ 3964 – 10/9/2024…) với số đề tài mỗi đợt.

### Trang 4 — Nhân sự nghiên cứu
- **Top chủ nhiệm / tham gia** (theo MSCB), số đề tài đang chủ trì (cảnh báo "chủ trì nhiều đề tài cùng lúc").
- **Network graph** hợp tác giữa các đơn vị (ECharts graph/chord: Khoa Y ↔ Khoa Dược ↔ Bệnh viện…) – dựa vào đơn vị của thành viên so với đơn vị giao.
- Tỷ lệ thành viên ngoài trường / sinh viên / học viên cao học.
- Trang hồ sơ cá nhân: các đề tài đã/đang tham gia.

### Trang 5 — Tài chính & Hợp tác
- Kinh phí theo năm/đơn vị/cấp; phân phối kinh phí (5–66 triệu); đề tài kinh phí cao nhất.
- Tình trạng **thanh lý hợp đồng** (đã/chưa) – danh sách đề tài đã nghiệm thu nhưng *chưa thanh lý* (cảnh báo tài chính).
- Hợp tác doanh nghiệp/CSYT, đơn vị tài trợ, hợp tác quốc tế (hiện rất ít – 1/705; hiển thị dạng bảng + empty-state).

### Trang 6 — Danh mục đề tài (bảng chi tiết)
- Bảng ảo hóa, sắp xếp/lọc đa cột, tìm theo tên/chủ nhiệm/MSCB, **xuất CSV/Excel** theo bộ lọc, drawer chi tiết (đủ 49 trường, link biên bản nghiệm thu mở tab mới).

### Trang 7 — Chất lượng dữ liệu (rất có giá trị cho người nhập liệu)
- Danh sách lỗi theo dòng sheet: thiếu MSCB, thiếu ngày nghiệm thu, có QĐ nhưng chưa tick nghiệm thu, đơn vị lạ, trùng tên, sai lệch tổng so với Tab 1.
- Mỗi lỗi có link nhảy thẳng tới ô trong Google Sheet (`…/edit#gid=…&range=A{row}`).

### Phong cách
- Dark mode mặc định + light mode; bảng màu HSL hài hòa (xanh y tế – teal/indigo, nhấn cam cho cảnh báo); glassmorphism nhẹ; micro-animation (đếm số, fade-in biểu đồ, hover tooltip); responsive desktop/tablet/mobile; hỗ trợ in/PDF báo cáo; toàn bộ chuỗi UI tiếng Việt, định dạng `vi-VN`.

---

## 7. CẤU TRÚC THƯ MỤC

```
/src
  /config        sheets.ts (gid ↔ level ↔ columnAliases), units.ts (UNIT_GROUP_MAP)
  /data
    fetchSheet.ts        # direct → proxy fallback, no-store
    parseCsv.worker.ts   # Papa Parse
    normalize/           # numbers.ts, dates.ts, members.ts, status.ts
    mapSheetToProjects.ts
    reconcile.ts         # đối chiếu với Tab 1
    selectors.ts         # tính KPI/aggregation (pure functions, có test)
  /store         filters.ts (Zustand ⇄ URL)
  /components    KpiCard, ChartCard, EmptyState, DataTable, FilterBar, Drawer…
  /pages         Overview, Units, Progress, People, Finance, Projects, DataQuality
  /styles        tokens.css, themes.css
/api/sheet.ts    # serverless proxy (fallback)
/tests           unit + e2e
```

---

## 8. LỘ TRÌNH TRIỂN KHAI (cho AI Agent thực thi tuần tự)

### Phase 0 — Spike kỹ thuật (≈ 0,5 ngày) ⚠️ làm đầu tiên
- [ ] Khởi tạo Vite + React + TS (`npx -y create-vite@latest ./ --template react-ts`, chạy `--help` trước).
- [ ] Viết thử `fetch` 6 URL export CSV **từ trình duyệt** (localhost) → xác nhận CORS qua redirect. Nếu lỗi → bật proxy fallback ngay.
- [ ] Xác nhận cache: sửa 1 ô trong sheet → F5 → dữ liệu mới có hiện không (đây là tiêu chí nghiệm thu chính).

### Phase 1 — Data layer (≈ 1,5 ngày)
- [ ] `sheets.ts` + `columnAliases`; `fetchSheet` (parallel, retry, no-store, cache-buster).
- [ ] Parser + normalizers (số VN, ngày, cờ 0/1, thành viên, đơn vị).
- [ ] Tách dòng tổng/dữ liệu; sinh `Project[]` + `summaryRows`.
- [ ] Derived fields: `status`, `durationMonths`, `delayMonths`, `dq[]`.
- [ ] `reconcile.ts` đối chiếu với Tab 1.
- [ ] **Unit test bằng fixture CSV thật** (lưu 6 file vào `/tests/fixtures`). Phải pass: 705 đề tài giao, 271 nghiệm thu, 10.529 kinh phí, phân bổ 9 đơn vị khớp từng năm.

### Phase 2 — Design system & khung ứng dụng (≈ 1 ngày)
- [ ] `tokens.css` (màu, spacing, typography, radius, shadow), dark/light, layout sidebar + topbar, FilterBar, skeleton, error boundary, EmptyState, nút Làm mới + "Cập nhật lúc …".

### Phase 3 — Trang Tổng quan + Danh mục (≈ 2 ngày)
- [ ] KPI cards, biểu đồ theo năm/trạng thái/xếp loại, funnel; bảng đề tài + drawer + export.

### Phase 4 — Đơn vị, Tiến độ, Nhân sự, Tài chính (≈ 3 ngày)
- [ ] Heatmap, treemap, radar, Gantt, histogram, network graph, bảng cảnh báo, hồ sơ cá nhân.

### Phase 5 — Chất lượng dữ liệu & dữ liệu chưa có (≈ 1 ngày)
- [ ] Trang DQ, link nhảy tới ô sheet, empty-state thông minh cho 4 cấp còn trống (tự hoạt động khi sheet có dữ liệu — **viết test với fixture giả lập có dữ liệu ở tab Tỉnh/Bộ** để chắc chắn mapping cột khác bố cục hoạt động).

### Phase 6 — Hoàn thiện & triển khai (≈ 1 ngày)
- [ ] Responsive, a11y (contrast, keyboard, aria cho biểu đồ), SEO meta, in PDF, tối ưu bundle (lazy-load ECharts theo trang), Lighthouse ≥ 90.
- [ ] Deploy lên server trường (build tĩnh + proxy `/api/sheet`, kiểm tra outbound tới Google), tạo README hướng dẫn: *cách đổi ID sheet, thêm gid, thêm đơn vị mới*.

---

## 9. TIÊU CHÍ NGHIỆM THU

1. Sửa dữ liệu trong Google Sheet → **F5 trang web → số liệu cập nhật đúng** (không cần deploy lại).
2. Tổng 705 / 271 / 71 / 149 / 10.529 triệu khớp Tab 1 & dòng TỔNG SỐ Tab 2; trang DQ báo "0 sai lệch" (hoặc liệt kê chính xác chỗ lệch).
3. 4 tab trống hiển thị empty-state; khi nhập 1 dòng thử vào tab Cấp Tỉnh → KPI/biểu đồ tự xuất hiện.
4. Một tab lỗi/mạng yếu không làm sập toàn trang.
5. Lần tải đầu < 3 s (mạng 4G), tương tác bộ lọc < 100 ms với 700+ đề tài.
6. Giao diện đạt chuẩn "premium": dark/light, animation mượt, tiếng Việt chuẩn, responsive.

---

## 10. RỦI RO & QUYẾT ĐỊNH ĐÃ CHỐT

| Rủi ro | Giảm thiểu |
|--------|------------|
| Chủ sheet đổi quyền chia sẻ / đổi cấu trúc cột | Resolve cột theo alias + cảnh báo DQ khi thiếu cột bắt buộc |
| Google giới hạn tần suất request | 6 request/lần load là rất thấp; proxy có thể cache 30–60 s; fallback dữ liệu cũ |
| Lộ thông tin cá nhân (công khai) | Mặc định che MSCB; tùy chọn ẩn tên (xem mục 3) |
| Server trường chặn truy cập ra ngoài tới `docs.google.com` | Kiểm tra firewall/DNS ở Phase 0; xin mở outbound HTTPS tới `docs.google.com` và `*.googleusercontent.com` |

**Quyết định đã chốt:**
1. Tab `603726587` = **HTQT** (cấu hình cứng `level: 'HTQT'` theo gid, bỏ qua nhãn "Cấp Quốc gia" trong ô).
2. **Năm giao / năm thống kê tính đúng như logic trong sheet**: đối chiếu với Tab 1 và các dòng subtotal của Tab 2 (khối năm 2021…2030, ví dụ 2021 = 134 đề tài) để tái tạo; phần "nghiệm thu theo năm giao" và "theo năm thống kê" là hai chỉ số riêng như Tab 1. Nếu tự tính lệch sheet → trang DQ báo lệch, **số trong sheet là chuẩn**.
3. **Công khai**, không cần đăng nhập.
4. **Triển khai trên server của trường** (Nginx/Node, static build + proxy `/api/sheet`).

**Còn mở (không chặn việc code):** cần xuất PDF/Excel theo mẫu phòng KHCN không? Hệ điều hành/web server của trường là gì (Nginx, IIS, Apache)? — để viết đúng cấu hình proxy ở Phase 6.
