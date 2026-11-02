import { getSheetFetchUrls } from '../config/sheets.ts';

/**
 * Check if the response body is an HTML page (e.g. 404/SPA index.html fallback)
 * rather than an actual CSV export from Google Sheets.
 */
function isHtmlResponse(text: string, contentType: string | null): boolean {
  if (contentType && contentType.toLowerCase().includes('text/html')) {
    return true;
  }
  const trimmed = text.trim();
  return (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<script') ||
    trimmed.includes('<div id="root">') ||
    trimmed.includes('</head>')
  );
}

/**
 * Validates if the text looks like valid spreadsheet CSV data.
 */
function isValidCsv(text: string, contentType: string | null): boolean {
  if (isHtmlResponse(text, contentType)) {
    return false;
  }
  const trimmed = text.trim();
  return (
    trimmed.includes('BẢNG THỐNG KÊ') ||
    trimmed.includes('Tổng số đề tài') ||
    trimmed.includes('TỔNG HỢP') ||
    trimmed.includes('Khoa Y') ||
    trimmed.includes('STT') ||
    trimmed.includes('CẤP TRƯỜNG') ||
    trimmed.includes('Cấp Trường') ||
    (trimmed.includes(',') && !trimmed.includes('</'))
  );
}

/** Read fresh CSV on every load/refresh. A failed proxy is retried on the next request. */
export async function fetchSheetCsv(gid: string, { timeoutMs = 20000 }: { timeoutMs?: number } = {}): Promise<string> {
  const { proxyUrl, directUrl } = getSheetFetchUrls(gid);
  const failures: string[] = [];
  for (const url of [proxyUrl, directUrl]) {
    try {
      const response = await fetch(url, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      if (!isValidCsv(body, response.headers.get('content-type'))) throw new Error('Nguồn không trả về CSV hợp lệ');
      return body;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`Không đọc được Sheet ${gid}: ${failures.join('; ')}`);
}
