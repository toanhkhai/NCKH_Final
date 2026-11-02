import { useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { cleanDataset, validateSheetStructure, normalizeStr } from '../utils/cleanData.js';
import { parseGoogleSheetUrl } from '../utils/urlConverter.js';

/**
 * ============================================================================
 * CUSTOM HOOK: useGoogleSheet
 * ============================================================================
 * Nạp dữ liệu TRỰC TIẾP từ link Google Sheets:
 * - Đọc trực tiếp qua Google Visualization API (GViz CSV) với tq=SELECT *
 * - Chống Cache: Gắn tham số `&_nocache=${Date.now()}` và `{ cache: 'no-store' }`
 * - Tránh CORS preflight: KHÔNG dùng custom headers (Pragma/Cache-Control)
 * - Tự động dự phòng CORS Proxy nếu kết nối trực tiếp bị trình duyệt hạn chế
 * - Tự động dò tìm dòng Header (Header Row Detection) nếu bảng tính có banner
 * - Báo lỗi và hướng dẫn chi tiết nếu Sheet để ở chế độ Riêng tư (Private)
 * ============================================================================
 */
export function useGoogleSheet(sheetUrl, sourceType = 'source1') {
  const [data, setData] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const isMounted = useRef(true);

  // Hàm fetch nội dung từ URL chuẩn CORS (Simple GET request, no preflight)
  const fetchUrlText = async (targetUrl) => {
    const separator = targetUrl.includes('?') ? '&' : '?';
    const antiCacheUrl = `${targetUrl}${separator}_nocache=${Date.now()}`;

    try {
      const response = await fetch(antiCacheUrl, {
        method: 'GET',
        cache: 'no-store',
      });

      if (response.ok) {
        return await response.text();
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (directErr) {
      // Dự phòng bằng các CORS Proxy công khai nếu trình duyệt chặn cross-origin
      const fallbackProxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(antiCacheUrl)}`,
        `https://corsproxy.io/?url=${encodeURIComponent(antiCacheUrl)}`,
      ];

      for (const proxyUrl of fallbackProxies) {
        try {
          const proxyRes = await fetch(proxyUrl, { method: 'GET', cache: 'no-store' });
          if (proxyRes.ok) {
            const text = await proxyRes.text();
            if (text && text.trim().length > 0) {
              return text;
            }
          }
        } catch {
          // Thử proxy tiếp theo
        }
      }

      throw directErr;
    }
  };

  // Hàm phát hiện dòng Header thực sự nếu bảng tính có dòng tiêu đề banner ở đầu
  const extractHeadersAndRows = (rawRows) => {
    if (!rawRows || rawRows.length === 0) {
      return { headers: [], rows: [] };
    }

    // Tìm dòng có nhiều cột khớp từ khóa bảng tính khoa học nhất (trong 5 dòng đầu)
    let headerRowIdx = 0;
    let maxKeywordMatches = -1;

    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      const row = rawRows[i];
      if (!row || row.length <= 1) continue;

      let matches = 0;
      for (const cell of row) {
        const norm = normalizeStr(cell);
        if (
          norm.includes('ten bai') ||
          norm.includes('tieu de') ||
          norm.includes('title') ||
          norm.includes('tap chi') ||
          norm.includes('journal') ||
          norm.includes('diem') ||
          norm.includes('score') ||
          norm.includes('tac gia') ||
          norm.includes('author') ||
          norm.includes('minh chung') ||
          norm.includes('dau thoi gian') ||
          norm.includes('timestamp') ||
          norm.includes('danh muc') ||
          norm.includes('xep hang') ||
          norm === 'stt' ||
          norm === 'email'
        ) {
          matches++;
        }
      }

      if (matches > maxKeywordMatches && matches >= 2) {
        maxKeywordMatches = matches;
        headerRowIdx = i;
      }
    }

    const headerCells = rawRows[headerRowIdx] || [];
    const seenHeaders = new Set();
    const headers = headerCells.map((h, colIdx) => {
      let clean = (h || '').replace(/^\uFEFF/, '').trim() || `Cột_${colIdx + 1}`;
      let finalHeader = clean;
      let counter = 1;
      while (seenHeaders.has(finalHeader)) {
        finalHeader = `${clean} (${counter})`;
        counter++;
      }
      seenHeaders.add(finalHeader);
      return finalHeader;
    });

    const dataRows = rawRows.slice(headerRowIdx + 1);
    const rows = [];

    dataRows.forEach((rowValues) => {
      const hasContent = rowValues.some((v) => v && String(v).trim().length > 0);
      if (!hasContent) return;

      const record = {};
      headers.forEach((hdr, idx) => {
        record[hdr] = rowValues[idx] !== undefined ? rowValues[idx] : '';
      });
      rows.push(record);
    });

    return { headers, rows };
  };

  // Hàm nạp và xử lý dữ liệu trực tiếp từ Google Sheets
  const fetchData = useCallback(async () => {
    if (!sheetUrl || !sheetUrl.trim()) {
      setData([]);
      setRawData([]);
      setLoading(false);
      setError('Chưa có liên kết Google Sheet. Vui lòng bấm vào Cấu hình (biểu tượng bánh răng) để dán link Google Sheet.');
      setWarning(null);
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const parsed = parseGoogleSheetUrl(sheetUrl);
      const urlsToTry = [parsed.primaryUrl, ...parsed.fallbackUrls].filter(Boolean);

      let csvText = '';
      let fetchSuccess = false;
      let lastFetchError = null;

      for (const targetUrl of urlsToTry) {
        try {
          csvText = await fetchUrlText(targetUrl);

          // Kiểm tra xem GViz có trả về thông báo lỗi JSON không
          if (csvText.includes('google.visualization.Query.setResponse')) {
            const match = csvText.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);
            if (match) {
              try {
                const resJson = JSON.parse(match[1]);
                if (resJson.status === 'error' && resJson.errors && resJson.errors.length > 0) {
                  const detail = resJson.errors
                    .map((e) => e.message || e.detailed_message || e.reason)
                    .join(', ');
                  throw new Error(`Google GViz: ${detail}`);
                }
              } catch (parseErr) {
                if (parseErr.message.startsWith('Google GViz:')) {
                  throw parseErr;
                }
              }
            }
          }

          // Kiểm tra nếu Google trả về trang HTML đăng nhập (Sheet để chế độ Private)
          const isHtml =
            csvText.includes('<!DOCTYPE html>') ||
            csvText.includes('<html') ||
            csvText.includes('accounts.google.com') ||
            csvText.includes('ServiceLogin');

          if (isHtml) {
            if (
              csvText.includes('accounts.google.com') ||
              csvText.includes('ServiceLogin') ||
              csvText.includes('Sign in') ||
              csvText.includes('quyền') ||
              csvText.includes('permission')
            ) {
              throw new Error(
                'Google Sheet này đang ở chế độ Riêng tư (Private). Vui lòng mở quyền: "Bất kỳ ai có đường liên kết đều có thể xem" (Chia sẻ -> Bất kỳ ai có liên kết -> Người xem).'
              );
            }
            throw new Error(
              'Đường link không trả về dữ liệu bảng tính (Google trả về trang HTML). Vui lòng kiểm tra quyền chia sẻ công khai.'
            );
          }

          fetchSuccess = true;
          break;
        } catch (err) {
          lastFetchError = err;
          if (err.message.includes('Riêng tư')) {
            throw err;
          }
        }
      }

      if (!fetchSuccess) {
        throw lastFetchError || new Error('Không thể kết nối hoặc đọc dữ liệu từ Google Sheet này.');
      }

      // 3. Phân tích chuỗi CSV bằng PapaParse
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        quoteChar: '"',
        escapeChar: '"',
        complete: (results) => {
          if (!isMounted.current) return;
          const rawRows = results.data || [];

          if (rawRows.length === 0) {
            setError('Bảng tính Google Sheet rỗng hoặc không chứa dòng dữ liệu nào.');
            setData([]);
            setRawData([]);
            setLoading(false);
            return;
          }

          // Tự động tìm dòng header chính xác và chuyển thành các bản ghi object
          const { headers, rows } = extractHeadersAndRows(rawRows);

          if (rows.length === 0 || headers.length === 0) {
            setError('Bảng tính không có dữ liệu hàng nào sau khi xử lý dòng tiêu đề.');
            setData([]);
            setRawData([]);
            setLoading(false);
            return;
          }

          // Xác thực và đối chiếu cấu trúc cột với cấu trúc chuẩn CTUMP
          const validation = validateSheetStructure(headers, sourceType);

          // Nạp dữ liệu trực tiếp từ Google Sheet
          setRawData(rows);
          const cleaned = cleanDataset(rows, sourceType);
          setData(cleaned);
          setLastUpdated(new Date());
          setLoading(false);
          setError(null);

          if (!validation.isStandardCtump) {
            setWarning(
              `Đã đọc thành công ${rows.length} dòng từ Google Sheet (${headers.length} cột). Tự động nhận diện dữ liệu.`
            );
          } else {
            setWarning(null);
          }
        },
        error: (parseErr) => {
          if (!isMounted.current) return;
          console.error('PapaParse error:', parseErr);
          setError(`Lỗi đọc CSV: ${parseErr.message}`);
          setData([]);
          setRawData([]);
          setLoading(false);
        },
      });
    } catch (err) {
      if (!isMounted.current) return;
      setError(`Không thể kết nối đến Google Sheet: ${err.message}`);
      setData([]);
      setRawData([]);
      setLoading(false);
    }
  }, [sheetUrl, sourceType]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return {
    data,
    rawData,
    loading,
    error,
    warning,
    lastUpdated,
    refetch: fetchData,
  };
}
