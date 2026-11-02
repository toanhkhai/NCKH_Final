/**
 * ============================================================================
 * UTILITY: URL CONVERTER - GOOGLE SHEETS AUTO-DETECTION & MULTI-ENDPOINT SUPPORT
 * ============================================================================
 * Nhận diện và chuyển đổi BẤT KỲ link Google Sheets nào sang endpoint đọc CSV chuẩn 100%:
 * - Link chia sẻ: https://docs.google.com/spreadsheets/d/{ID}/edit?usp=sharing
 * - Link có gid: https://docs.google.com/spreadsheets/d/{ID}/edit#gid=123
 * - Link đa tài khoản: https://docs.google.com/spreadsheets/u/0/d/{ID}/edit...
 * - Link Google Drive: https://drive.google.com/file/d/{ID}/view... hoặc drive.google.com/open?id={ID}
 * - Link xuất bản web: https://docs.google.com/spreadsheets/d/e/{PUB_ID}/pub?output=csv hoặc pubhtml
 * - Link GViz: https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&tq=SELECT%20*&gid={GID}
 * - Chuỗi Spreadsheet ID trực tiếp
 * ============================================================================
 */

export function parseGoogleSheetUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isGoogleSheet: false,
      isPublished: false,
      spreadsheetId: null,
      pubId: null,
      gid: null,
      sheetName: null,
      primaryUrl: '',
      fallbackUrls: [],
    };
  }

  // Làm sạch chuỗi: loại bỏ khoảng trắng, dấu ngoặc kép thừa
  const trimmed = rawUrl.trim().replace(/^["']|["']$/g, '');

  // 1. Trích xuất gid nếu có trong URL (?gid=xxx hoặc #gid=xxx hoặc &gid=xxx)
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/i);
  const gid = gidMatch ? gidMatch[1] : null;

  // 2. Trích xuất sheet name nếu có (?sheet=xxx hoặc &sheet=xxx hoặc #sheet=xxx)
  const sheetMatch = trimmed.match(/[?&#]sheet=([^&#]+)/i);
  const sheetName = sheetMatch ? decodeURIComponent(sheetMatch[1].trim()) : null;

  // 3. Nhận diện dạng Google Sheets Xuất Bản Lên Web (/spreadsheets/d/e/{pubId}/...)
  const publishedMatch = trimmed.match(
    /docs\.google\.com\/spreadsheets\/(?:u\/\d+\/)?d\/e\/([a-zA-Z0-9_-]+)/i
  );
  if (publishedMatch) {
    const pubId = publishedMatch[1];
    const gidParam = gid ? `&gid=${gid}` : '';
    const pubCsvUrl = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv${gidParam}`;
    return {
      isGoogleSheet: true,
      isPublished: true,
      spreadsheetId: null,
      pubId,
      gid,
      sheetName,
      primaryUrl: pubCsvUrl,
      fallbackUrls: [
        `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`,
      ],
    };
  }

  // 4. Nhận diện dạng Google Sheets tiêu chuẩn (/spreadsheets/d/{ID} hoặc /spreadsheets/u/{N}/d/{ID})
  const standardMatch = trimmed.match(
    /docs\.google\.com\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i
  );

  // 5. Nhận diện link Google Drive chứa file Sheet (/drive.google.com/file/d/{ID} hoặc open?id={ID})
  const driveFileMatch = trimmed.match(
    /drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+))/i
  );

  let spreadsheetId = null;
  if (standardMatch) {
    spreadsheetId = standardMatch[1];
  } else if (driveFileMatch) {
    spreadsheetId = driveFileMatch[1] || driveFileMatch[2];
  } else if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    spreadsheetId = trimmed;
  }

  if (spreadsheetId) {
    // Xây dựng query GViz luôn đảm bảo tq=SELECT * và tqx=out:csv
    let gvizQuery = 'tqx=out:csv&tq=SELECT%20*';
    if (gid !== null) {
      gvizQuery += `&gid=${gid}`;
    } else if (sheetName) {
      gvizQuery += `&sheet=${encodeURIComponent(sheetName)}`;
    }

    const primaryGvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${gvizQuery}`;

    // Các URL dự phòng nếu URL chính gặp sự cố
    const fallbacks = [];

    if (gid !== null) {
      // Dự phòng 1: Thử query không có gid (lấy sheet mặc định)
      fallbacks.push(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&tq=SELECT%20*`
      );
      // Dự phòng 2: Thử gid=0 nếu gid gốc khác 0
      if (gid !== '0') {
        fallbacks.push(
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&tq=SELECT%20*&gid=0`
        );
      }
    } else {
      fallbacks.push(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&tq=SELECT%20*&gid=0`
      );
    }

    return {
      isGoogleSheet: true,
      isPublished: false,
      spreadsheetId,
      pubId: null,
      gid,
      sheetName,
      primaryUrl: primaryGvizUrl,
      fallbackUrls: fallbacks,
    };
  }

  return {
    isGoogleSheet: false,
    isPublished: false,
    spreadsheetId: null,
    pubId: null,
    gid,
    sheetName,
    primaryUrl: trimmed,
    fallbackUrls: [],
  };
}

