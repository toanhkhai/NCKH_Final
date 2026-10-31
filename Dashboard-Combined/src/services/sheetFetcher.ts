import { getSheetFetchUrls } from '../config/sheets';

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

let isProxyDisabled = false;

/**
 * Fetches raw CSV data for a specific sheet gid.
 * Dual-strategy:
 * 1. Tries local proxy (/api/sheet?gid=...) first (works on school server, Vite dev, Cloudflare Workers/Pages Functions)
 * 2. Falls back to direct Google Sheets export if proxy returns 404, HTML (SPA fallback), or network error.
 * Direct Google Sheets export has Access-Control-Allow-Origin: * so it works directly in all modern browsers.
 */
export async function fetchSheetCsv(gid: string): Promise<string> {
  const { proxyUrl, directUrl } = getSheetFetchUrls(gid);

  // Strategy 1: Proxy (only if not previously detected as unavailable/SPA fallback)
  if (!isProxyDisabled) {
    try {
      const res = await fetch(proxyUrl, {
        method: 'GET',
        cache: 'no-store',
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const text = await res.text();

        if (isValidCsv(text, contentType)) {
          return text;
        }

        console.warn(
          `Proxy for gid ${gid} returned HTML/invalid CSV (likely SPA fallback on static host). Disabling proxy and falling back to direct Google Sheets export.`
        );
        isProxyDisabled = true;
      } else {
        console.warn(`Proxy returned HTTP ${res.status} for gid ${gid}. Disabling proxy.`);
        isProxyDisabled = true;
      }
    } catch (proxyErr) {
      console.warn(`Proxy fetch failed for gid ${gid}, falling back to direct export:`, proxyErr);
      isProxyDisabled = true;
    }
  }

  // Strategy 2: Direct Google Export
  try {
    const res = await fetch(directUrl, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Google Sheets export returned HTTP ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (!isValidCsv(text, contentType)) {
      throw new Error(`Google Sheets export returned invalid data for gid ${gid}`);
    }

    return text;
  } catch (directErr: any) {
    throw new Error(`Failed to fetch sheet (gid: ${gid}): ${directErr?.message || directErr}`);
  }
}
