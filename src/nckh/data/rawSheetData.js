/**
 * ============================================================================
 * CTUMP GOOGLE SHEETS ENDPOINTS (GViz API)
 * ============================================================================
 * Endpoint truy vấn trực tiếp bảng tính Google Sheets bằng Google Visualization API
 * Tham số:
 * - tqx=out:csv : Trả về dữ liệu định dạng CSV thuần
 * - tq=SELECT * : Truy vấn 100% cột và dòng
 * - gid=...     : ID trang tính cụ thể của từng nguồn
 * ============================================================================
 */

// Nguồn 1 (source1): Bài báo Ngoài Trường (HĐGS) - Trong nước (GID: 1298748218)
export const DEFAULT_SHEET1_URL =
  'https://docs.google.com/spreadsheets/d/1Tg9evoX-lIykGi_F5z4FwXU2Hhy9af7UFGNz30f4lwo/gviz/tq?tqx=out:csv&tq=SELECT%20*&gid=1298748218';

// Nguồn 2 (source2): Danh mục NCKH Mở rộng & Quốc tế (Scopus/ISI) - Quốc tế (GID: 287019159)
export const DEFAULT_SHEET2_URL =
  'https://docs.google.com/spreadsheets/d/1T36gWiDQkD07cXwHUA82J4hfFWHEC9pj4VD-PwHNADo/gviz/tq?tqx=out:csv&tq=SELECT%20*&gid=287019159';

