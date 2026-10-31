import Papa from 'papaparse';

export const LEARNER_SHEET_ID = '1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02';
export const LEARNER_SOURCE = `https://docs.google.com/spreadsheets/d/${LEARNER_SHEET_ID}/edit`;
export const learnerViews = ['overview', 'projects', 'people', 'progress', 'outputs', 'quality'] as const;
export type LearnerView = typeof learnerViews[number];
export type LearnerProject = {
  id: string; row: number; title: string; code: string; year: string; startYear: string;
  leader: string; studentId: string; className: string; cohort: string; academicYear: string; unit: string;
  supervisors: { name: string; staffId: string; unit: string }[];
  members: { name: string; className: string }[];
  budget: number | null; publications: number | null; internationalPublications: number | null;
  accepted: boolean | null; cancelled: boolean | null; extended: boolean | null; liquidated: boolean | null;
  sponsored: boolean | null; enterprise: boolean | null; international: boolean | null;
  status: string; grade: string; endDate: Date | null; issues: string[]; raw: Record<string, string>;
};
export type SummaryRow = {
  period: string; assigned: number | null; acceptedByAssigned: number | null; acceptedByStats: number | null;
  extended: number | null; sponsored: number | null; enterprise: number | null; international: number | null;
  budget: number | null; liquidated: number | null;
};
export type LearnerData = {
  projects: LearnerProject[] | null; summary: SummaryRow[] | null; blankRows: number;
  declaredDetailTotal: number | null;
  errors: string[]; updatedAt: Date;
};

const norm = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
export const searchText = norm;
export function numberOrNull(value: string): number | null {
  const clean = value.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  if (!clean) return null;
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}
function flag(value: string): boolean | null {
  if (value.trim() === '1') return true;
  if (value.trim() === '0') return false;
  return null;
}
function matrix(csv: string): string[][] {
  if (/<!doctype|<html|accounts\.google\.com/i.test(csv)) throw new Error('Google Sheets chưa trả về CSV công khai. Kiểm tra quyền xem của bảng tính.');
  // Preserve empty lines so links continue to point to the physical Google Sheet row.
  return Papa.parse<string[]>(csv, { skipEmptyLines: false }).data;
}
function monthEnd(year: string, month: string): Date | null {
  const y = Number(year), m = Number(month);
  return /^\d{4}$/.test(year) && m >= 1 && m <= 12 ? new Date(y, m, 0, 23, 59, 59) : null;
}

export function parseLearnerProjects(csv: string, now = new Date()) {
  const rows = matrix(csv);
  const headerIndex = rows.findIndex((r) => r.some((v) => norm(v) === 'mssv/mshv chu nhiem'));
  if (headerIndex < 0) throw new Error('Không tìm thấy khung dữ liệu người học (cột MSSV/MSHV chủ nhiệm).');
  const headers = rows[headerIndex].map((v) => v.trim());
  const indices = new Map(headers.map((h, i) => [norm(h), i]));
  const projects: LearnerProject[] = [];
  let year = '', blankRows = 0, declaredTotal: number | null = null;
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (label: string) => (row[indices.get(norm(label)) ?? -1] || '').trim();
    const title = get('Tên đề tài');
    if (/^\d{4}$/.test(title)) { year = title; continue; }
    if (/^tong so/i.test(norm(title))) { declaredTotal = numberOrNull(get('STT')); continue; }
    if (!/^\d+$/.test(get('STT'))) continue;
    if (!title) { blankRows++; continue; }
    const accepted = flag(get('Đề tài đã nghiệm thu (0-Không, 1-Có)'));
    const cancelled = flag(get('Đề tài hủy (0-Không, 1-Có)'));
    const extended = flag(get('Gia hạn đề tài (0-Không, 1-Có)'));
    let endDate = monthEnd(get('Năm kết thúc'), get('Tháng kết thúc'));
    if (extended === true) {
      const extension = get('Thời gian gia hạn đề tài (Số tháng gia hạn)').match(/^\s*(\d+)\s*(?:tháng)?\s*$/i);
      // Never infer an overdue date when the extension duration is missing.
      endDate = endDate && extension ? new Date(endDate.getFullYear(), endDate.getMonth() + Number(extension[1]) + 1, 0, 23, 59, 59) : null;
    }
    const issues: string[] = [];
    for (const field of ['MSSV/MSHV chủ nhiệm', 'Năm bắt đầu', 'Năm kết thúc', 'Kinh phí (Triệu đồng)']) {
      if (!get(field)) issues.push(`Thiếu ${field}`);
    }
    if (accepted === null) issues.push('Chưa cập nhật trạng thái nghiệm thu');
    if (accepted === true && !get('Minh chứng nghiệm thu (Link Biên bản)')) issues.push('Thiếu minh chứng nghiệm thu');
    if (get('Quyết định nghiệm thu') && accepted !== true) issues.push('Quyết định nghiệm thu chưa khớp cờ nghiệm thu');
    const publications = numberOrNull(get('Tổng số bài báo'));
    const internationalPublications = numberOrNull(get('Số bài báo quốc tế uy tín'));
    if (publications !== null && internationalPublications !== null && internationalPublications > publications) issues.push('Số bài quốc tế vượt tổng số bài báo');
    if (publications !== null && publications > 0 && !get('Minh chứng bài báo (Link drive tổng hợp các bài báo)')) issues.push('Thiếu minh chứng bài báo');
    projects.push({
      id: `learner-row-${r + 1}`, row: r + 1, title, code: get('Mã số đề tài / Dự án / Chương trình'),
      year: year || get('Năm bắt đầu') || 'Chưa rõ', startYear: get('Năm bắt đầu'),
      leader: get('Chủ nhiệm'), studentId: get('MSSV/MSHV chủ nhiệm'), className: get('Lớp'),
      cohort: get('Khóa'), academicYear: get('Niên khóa'), unit: get('Đơn vị quản lý') || 'Chưa cập nhật',
      supervisors: [1, 2].map((i) => ({ name: get(`Cán bộ Hướng dẫn ${i}`), staffId: get(`MSCB tham gia ${i}`), unit: get(`Đơn vị CBHD ${i}`) })).filter((p) => p.name),
      members: [1, 2, 3, 4].map((i) => ({ name: get(`Thành viên tham gia ${i}`), className: get(`Lớp - Khóa TVTG ${i}`) })).filter((p) => p.name),
      budget: numberOrNull(get('Kinh phí (Triệu đồng)')), publications, internationalPublications,
      accepted, cancelled, extended, liquidated: flag(get('Trạng thái thanh lý hợp đồng (0-Chưa thanh lý, 1-Đã thanh lý)')),
      sponsored: flag(get('Đề tài có đơn vị tài trợ (0-Không, 1-Có)')),
      enterprise: flag(get('Đề tài có hợp tác doanh nghiệp/CSYT (0-Không, 1-Có)')),
      international: flag(get('Đề tài có hợp tác quốc tế (0-Không, 1-Có)')),
      status: cancelled === true ? 'Đã hủy' : accepted === true ? 'Đã nghiệm thu' : accepted === false && cancelled === false && extended !== null && endDate ? (endDate < now ? 'Quá hạn dự kiến' : 'Đang thực hiện') : 'Chưa đủ dữ liệu tiến độ',
      grade: get('Xếp loại nghiệm thu'), endDate, issues,
      raw: Object.fromEntries(headers.map((h, i) => [h, row[i] || '']).filter(([h]) => h)),
    });
  }
  return { projects, blankRows, declaredTotal };
}

export function parseLearnerSummary(csv: string): SummaryRow[] {
  const rows = matrix(csv);
  if (!rows.some((r) => r.some((v) => norm(v) === 'tong so de tai duoc giao'))) throw new Error('Không tìm thấy cấu trúc bảng tổng hợp người học.');
  return rows.filter((r) => /^\d{4}(?:\s*[-–]\s*\d{4})?$/.test(r[0]?.trim()) && norm(r[1] || '') === 'de tai').map((r) => ({
    period: r[0].trim(), assigned: numberOrNull(r[2] || ''), acceptedByAssigned: numberOrNull(r[3] || ''),
    acceptedByStats: numberOrNull(r[4] || ''), extended: numberOrNull(r[5] || ''), sponsored: numberOrNull(r[6] || ''),
    enterprise: numberOrNull(r[7] || ''), international: numberOrNull(r[8] || ''), budget: numberOrNull(r[9] || ''), liquidated: numberOrNull(r[10] || ''),
  }));
}

async function fetchCsv(gid: string) {
  const urls = [`/api/sheet?dataset=learners&gid=${gid}`, `https://docs.google.com/spreadsheets/d/${LEARNER_SHEET_ID}/export?format=csv&gid=${gid}`];
  let failure = 'Không thể tải bảng tính';
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const csv = await response.text();
      matrix(csv);
      // An older proxy may point to the staff workbook, whose gids are the same.
      if (gid === '1326842216') parseLearnerProjects(csv); else parseLearnerSummary(csv);
      return csv;
    } catch (error) { failure = error instanceof Error ? error.message : String(error); }
  }
  throw new Error(failure);
}

export async function loadLearnerData(): Promise<LearnerData> {
  const results = await Promise.allSettled([fetchCsv('1326842216'), fetchCsv('844694624')]);
  const detail = results[0].status === 'fulfilled' ? parseLearnerProjects(results[0].value) : null;
  return {
    projects: detail?.projects ?? null, blankRows: detail?.blankRows ?? 0,
    declaredDetailTotal: detail?.declaredTotal ?? null,
    summary: results[1].status === 'fulfilled' ? parseLearnerSummary(results[1].value) : null,
    errors: results.flatMap((r, i) => r.status === 'rejected' ? [`${i === 0 ? 'Chi tiết' : 'Tổng hợp'}: ${r.reason.message}`] : []),
    updatedAt: new Date(),
  };
}
