/**
 * ============================================================================
 * CTUMP RESEARCH METRICS & AUDIT PORTAL - UNIVERSAL DATA PIPELINE
 * ============================================================================
 * Module chuẩn hóa dữ liệu từ MỌI link Google Sheets:
 * - Nhận diện cột siêu linh hoạt bằng Regex và từ khóa không dấu (Việt & Anh).
 * - Tự động tương thích với BẤT KỲ Google Sheet nào: bảng điểm CTUMP,
 *   bảng NCKH quốc tế, danh mục đề tài, hoặc bảng tính tùy biến.
 * - Trích xuất Điểm HĐGS, Tên tạp chí/Đơn vị, Tên bài báo/Đề tài, Tác giả,
 *   Năm/Ngày, Minh chứng Drive/URL trong MỌI cột.
 * - Bảo toàn 100% các cột gốc để người dùng có thể xem trọn vẹn chi tiết.
 * ============================================================================
 */

// Hàm xóa dấu tiếng Việt để so sánh chuỗi tiêu đề cột linh hoạt
export function normalizeStr(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const colKeyCache = new Map();

/**
 * Tìm tên cột trong đối tượng hàng dữ liệu khớp với danh sách từ khóa ứng viên
 * @param {Record<string, any>} row 
 * @param {string[]} candidates 
 * @param {string[]} [excludes=[]] Danh sách từ khóa cần loại trừ (để tránh nhầm lẫn)
 * @returns {string | undefined}
 */
export function findColKey(row, candidates, excludes = []) {
  if (!row || typeof row !== 'object') return undefined;
  const keys = Object.keys(row);
  const cacheKey = keys.join('|') + '###' + candidates.join('|') + '###' + excludes.join('|');

  if (colKeyCache.has(cacheKey)) {
    return colKeyCache.get(cacheKey);
  }

  // Lọc bỏ các key chứa từ khóa cấm
  const validKeys = keys.filter((k) => {
    const normK = normalizeStr(k);
    return !excludes.some((ex) => normK.includes(normalizeStr(ex)));
  });

  // Bước 1: Ưu tiên tìm khớp CHÍNH XÁC (tuyệt đối)
  for (const candidate of candidates) {
    const normCand = normalizeStr(candidate);
    const exactMatch = validKeys.find((k) => normalizeStr(k) === normCand);
    if (exactMatch) {
      colKeyCache.set(cacheKey, exactMatch);
      return exactMatch;
    }
  }

  // Bước 2: Nếu không khớp chính xác, mới tìm dạng chuỗi con (includes)
  for (const candidate of candidates) {
    const normCand = normalizeStr(candidate);
    const found = validKeys.find((k) => normalizeStr(k).includes(normCand));
    if (found) {
      colKeyCache.set(cacheKey, found);
      return found;
    }
  }

  colKeyCache.set(cacheKey, undefined);
  return undefined;
}

/**
 * Kiểm tra tính hợp lệ của cấu trúc cột CSV từ Google Sheets
 * Hỗ trợ ĐỌC MỌI GOOGLE SHEET:
 * - Không từ chối hay chặn bảng tính nếu thiếu cột cụ thể.
 * - Tự động phát hiện cấu trúc chuẩn CTUMP hay bảng tính tùy biến.
 * @param {string[]} headers Danh sách các tiêu đề cột từ PapaParse
 * @param {'source1' | 'source2'} sourceType Loại nguồn dữ liệu
 * @returns {{ isValid: boolean, isStandardCtump: boolean, missingCols: string[], message: string }}
 */
export function validateSheetStructure(headers, sourceType = 'source1') {
  if (!Array.isArray(headers) || headers.length === 0) {
    return {
      isValid: false,
      isStandardCtump: false,
      missingCols: ['Không có cột dữ liệu'],
      message: 'Bảng tính không có dữ liệu hoặc file không đúng định dạng CSV.',
    };
  }

  // Giả lập một object chứa tất cả các headers để tái sử dụng findColKey
  const headerRow = {};
  headers.forEach((h) => {
    if (h) headerRow[h] = true;
  });

  const missingCols = [];

  // Kiểm tra các cột cốt lõi NCKH CTUMP
  const hasTitle = Boolean(findColKey(headerRow, [
    'tên bài báo', 'tiêu đề', 'title', 'tên đề tài', 'tên bài', 'bài báo', 'tên công trình', 'công trình', 'tên', 'name'
  ]));
  if (!hasTitle) missingCols.push('Tên bài báo / Tiêu đề');

  const hasJournal = Boolean(findColKey(headerRow, [
    'tạp chí', 'journal', 'kỷ yếu', 'nơi công bố', 'nơi xuất bản', 'đơn vị', 'nguồn', 'source'
  ]));
  if (!hasJournal) missingCols.push('Tên tạp chí / Nơi công bố');

  if (sourceType === 'source1') {
    const hasScore = Boolean(findColKey(headerRow, ['số điểm', 'điểm của tạp chí', 'điểm', 'score', 'hdgs']));
    if (!hasScore) missingCols.push('Số điểm HĐGS');
  } else {
    const hasSource2Col = Boolean(
      findColKey(headerRow, [
        'xếp hạng chất lượng q', 'xếp hạng q', 'q-rank', 'chất lượng q', 'danh mục', 'chỉ số if', 'impact factor', 'họ và tên người nhập'
      ])
    );
    if (!hasSource2Col) missingCols.push('Phân hạng Q / Danh mục');
  }

  const isStandardCtump = missingCols.length === 0;

  // Luôn trả về isValid: true nếu bảng tính có ít nhất 1 cột hợp lệ (để đọc được TẤT CẢ Google Sheets)
  return {
    isValid: headers.length > 0,
    isStandardCtump,
    missingCols,
    message: isStandardCtump
      ? 'Cấu trúc danh mục NCKH chuẩn xác.'
      : `Bảng tính tùy biến (${headers.length} cột). Hệ thống tự động trích xuất thông tin phù hợp.`,
  };
}

/**
 * Bóc tách điểm số thực HĐGS bằng Regex /[0-9]+(\.[0-9]+)?/
 * Xử lý: "1 điểm" -> 1.0, "0.25 điểm" -> 0.25, "0,5" -> 0.5; nếu không có số hợp lệ gán = 0
 * @param {any} val 
 * @returns {{ score: number, display: string }}
 */
export function extractScore(val) {
  if (val === null || val === undefined) return { score: 0, display: '0' };
  const str = String(val).trim();
  if (!str) return { score: 0, display: '0' };

  // Thay dấu phẩy thập phân kiểu Việt Nam bằng dấu chấm trước khi áp dụng regex
  const normalizedStr = str.replace(/,/g, '.');
  const match = normalizedStr.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    // Điểm HĐGS công nhận hợp lệ tối đa theo quy định HĐGS nhà nước là 1.0 đến 2.5
    if (!isNaN(num) && num <= 2.5) {
      return { score: num, display: num.toString() };
    }
  }
  return { score: 0, display: '0' };
}

/**
 * Trích xuất Năm xuất bản (YYYY) và chuỗi ngày đầy đủ
 * Hỗ trợ các định dạng: DD/MM/YYYY, YYYY-MM-DD, hoặc năm 4 chữ số 20xx / 19xx
 * @param {any} val 
 * @returns {{ year: string, fullDate: string }}
 */
export function extractYear(val) {
  if (!val) return { year: 'Chưa rõ', fullDate: '' };
  const str = String(val).trim();

  // 1. Tìm năm 4 chữ số (19xx hoặc 20xx)
  const yearMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return { year: yearMatch[1], fullDate: str };
  }

  // 2. Tìm định dạng ngày phân cách dấu gạch (25/03/2024 hoặc 2024-03-25)
  const parts = str.split(/[/.-]/);
  if (parts.length >= 3) {
    const lastPart = parts[2].trim();
    if (lastPart.length === 4 && !isNaN(Number(lastPart))) {
      return { year: lastPart, fullDate: str };
    }
    const firstPart = parts[0].trim();
    if (firstPart.length === 4 && !isNaN(Number(firstPart))) {
      return { year: firstPart, fullDate: str };
    }
  }

  return { year: 'Khác', fullDate: str };
}

/**
 * Trích xuất danh sách link minh chứng hợp lệ (đặc biệt là link Google Drive, Web URL)
 * @param {any} val 
 * @returns {string[]}
 */
export function extractProofLinks(val) {
  if (!val) return [];
  const str = String(val);
  const urlRegex = /(https?:\/\/[^\s,;"<>]+)/g;
  const matches = str.match(urlRegex) || [];
  return Array.from(new Set(matches.map((url) => url.trim().replace(/[.,;)]+$/, ''))));
}

/**
 * Chuẩn hóa tên Tạp chí: Trim khoảng trắng, chuẩn hóa chữ hoa/thường,
 * thống nhất danh xưng để gom nhóm thống kê biểu đồ chính xác.
 * @param {any} rawName 
 * @returns {string}
 */
export function normalizeJournalName(rawName) {
  if (!rawName) return 'Chưa phân loại';
  let cleaned = String(rawName)
    .normalize('NFC') // Chuẩn hóa Unicode để tránh lỗi 2 chuỗi nhìn giống nhưng khác byte
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'Chưa phân loại';

  // Lấy chuỗi không dấu để kiểm tra linh hoạt hơn (tránh lỗi gõ sai dấu)
  const searchStr = normalizeStr(cleaned);

  // Thống nhất các tạp chí Y Dược phổ biến tại CTUMP
  if (searchStr.includes('y hoc viet nam') || searchStr === 'vietnam medical journal') {
    return 'Tạp chí Y học Việt Nam';
  }
  if (searchStr.includes('nghien cuu y hoc')) {
    return 'Tạp chí Nghiên cứu Y học';
  }
  if (searchStr.includes('y hoc cong dong') || searchStr.includes('community medicine')) {
    return 'Tạp chí Y học Cộng đồng';
  }
  if (searchStr.includes('y duoc hoc can tho')) {
    return 'Tạp chí Y Dược học Cần Thơ';
  }
  if (searchStr.includes('tim mach hoc')) {
    return 'Tạp chí Tim mạch học Việt Nam';
  }
  if (searchStr.includes('hong bang')) {
    return 'Tạp chí Khoa học ĐH Quốc tế Hồng Bàng';
  }
  if (searchStr.includes('dai hoc can tho')) {
    return 'Tạp chí Khoa học ĐH Cần Thơ';
  }
  if (searchStr.includes('giao duc va xa hoi')) {
    return 'Tạp chí Giáo dục và Xã hội';
  }
  if (searchStr.includes('y duoc hue')) {
    return 'Tạp chí Y Dược Huế';
  }
  if (searchStr.includes('y duoc hoc quan su')) {
    return 'Tạp chí Y Dược học Quân sự';
  }
  if (searchStr.includes('dieu duong')) {
    return 'Tạp chí Khoa học Điều dưỡng';
  }

  // Viết hoa chữ cái đầu
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Tách danh sách tác giả từ chuỗi bằng dấu phẩy `,` hoặc chấm phẩy `;` hoặc xuống dòng
 * Đồng thời loại bỏ số chỉ số footnote, dấu sao (*)
 * @param {any} val 
 * @returns {string[]}
 */
export function parseAuthors(val) {
  if (!val) return [];
  const str = String(val);
  return str
    .split(/[,;\n]/)
    .map((author) => {
      return author
        .replace(/[0-9*†‡§]+/g, '') // Xóa số chú thích footnote
        .replace(/^["'\s]+|["'\s]+$/g, '')
        .trim();
    })
    .filter((a) => a.length > 1);
}

/**
 * Làm sạch tên tác giả: loại bỏ học hàm, học vị, danh xưng (GS, PGS, TS, BS...), ký hiệu chú thích
 */
export function cleanAuthorName(str) {
  if (!str) return '';
  return String(str)
    // Loại bỏ nội dung trong ngoặc đơn, ngoặc vuông (ví dụ: (CTUMP), [Khoa Y]...)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    // Loại bỏ học hàm, học vị, danh xưng
    .replace(/\b(gs|pgs|ts|ths|bs|bscki|bsckii|cn|duoc si|ds|thac si|tien si|giao su)\b\.?/gi, ' ')
    // Loại bỏ mã sinh viên, mã số cán bộ đi kèm tên tài khoản (ví dụ B2204939, 2204939...)
    .replace(/\b[a-zA-Z]{0,2}\d{4,}\b/g, ' ')
    // Loại bỏ số và ký tự chú thích
    .replace(/[0-9*†‡§#\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chuẩn hóa chuỗi không dấu, chuyển chữ 'đ' thành 'd'
 */
export function normalizeNoAccent(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * So sánh xem hai tên tác giả có khớp nhau hay không:
 * 1. Khớp tuyệt đối có dấu (không phân biệt hoa thường)
 * 2. Khớp tuyệt đối không dấu (trường hợp Google Account không gõ dấu tiếng Việt)
 * 3. Khớp đảo thứ tự từ họ - tên (trường hợp Google Account hiển thị tên theo dạng First Name - Last Name)
 */
export function isNameMatch(searchName, targetName) {
  if (!searchName || !targetName) return false;

  const cleanSearch = cleanAuthorName(searchName);
  const cleanTarget = cleanAuthorName(targetName);
  if (!cleanSearch || !cleanTarget) return false;

  // 1. So khớp trực tiếp có dấu
  if (cleanSearch.toLowerCase() === cleanTarget.toLowerCase()) return true;

  // 2. So khớp không dấu
  const normSearch = normalizeNoAccent(cleanSearch);
  const normTarget = normalizeNoAccent(cleanTarget);
  if (normSearch === normTarget) return true;

  // 3. So khớp tập từ (xử lý đảo họ tên, vd: 'Hieu Phan Ly' vs 'Phan Ly Hieu')
  const wordsSearch = normSearch.split(' ').filter((w) => w.length > 0);
  const wordsTarget = normTarget.split(' ').filter((w) => w.length > 0);

  if (wordsSearch.length >= 2 && wordsSearch.length === wordsTarget.length) {
    const sortedSearch = [...wordsSearch].sort().join(' ');
    const sortedTarget = [...wordsTarget].sort().join(' ');
    if (sortedSearch === sortedTarget) return true;
  }

  return false;
}

/**
 * Tách chuỗi ô tác giả thành mảng các tên tác giả riêng biệt
 */
export function splitAuthors(cellValue) {
  if (!cellValue) return [];
  return String(cellValue)
    .split(/[,;\n\r]+/)
    .map((a) => cleanAuthorName(a))
    .filter((a) => a.length > 1);
}

/**
 * Kiểm tra xem tên tài khoản Google có khớp với các cột tác giả của bài báo:
 * - Đối với bài Trong nước (source1): So sánh với cột "Nhóm tác giả"
 * - Đối với bài Quốc tế (source2): So sánh với các cột:
 *     1. "Nhóm Tác giả là cán bộ Trường"
 *     2. "Tác giả liên hệ"
 *     3. "Đồng tác giả chính"
 *     (kèm kiểm tra bổ sung cột "Tác giả chính")
 */
export function isRecordAuthorMatch(record, userName) {
  if (!record || !userName) return false;
  const raw = record.rawRecord || {};
  const isSource1 = record.sourceType === 'source1';

  if (isSource1) {
    // 1. Trong nước: So sánh với cột "Nhóm tác giả"
    const authorColKey = findColKey(raw, [
      'nhóm tác giả (lưu ý nhập dùng dấu phẩy',
      'nhóm tác giả',
      'tập thể tác giả',
      'tất cả tác giả',
      'danh sách tác giả',
    ]);
    const authorStr = authorColKey && raw[authorColKey] ? raw[authorColKey] : '';
    const authors = splitAuthors(authorStr);

    const candidates = authors.length > 0 ? authors : (record.authors || []);
    return candidates.some((a) => isNameMatch(userName, a));
  } else {
    // 2. Quốc tế: So sánh với:
    // - "Nhóm Tác giả là cán bộ Trường"
    // - "Tác giả liên hệ"
    // - "Đồng tác giả chính"
    const cbKey = findColKey(raw, [
      'nhóm tác giả là cán bộ trường',
      'nhóm tác giả là cán bộ',
      'tác giả là cán bộ',
      'tác giả cán bộ',
      'cán bộ trường',
    ]);
    const cbAuthors = cbKey && raw[cbKey] ? splitAuthors(raw[cbKey]) : (record.ctumpAuthors || []);

    const lhKey = findColKey(raw, [
      'tác giả liên hệ',
      'corresponding',
      'người liên hệ',
    ]);
    const lhAuthors = lhKey && raw[lhKey] ? splitAuthors(raw[lhKey]) : (record.correspondingAuthor ? [record.correspondingAuthor] : []);

    const dtgcKey = findColKey(raw, [
      'đồng tác giả chính',
      'co-first',
      'equal author',
      'co first',
    ]);
    const dtgcAuthors = dtgcKey && raw[dtgcKey] ? splitAuthors(raw[dtgcKey]) : (record.coFirstAuthor ? [record.coFirstAuthor] : []);

    const tgcKey = findColKey(raw, [
      'tác giả chính (tác giả đầu tiên)',
      'tác giả chính',
    ]);
    const tgcAuthors = tgcKey && raw[tgcKey] ? splitAuthors(raw[tgcKey]) : (record.mainAuthor ? [record.mainAuthor] : []);

    const allCandidates = [...cbAuthors, ...lhAuthors, ...dtgcAuthors, ...tgcAuthors];
    return allCandidates.some((a) => isNameMatch(userName, a));
  }
}

/**
 * Chuẩn hóa một dòng dữ liệu thô từ BẤT KỲ Google Sheet nào thành bản ghi thống nhất
 * Tự động thích ứng thông minh với mọi tên cột!
 * @param {Record<string, any>} row 
 * @param {number} index 
 * @param {'source1' | 'source2'} [forcedSource]
 */
export function cleanRawRecord(row, index, forcedSource) {
  if (!row || typeof row !== 'object') {
    return {
      id: `rec-empty-${index}`,
      title: `Bản ghi #${index + 1}`,
      journal: '—',
      score: 0,
      scoreDisplay: '0',
      publishDate: '',
      publishYear: 'Chưa rõ',
      authors: [],
      authorCount: 0,
      correspondingAuthor: '—',
      proofLinks: [],
      rawRecord: {},
    };
  }

  const entries = Object.entries(row);

  // 1. Nhận diện nguồn dữ liệu
  const hasQRank = findColKey(row, ['chất lượng q', 'xếp hạng q', 'q-rank', 'ranking q']);
  const hasCategory = findColKey(row, ['danh mục', 'category', 'scopus', 'isi']);
  const isSource2 = forcedSource === 'source2' || (!forcedSource && (hasQRank || hasCategory || findColKey(row, ['họ và tên người nhập'])));
  const sourceType = isSource2 ? 'source2' : (forcedSource || 'source1');

  // 2. Tên bài báo / Tiêu đề / Tên đề tài: tìm theo danh sách từ khóa rộng
  const titleKey = findColKey(row, [
    'tên bài báo', 'tiêu đề', 'title', 'tên đề tài', 'tên bài', 'bài báo',
    'tên công trình', 'công trình', 'tên', 'name', 'đề tài', 'chủ đề', 'topic',
    'nội dung', 'content', 'mô tả', 'description', 'sản phẩm', 'nhiệm vụ'
  ]);

  let title = '';
  if (titleKey && row[titleKey]) {
    title = String(row[titleKey]).replace(/^["'\s]+|["'\s]+$/g, '').trim();
  }

  // Nếu không tìm thấy bằng từ khóa, chọn cột đầu tiên có chuỗi văn bản ý nghĩa
  if (!title) {
    const textEntry = entries.find(([k, v]) => {
      if (!v) return false;
      const str = String(v).trim();
      const normK = normalizeStr(k);
      // Bỏ qua cột STT, ID, ngày, link
      if (normK === 'stt' || normK === 'id' || normK === 'no' || normK.includes('link') || normK.includes('url')) return false;
      return str.length >= 3 && !/^\d+$/.test(str) && !str.startsWith('http');
    });
    if (textEntry) {
      title = String(textEntry[1]).trim();
    }
  }
  if (!title) {
    title = `Bản ghi #${index + 1}`;
  }

  // 3. Tên tạp chí / Nơi công bố / Đơn vị
  const journalKey = findColKey(row, [
    'tên tạp chí', 'tên tạp chí, kỷ yếu', 'tạp chí', 'journal', 'kỷ yếu',
    'nơi công bố', 'nơi xuất bản', 'đơn vị', 'nguồn', 'source', 'publisher',
    'khoa', 'phòng', 'bộ môn', 'chuyên ngành', 'danh mục', 'category', 'cơ quan', 'tổ chức'
  ]);
  let rawJournal = journalKey && row[journalKey] ? String(row[journalKey]) : '';

  // Nếu không tìm thấy, thử tìm cột thứ 2 có văn bản
  if (!rawJournal) {
    const secondTextEntry = entries.find(([k, v]) => {
      if (!v) return false;
      const str = String(v).trim();
      const normK = normalizeStr(k);
      if (k === titleKey || normK === 'stt' || normK === 'id' || normK.includes('link')) return false;
      return str.length >= 2 && !/^\d+$/.test(str) && !str.startsWith('http');
    });
    if (secondTextEntry) {
      rawJournal = String(secondTextEntry[1]).trim();
    }
  }
  const journal = rawJournal ? normalizeJournalName(rawJournal) : 'Chưa phân loại';

  // 4. Điểm HĐGS / Điểm số / Điểm
  // Chỉ tìm các cột đích thực là điểm HĐGS hoặc điểm tạp chí (tránh nhầm lẫn với cột IF hoặc PLVC)
  const scoreKey = findColKey(row, [
    'số điểm của tạp chí', 'số điểm', 'điểm của tạp chí', 'điểm tạp chí',
    'điểm hdgs', 'hội đồng giáo sư', 'thang điểm', 'score'
  ]);
  let { score, display: scoreDisplay } = scoreKey ? extractScore(row[scoreKey]) : { score: 0, display: '0' };

  // 5. Ngày xuất bản / Thời gian
  const dateCandidates = [
    'ngày, tháng, năm', 'ngày xuất bản', 'ngày công bố', 'ngày', 'date',
    'thời gian xuất bản', 'năm', 'year', 'năm xuất bản'
  ];
  // Explicitly avoid timestamp columns for the publish date
  const dateKey = dateCandidates.reduce((acc, candidate) => {
    if (acc) return acc;
    const found = findColKey(row, [candidate]);
    if (found && !normalizeStr(found).includes('dau thoi gian') && !normalizeStr(found).includes('timestamp')) {
      return found;
    }
    return undefined;
  }, undefined);

  const { year: publishYear, fullDate: publishDate } = dateKey ? extractYear(row[dateKey]) : { year: 'Chưa rõ', fullDate: '' };

  // 6. Nhóm tác giả / Danh sách tác giả / Người thực hiện
  // CHIẾN LƯỢC MỚI: Tách bạch rõ ràng 2 danh sách
  // 1. Lấy danh sách cán bộ trường (Tên chuẩn tiếng Việt)
  // Từ khóa phải thật chính xác để tránh nhận nhầm cột "Cơ quan cán bộ", "SĐT cán bộ" ở sheet Trong nước
  const ctumpAuthorKey = findColKey(row, ['tác giả là cán bộ', 'tác giả cán bộ', 'nhóm tác giả cán bộ', 'cán bộ trường', 'tác giả thuộc trường', 'tác giả trong trường']);
  let ctumpAuthors = [];
  if (ctumpAuthorKey && row[ctumpAuthorKey]) {
    ctumpAuthors = parseAuthors(row[ctumpAuthorKey]);
  }

  // 2. Lấy danh sách TOÀN BỘ tác giả (Dùng để hiển thị)
  let authors = [];
  const authorKeywords = [
    'tất cả tác giả', 'tập thể tác giả', 'danh sách tác giả', 'nhóm tác giả',
    'tác giả', 'authors', 'author', 'họ và tên', 'họ tên',
    'người thực hiện', 'chủ nhiệm', 'thành viên'
  ];
  const excludeAuthorKeywords = ['chính', 'liên hệ', 'đứng đầu', 'chịu trách nhiệm', 'corresponding', 'first', 'người nhập', 'cán bộ', 'thuộc trường'];

  Object.keys(row).forEach(k => {
    const normK = normalizeStr(k);
    const isMatch = authorKeywords.some(kw => normK.includes(normalizeStr(kw)));
    const isExcluded = excludeAuthorKeywords.some(ex => normK.includes(normalizeStr(ex)));
    if (isMatch && !isExcluded) {
      authors = [...authors, ...parseAuthors(row[k])];
    }
  });

  // Chỉ đổ cán bộ trường vào authors nếu authors đang rỗng (để phòng hờ sheet không có cột "tất cả tác giả")
  if (authors.length === 0 && ctumpAuthors.length > 0) {
    authors = [...ctumpAuthors];
  }

  // 7. Tác giả liên hệ / Chủ trì
  const correspondingKey = findColKey(row, [
    'tác giả liên hệ', 'corresponding', 'tác giả chịu trách nhiệm',
    'chủ nhiệm', 'chủ trì', 'người liên hệ', 'người phụ trách'
  ]);
  let correspondingAuthor = correspondingKey && row[correspondingKey] ? String(row[correspondingKey]).trim() : '';
  correspondingAuthor = correspondingAuthor.replace(/[0-9*†‡§]+/g, '').replace(/^["'\s]+|["'\s]+$/g, '').trim();

  // Nếu chưa có tác giả liên hệ rõ ràng, lấy tác giả đầu tiên trong danh sách
  if (!correspondingAuthor && authors.length > 0) {
    correspondingAuthor = authors[0];
  }

  // 7.5. Tác giả chính
  const mainAuthorKey = findColKey(row, [
    'tác giả chính (tác giả đầu tiên)', 'tác giả chính', 'main author', 'first author', 'tác giả đứng đầu'
  ]);
  let mainAuthor = mainAuthorKey && row[mainAuthorKey] ? String(row[mainAuthorKey]).trim() : '';
  mainAuthor = mainAuthor.replace(/[0-9*†‡§]+/g, '').replace(/^["'\s]+|["'\s]+$/g, '').trim();

  // 7.6. Đồng tác giả chính (Co-First / Equal Author)
  const coFirstAuthorKey = findColKey(row, [
    'đồng tác giả chính', 'co-first', 'equal author', 'co first author'
  ]);
  let coFirstAuthor = coFirstAuthorKey && row[coFirstAuthorKey] ? String(row[coFirstAuthorKey]).trim() : '';
  coFirstAuthor = coFirstAuthor.replace(/[0-9*†‡§]+/g, '').replace(/^["'\s]+|["'\s]+$/g, '').trim();

  // Bổ sung: Rất nhiều trường hợp Google Sheet ghi người ở cột "Tác giả chính" / "Liên hệ" 
  // nhưng lại quên ghi họ vào cột "Danh sách tất cả tác giả". Cần gộp họ vào mảng authors.
  if (mainAuthor) {
    const pMain = parseAuthors(mainAuthor);
    authors = [...authors, ...pMain];
  }
  if (correspondingAuthor) {
    const pCorr = parseAuthors(correspondingAuthor);
    authors = [...authors, ...pCorr];
  }
  // Lọc trùng lặp lần cuối để đảm bảo một người không bị đếm 2 lần
  authors = Array.from(new Set(authors));
  ctumpAuthors = Array.from(new Set(ctumpAuthors));
  const authorCount = authors.length || 1;

  // 8. Minh chứng & Link URL:
  // Quét cả cột minh chứng VÀ quét toàn bộ các cột trong hàng để tìm bất kỳ link URL nào (Google Drive, Dropbox, DOI, v.v.)
  const proofKey = findColKey(row, [
    'minh chứng', 'tải file minh chứng', 'drive.google.com', 'proof', 'link file',
    'link', 'url', 'liên kết', 'tài liệu', 'file minh chứng', 'file', 'đường dẫn'
  ]);
  let proofLinks = proofKey ? extractProofLinks(row[proofKey]) : [];

  // Quét bổ sung toàn bộ hàng để không bỏ sót bất kỳ link nào
  entries.forEach(([_, val]) => {
    if (val && typeof val === 'string' && val.includes('http')) {
      const foundUrls = extractProofLinks(val);
      foundUrls.forEach((u) => {
        if (!proofLinks.includes(u)) proofLinks.push(u);
      });
    }
  });

  // 9. Tập, số, trang
  const volumeKey = findColKey(row, ['tập, số, trang', 'tập (số), trang', 'volume', 'issue', 'page', 'số trang']);
  const volumeIssuePage = volumeKey && row[volumeKey] ? String(row[volumeKey]).trim() : '';

  // 10. Mã ISSN / ISBN
  const issnKey = findColKey(row, ['issn', 'isbn']);
  const issn = issnKey && row[issnKey] ? String(row[issnKey]).trim() : '';

  // 11. Thông tin mở rộng: Q-Rank, Category, IF, DOI, Email
  const categoryKey = findColKey(row, ['tạp chí nằm trong danh mục', 'danh mục', 'category', 'loại']);
  const category = categoryKey && row[categoryKey] ? String(row[categoryKey]).trim() : '';

  const qRankKey = findColKey(row, ['xếp hạng chất lượng q', 'xếp hạng q', 'q-rank', 'ranking q', 'chất lượng q', 'q rank', 'hạng q']);
  let qRank = qRankKey && row[qRankKey] ? String(row[qRankKey]).trim().toUpperCase() : '';
  if (qRank && !['Q1', 'Q2', 'Q3', 'Q4'].includes(qRank)) {
    const qMatch = qRank.match(/\b(Q[1-4])\b/i);
    qRank = qMatch ? qMatch[1].toUpperCase() : (qRank.length > 15 ? `${qRank.slice(0, 15)}...` : qRank);
  }

  const ifKey = findColKey(row, ['chỉ số if', 'impact factor', 'if']);
  const impactFactor = ifKey && row[ifKey] ? String(row[ifKey]).trim() : '';

  const doiKey = findColKey(row, ['số doi', 'doi']);
  const doi = doiKey && row[doiKey] ? String(row[doiKey]).trim() : '';

  const emailKey = findColKey(row, ['địa chỉ email', 'email']);
  const email = emailKey && row[emailKey] ? String(row[emailKey]).trim() : '';

  const timeKey = findColKey(row, ['dấu thời gian', 'timestamp']);
  const timestamp = timeKey && row[timeKey] ? String(row[timeKey]).trim() : '';

  // Bài báo Quốc tế (source2) đánh giá theo Phân hạng Q / Impact Factor / Scopus; không gán điểm HĐGS giả lập
  if (sourceType === 'source2' && !scoreKey) {
    score = 0;
    scoreDisplay = '—';
  }

  // Pre-compute chỉ mục tìm kiếm không dấu (searchIndex): CHỈ TẬP TRUNG TÊN BÀI BÁO + TÊN TÁC GIẢ
  // (Các trường Tạp chí, Năm XB, Điểm, Hạng Q, Nguồn đã có bộ lọc chuyên biệt riêng)
  const searchIndex = normalizeStr(
    `${title} ${correspondingAuthor} ${mainAuthor} ${coFirstAuthor} ${(authors || []).join(' ')} ${(ctumpAuthors || []).join(' ')}`
  );

  return {
    id: `rec-${sourceType}-${index}-${Date.now() % 100000}`,
    timestamp,
    email,
    title,
    journal,
    issn,
    score,
    scoreDisplay: score > 0 ? score.toString() : (scoreDisplay || '0'),
    publishDate,
    publishYear,
    authors,
    ctumpAuthors,
    authorCount,
    correspondingAuthor: correspondingAuthor || 'Chưa cập nhật',
    mainAuthor: mainAuthor || '—',
    coFirstAuthor: coFirstAuthor || '',
    volumeIssuePage,
    proofLinks,
    category,
    qRank,
    impactFactor,
    doi,
    sourceType,
    searchIndex,
    paperType: sourceType === 'source1' ? 'Trong nước (HĐGS)' : 'Quốc tế (Scopus/ISI)',
    rawRecord: row, // Giữ 100% cột dữ liệu gốc của Google Sheet
  };
}

/**
 * Chuẩn hóa toàn bộ mảng dữ liệu thô từ PapaParse
 * @param {Array<Record<string, any>>} rawData 
 * @param {'source1' | 'source2'} [sourceType] 
 * @returns {Array<any>}
 */
export function cleanDataset(rawData, sourceType) {
  if (!Array.isArray(rawData)) return [];
  return rawData
    .filter((row) => {
      if (!row || typeof row !== 'object') return false;
      const values = Object.values(row).join('').trim();
      return values.length > 0;
    })
    .map((row, idx) => cleanRawRecord(row, idx, sourceType));
}

/**
 * Xuất dữ liệu đã chuẩn hóa sang file CSV có hỗ trợ UTF-8 BOM cho Excel tiếng Việt
 * @param {Array<any>} records 
 * @param {string} filename 
 */
export function exportToCleanCSV(records, filename = 'CTUMP_NCKH_Cleaned.csv') {
  if (!records || records.length === 0) {
    alert('Không có dữ liệu để xuất!');
    return;
  }

  const headers = [
    'STT',
    'Nguồn Dữ Liệu',
    'Tên Bài Báo',
    'Tác Giả Chính',
    'Tác Giả Liên Hệ',
    'Tên Tạp Chí / Kỷ Yếu',
    'Điểm HĐGS',
    'Năm Xuất Bản',
    'Ngày Xuất Bản',
    'Số Lượng Tác Giả',
    'Danh Sách Tác Giả',
    'Tập, Số, Trang',
    'Mã ISSN',
    'Minh Chứng PDF / Drive',
    'Phân Hạng Q',
    'Chỉ Số IF',
    'Email Liên Hệ'
  ];

  const rows = records.map((r, i) => [
    i + 1,
    r.sourceType === 'source1' ? 'Trong nước (Ngoài trường - HĐGS)' : 'Quốc tế (Scopus/ISI & Mở rộng)',
    `"${(r.title || '').replace(/"/g, '""')}"`,
    `"${(r.mainAuthor || '').replace(/"/g, '""')}"`,
    `"${(r.correspondingAuthor || '').replace(/"/g, '""')}"`,
    `"${(r.journal || '').replace(/"/g, '""')}"`,
    r.score,
    r.publishYear,
    `"${(r.publishDate || '').replace(/"/g, '""')}"`,
    r.authorCount,
    `"${(r.authors || []).join(', ').replace(/"/g, '""')}"`,
    `"${(r.volumeIssuePage || '').replace(/"/g, '""')}"`,
    `"${(r.issn || '').replace(/"/g, '""')}"`,
    `"${(r.proofLinks || []).join(' | ').replace(/"/g, '""')}"`,
    r.qRank || 'N/A',
    r.impactFactor || 'N/A',
    `"${(r.email || '').replace(/"/g, '""')}"`
  ]);

  // Thêm ký tự UTF-8 BOM (\uFEFF) ở đầu file để Excel tiếng Việt hiển thị không lỗi font
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
