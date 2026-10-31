import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { parseLearnerProjects, parseLearnerSummary, numberOrNull } from '../src/learners/data.ts';

const headers = ['STT', 'Tên đề tài', 'MSSV/MSHV chủ nhiệm', 'Năm bắt đầu', 'Năm kết thúc', 'Tháng kết thúc', 'Kinh phí (Triệu đồng)', 'Đề tài đã nghiệm thu (0-Không, 1-Có)', 'Đề tài hủy (0-Không, 1-Có)', 'Gia hạn đề tài (0-Không, 1-Có)', 'Thời gian gia hạn đề tài (Số tháng gia hạn)'];
const csv = (rows) => Papa.unparse([headers, ...rows]);

test('excludes totals, year headers and blank numbered slots; repeated STT has unique identities', () => {
  const result = parseLearnerProjects(csv([
    ['10', 'TỔNG SỐ'], ['2', '2025'], ['1', 'Đề tài A'], ['2', ''], ['2', '2026'], ['1', 'Đề tài B'],
  ]));
  assert.equal(result.projects.length, 2);
  assert.equal(result.blankRows, 1);
  assert.equal(result.declaredTotal, 10);
  assert.notEqual(result.projects[0].id, result.projects[1].id);
  assert.deepEqual(result.projects.map((p) => p.year), ['2025', '2026']);
  assert.equal(result.projects[0].startYear, '');
});

test('missing data stays unknown; explicit zeros remain real zeros', () => {
  const { projects: [unknown, zero] } = parseLearnerProjects(csv([
    ['1', 'Chưa nhập'], ['2', 'Đã nhập số 0', '', '', '', '', '0', '0'],
  ]));
  assert.equal(unknown.budget, null);
  assert.equal(unknown.accepted, null);
  assert.equal(unknown.status, 'Chưa đủ dữ liệu tiến độ');
  assert.equal(zero.budget, 0);
  assert.equal(zero.accepted, false);
  assert.equal(numberOrNull('1.234,5'), 1234.5);
});

test('preserves physical source row numbers when the CSV contains completely empty lines', () => {
  const source = Papa.unparse([headers]) + '\r\n\r\n' + Papa.unparse([['1', 'Hồ sơ sau dòng trống']]);
  const { projects } = parseLearnerProjects(source);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].row, 3);
  assert.equal(projects[0].id, 'learner-row-3');
});

test('overdue status requires dates and known flags; extension changes the deadline', () => {
  const { projects: [overdue, extended, incomplete] } = parseLearnerProjects(csv([
    ['1', 'Hết hạn', '', '2025', '2026', '5', '5', '0', '0', '0'],
    ['2', 'Đang gia hạn', '', '2025', '2026', '5', '5', '0', '0', '1', '3 tháng'],
    ['3', 'Thiếu gia hạn', '', '2025', '2026', '5', '5', '0', '0', '1', ''],
  ]), new Date(2026, 6, 1));
  assert.equal(overdue.status, 'Quá hạn dự kiến');
  assert.equal(extended.status, 'Đang thực hiện');
  assert.equal(incomplete.status, 'Chưa đủ dữ liệu tiến độ');
});

test('summary retains period total and the two acceptance-year metrics separately', () => {
  const data = parseLearnerSummary(Papa.unparse([
    ['', '', 'Tổng số đề tài được giao'], ['2021-2030', 'ĐỀ TÀI', '3', '1', '1'], ['2025', 'ĐỀ TÀI', '1', '1', '0'], ['2026', 'ĐỀ TÀI', '2', '0', '1'],
  ]));
  assert.equal(data.length, 3);
  assert.equal(data[0].assigned, 3);
  assert.equal(data[1].acceptedByAssigned, 1);
  assert.equal(data[1].acceptedByStats, 0);
});

test('rejects HTML and the staff schema instead of treating them as empty learner data', () => {
  assert.throws(() => parseLearnerProjects('<html>Sign in</html>'));
  assert.throws(() => parseLearnerProjects('STT,Tên đề tài,MSCB chủ nhiệm\n1,Staff project,001'));
  assert.throws(() => parseLearnerSummary('STT,Tên đề tài\n1,A'));
});
