import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { parseCsvToMatrix, parseProjectSheet } from '../src/services/dataLoader.ts';
import { buildDate, computeProjectStatus, parseVNNumber, parseVNNumberOrNull } from '../src/services/normalizer.ts';
import { DEFAULT_PROJECT_FILTERS, filterProjects, projectPage, projectSourceUrl, sortProjects, exportProjectsCsv } from '../src/services/projectTable.ts';

const sheet = { id: 'truong', gid: '1326842216', title: 'Cấp Trường', level: 'TRUONG', expectedMemberCount: 4 };
const headers = ['STT', 'Tên đề tài', 'Mã số', 'Quyết định giao', 'Tháng bắt đầu', 'Năm bắt đầu', 'Tháng kết thúc', 'Năm kết thúc', 'Gia hạn đề tài', 'Số tháng gia hạn', 'Đơn vị giao', 'Chủ nhiệm', 'MSCB chủ nhiệm', 'Đơn vị', 'Kinh phí', 'Đề tài đã nghiệm thu', 'Đề tài ngưng thực hiện', 'Quyết định nghiệm thu'];
const matrix = (rows) => parseCsvToMatrix(Papa.unparse([headers, ...rows]));
const make = (patch = {}) => ({ ...parseProjectSheet(matrix([['1', 'Nghiên cứu A', 'NC-01', '', '5', '2025', '8', '2026', '0', '', 'Khoa Y', 'Nguyễn Ánh', '00001', 'Khoa Y', '15', '0', '0']]), 'TRUONG', sheet)[0], ...patch });
const filters = (patch = {}) => ({ ...DEFAULT_PROJECT_FILTERS, ...patch });

test('physical source rows make repeated STT unique across year groups and preserve source links', () => {
  const data = parseProjectSheet(matrix([['', '2021'], ['1', 'Đề tài A'], [], ['', '2022'], ['1', 'Đề tài B']]), 'TRUONG', sheet);
  assert.equal(data.length, 2);
  assert.notEqual(data[0].id, data[1].id);
  assert.deepEqual(data.map((p) => p.assignmentYear), [2021, 2022]);
  assert.equal(data[0].sourceRow, 3);
  assert.equal(data[1].sourceRow, 6);
  assert.match(projectSourceUrl(data[1]), /gid=1326842216&range=A6$/);
  assert.equal(data[0].startYear, undefined);
  assert.equal(data[0].endYear, undefined);
});

test('research titles containing giai đoạn remain valid projects', () => {
  const data = parseProjectSheet(matrix([['', 'Giai đoạn 2021–2030'], ['705', 'TỔNG SỐ'], ['', '2021'], ['1', 'Khảo sát điều trị giai đoạn 2021–2022']]), 'TRUONG', sheet);
  assert.equal(data.length, 1);
  assert.equal(data[0].title, 'Khảo sát điều trị giai đoạn 2021–2022');
});

test('blank acceptance flags never become overdue; cancellation and acceptance remain explicit', () => {
  const date = new Date(2020, 0, 1);
  assert.equal(computeProjectStatus(false, null, false, date), 'CHUA_CAP_NHAT');
  assert.equal(computeProjectStatus(false, false, false, date), 'QUA_HAN');
  assert.equal(computeProjectStatus(true, null, false, date), 'DA_HUY');
  assert.equal(computeProjectStatus(false, true, false, date), 'DA_NGHIEM_THU');
  assert.equal(computeProjectStatus(false, null, true, date), 'CHO_NGHIEM_THU');
  assert.equal(computeProjectStatus(false, false, false), 'CHUA_CAP_NHAT');
  const data = parseProjectSheet(matrix([['1', 'Chưa cập nhật', '', '', '1', '2021', '2', '2021', '0', '', '', '', '', '', '', '']]), 'TRUONG', sheet);
  assert.equal(data[0].status, 'CHUA_CAP_NHAT');
  assert.equal(data[0].budgetKnown, false);
});

test('end-month and extension are inclusive and missing dates stay unknown', () => {
  assert.equal(buildDate(2026, undefined), undefined);
  assert.equal(buildDate(2026, 2, 30), undefined);
  const data = parseProjectSheet(matrix([['1', 'Gia hạn', '', '', '1', '2025', '5', '2026', '1', '3', '', '', '', '', '0', '0']]), 'TRUONG', sheet);
  assert.equal(data[0].endDate.getDate(), 31);
  assert.equal(data[0].effectiveEndDate.getMonth(), 7);
  assert.equal(data[0].effectiveEndDate.getDate(), 31);
  assert.equal(computeProjectStatus(false, false, false, data[0].effectiveEndDate, new Date(2026, 7, 31, 12)), 'DANG_THUC_HIEN');
});

test('Vietnamese numbers preserve explicit zero and decimal/thousand separators', () => {
  assert.equal(parseVNNumberOrNull(''), null);
  assert.equal(parseVNNumberOrNull('không rõ'), null);
  assert.equal(parseVNNumberOrNull('0'), 0);
  assert.equal(parseVNNumber('1.234,5'), 1234.5);
  assert.equal(parseVNNumber('10.529'), 10529);
});

test('filters intersect, use host unit and assignment year, and search accents and member IDs', () => {
  const a = make({ id: 'a', assignmentYear: 2026, startYear: 2025, grade: 'TOT', isExtended: true, hasSponsor: true, hasInternationalCollab: true });
  const b = make({ id: 'b', assigningUnit: 'Khoa Dược', members: [{ name: 'Nguyễn An', staffId: '00999', unitGroup: 'Khoa Y' }] });
  assert.deepEqual(filterProjects([a, b], filters({ unit: 'Khoa Y' })).map((p) => p.id), ['a']);
  assert.deepEqual(filterProjects([a, b], filters({ year: 2026, grade: 'TOT', onlyExtended: true, onlySponsored: true, onlyHasCollab: true, searchQuery: 'nguyen anh' })).map((p) => p.id), ['a']);
  assert.deepEqual(filterProjects([a, b], filters({ searchQuery: '00999' })).map((p) => p.id), ['b']);
  assert.equal(filterProjects([a], filters({ searchQuery: 'khong ton tai' })).length, 0);
  const splitNames = make({ pi: { name: 'Trần An' }, title: 'Đề tài của Ngọc', members: [{ name: 'Nguyễn Dũng' }] });
  assert.equal(filterProjects([splitNames], filters({ searchQuery: 'tran ngoc dung' })).length, 0);
  assert.equal(filterProjects([make({ budget: 1500 })], filters()).length, 1);
  assert.equal(filterProjects([make({ budgetKnown: false })], filters({ budgetRange: [1, 20] })).length, 0);
});

test('sorting and paging stay deterministic with missing values and smaller result sets', () => {
  const projects = [make({ id: 'b', budget: 0 }), make({ id: 'a', budgetKnown: false }), make({ id: 'c', budget: 25 })];
  assert.deepEqual(sortProjects(projects, 'budget', 'desc').map((p) => p.id), ['c', 'b', 'a']);
  assert.deepEqual(sortProjects(projects, 'budget', 'asc').map((p) => p.id), ['b', 'c', 'a']);
  const result = projectPage(projects, 10, 2);
  assert.equal(result.currentPage, 2);
  assert.equal(result.rows.length, 1);
  assert.equal(projectPage([], 10, 25).currentPage, 1);
});

test('CSV exports the full selected result with escaped text, source rows and unknown budget', () => {
  const a = make({ title: 'Tên có "dấu", và\nxuống dòng', pi: { name: '=TEST', staffId: '00001' }, budgetKnown: false });
  const rows = Papa.parse(exportProjectsCsv([a, make({ budget: 0 })]), { header: true }).data;
  assert.equal(rows.length, 2);
  assert.equal(rows[0]['Tên đề tài'], a.title);
  assert.equal(rows[0]['Kinh phí (triệu đồng)'], '');
  assert.equal(rows[1]['Kinh phí (triệu đồng)'], '0');
  assert.equal(rows[0]['Chủ nhiệm'], "'=TEST");
  assert.equal(rows[0]['Dòng nguồn'], String(a.sourceRow));
});

test('view 1 CSV omits budget, status and grade while retaining project identity and all selected rows', () => {
  const projects = [make({ id: 'a' }), make({ id: 'b', title: 'Đề tài B' })];
  const result = Papa.parse(exportProjectsCsv(projects, { includeAdminFields: false }), { header: true });
  assert.equal(result.data.length, 2);
  assert.equal(result.data[0]['Tên đề tài'], projects[0].title);
  assert.equal(result.data[1]['Tên đề tài'], projects[1].title);
  for (const field of ['Kinh phí (triệu đồng)', 'Trạng thái', 'Xếp loại']) assert.equal(result.meta.fields.includes(field), false);
});
