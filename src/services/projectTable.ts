import Papa from 'papaparse';
import type { FilterState, Project } from '../types/project.ts';
import { GRADE_LABELS, LEVEL_LABELS, STATUS_LABELS } from '../types/project.ts';
import { SPREADSHEET_ID } from '../config/sheets.ts';

export const DEFAULT_PROJECT_FILTERS: FilterState = {
  level: 'ALL', year: 'ALL', unit: 'ALL', status: 'ALL', grade: 'ALL',
  searchQuery: '', onlyExtended: false, onlySponsored: false, onlyHasCollab: false,
  budgetRange: [0, Infinity],
};

const searchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
export const projectAssignmentYear = (project: Pick<Project, 'assignmentYear' | 'startYear'>) => project.assignmentYear ?? project.startYear;
export const projectSourceUrl = (project: Project) => `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${project.sourceGid}#gid=${project.sourceGid}&range=A${project.sourceRow}`;

export function filterProjects(projects: Project[], filters: FilterState): Project[] {
  const query = searchText(filters.searchQuery);
  return projects.filter((p) => {
    if (filters.level !== 'ALL' && p.level !== filters.level) return false;
    if (filters.year !== 'ALL' && projectAssignmentYear(p) !== filters.year) return false;
    // This filter describes the unit displayed in the table: the host unit.
    if (filters.unit !== 'ALL' && p.assigningUnit !== filters.unit) return false;
    if (filters.status !== 'ALL' && p.status !== filters.status) return false;
    if (filters.grade !== 'ALL' && p.grade !== filters.grade) return false;
    if (filters.onlyExtended && !p.isExtended) return false;
    if (filters.onlySponsored && !p.hasSponsor) return false;
    if (filters.onlyHasCollab && !p.hasEnterpriseCollab && !p.hasInternationalCollab) return false;
    if ((filters.budgetRange[0] > 0 || Number.isFinite(filters.budgetRange[1])) &&
      (!p.budgetKnown || p.budget < filters.budgetRange[0] || p.budget > filters.budgetRange[1])) return false;
    if (query) {
      const fields = [p.title, p.code, p.assignDecision, p.acceptDecision, p.pi.name, p.pi.staffId,
        ...p.members.flatMap((member) => [member.name, member.staffId])];
      if (!fields.some((field) => field && searchText(field).includes(query))) return false;
    }
    return true;
  });
}

export type ProjectSortField = 'title' | 'pi' | 'assignmentYear' | 'budget' | 'assigningUnit';
export type ProjectSortOrder = 'asc' | 'desc';
const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
export function sortProjects(projects: Project[], field: ProjectSortField, order: ProjectSortOrder) {
  const value = (p: Project) => field === 'assignmentYear' ? projectAssignmentYear(p)
    : field === 'budget' ? (p.budgetKnown ? p.budget : undefined)
    : field === 'pi' ? p.pi.name : p[field];
  return [...projects].sort((a, b) => {
    const left = value(a), right = value(b);
    if (left === undefined && right !== undefined) return 1;
    if (right === undefined && left !== undefined) return -1;
    const comparison = typeof left === 'number' && typeof right === 'number' ? left - right : collator.compare(String(left ?? ''), String(right ?? ''));
    return (order === 'asc' ? comparison : -comparison) || a.stt - b.stt || a.sourceRow - b.sourceRow || collator.compare(a.id, b.id);
  });
}

export function projectPage(projects: Project[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const offset = (currentPage - 1) * pageSize;
  return { currentPage, totalPages, offset, rows: projects.slice(offset, offset + pageSize) };
}

export function exportProjectsCsv(projects: Project[]) {
  return '\uFEFF' + Papa.unparse(projects.map((p, index) => ({
    'STT': index + 1, 'STT trên Sheet': p.stt, 'Cấp đề tài': LEVEL_LABELS[p.level], 'Tên đề tài': p.title,
    'Mã số': p.code || '', 'Quyết định giao': p.assignDecision || '', 'Năm giao': projectAssignmentYear(p) ?? '',
    'Năm bắt đầu': p.startYear ?? '', 'Năm kết thúc': p.endYear ?? '', 'Đơn vị chủ trì': p.assigningUnit,
    'Chủ nhiệm': p.pi.name, 'MSCB Chủ nhiệm': p.pi.staffId || '', 'Kinh phí (triệu đồng)': p.budgetKnown ? p.budget : '',
    'Trạng thái': STATUS_LABELS[p.status], 'Xếp loại': GRADE_LABELS[p.grade], 'Quyết định nghiệm thu': p.acceptDecision || '',
    'Dòng nguồn': p.sourceRow, 'Google Sheet': projectSourceUrl(p),
  })), { escapeFormulae: true, newline: '\r\n' });
}
