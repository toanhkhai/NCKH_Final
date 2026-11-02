# Điều hướng bằng URL không có dấu #

## Vì sao trước đây có /#/

`src/App.tsx` trước đây đọc `window.location.hash`, ghi lại `location.hash` khi bấm menu và nghe `hashchange`. Đó là hash routing tự viết. Với URL `/#/projects/staff/projects`, trình duyệt chỉ gửi đường dẫn `/` tới server; phần `#/projects/staff/projects` được JavaScript đọc sau khi trang tải xong. Đây là cách tránh 404 trên hosting tĩnh không hỗ trợ đường dẫn con; không phải yêu cầu của React hay của API.

API dữ liệu thực tế là `/api/sheet?gid=...`, `/api/sheet?dataset=learners&gid=...` và `/api/health`.

## Cách hoạt động hiện tại

- Các URL mới: `/projects/staff/projects`, `/projects/learners/overview`, `/publications/lookup`.
- `src/routing.ts` đọc pathname, kiểm tra các view được phép, chuẩn hóa các alias và nhận các bookmark hash cũ.
- Điều hướng menu gọi `history.pushState` rồi cập nhật React trực tiếp; Back/Forward được xử lý bằng `popstate`. `pushState` không tự phát `popstate`.
- Khi mở link cũ `/#/projects/staff/projects`, ứng dụng dùng `replaceState` để đổi ngay thành `/projects/staff/projects`, giữ query string và không thêm bước lịch sử thừa.
- Các fragment thông thường như `#top` và link Google Sheets có `#gid=...` không bị đổi thành route của dashboard.

## Server cần phục vụ gì khi mở trực tiếp hoặc nhấn F5

Server phải trả `index.html` cho đường dẫn giao diện, sau đó React mở màn hình tương ứng. Các file JS/CSS/ảnh và API vẫn được xử lý theo chức năng riêng.

| Môi trường | Cấu hình trong project |
| --- | --- |
| Vite dev/preview | `appType` mặc định là `spa`, đã có SPA fallback |
| `npm start` | `server.js` đã có fallback về `dist/index.html` sau phần API |
| Cloudflare Pages | `_worker.js` xử lý GET/HEAD ở đường dẫn `/projects/...` và `/publications/...` bằng asset gốc `/`; các API và asset vẫn theo nhánh riêng |
| Hosting khác | Cấu hình rewrite nội bộ các đường dẫn giao diện về `index.html`; kiểm tra mở link con và tải lại trước khi triển khai |

Không dùng HTTP redirect mọi đường dẫn về `/`, vì thao tác đó làm mất đường dẫn màn hình người dùng đang mở. Không rewrite API sang HTML.

Đổi phần path không đổi `window.location.origin` (giao thức, hostname, cổng), nên danh sách Authorized JavaScript origins của Google vẫn kiểm tra cùng origin.

## Kết quả kiểm tra

- `npm run check`: 22 kiểm thử đạt, TypeScript và build thành công.
- Trình duyệt: mở trực tiếp `/projects/staff/projects`; bấm menu sang Nhân sự; Back/Forward trả đúng màn hình và URL; bookmark `/#/projects/learners/overview` chuyển sang URL mới và tải lại đúng màn hình; mở trực tiếp `/publications/lookup` thành công.
- Node production server: GET/HEAD các đường dẫn cán bộ, người học và công bố trả 200 với SPA shell; không redirect mất đường dẫn. `/api/health` trả JSON, yêu cầu Sheet sai gid trả 400, file JS vẫn trả đúng Content-Type.
- Cloudflare: kiểm thử `_worker.js` với binding ASSETS giả lập, xác nhận rewrite GET/HEAD của giao diện và giữ riêng API/asset. Chưa triển khai hoặc kiểm tra trên tên miền Cloudflare thực tế.

## Tài liệu chính thức đã đối chiếu ngày 02/11/2026

- [MDN: URI fragment](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment)
- [MDN: Working with the History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API)
- [MDN: popstate](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)
- [Vite: appType và SPA fallback](https://vite.dev/config/shared-options#apptype)
- [Cloudflare Pages: Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [Cloudflare Pages: Advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/)
