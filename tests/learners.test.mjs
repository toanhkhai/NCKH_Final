import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { parseLearnerProjects, parseLearnerSummary, reconcileLearnerPeriod, getLearnerTotals, numberOrNull } from '../src/learners/data.ts';

const headers = ['STT', 'Tên đề tài', 'MSSV/MSHV chủ nhiệm', 'Năm bắt đầu', 'Năm kết thúc', 'Tháng kết thúc', 'Kinh phí (Triệu đồng)', 'Đề tài đã nghiệm thu (0-Không, 1-Có)', 'Đề tài hủy (0-Không, 1-Có)', 'Gia hạn đề tài (0-Không, 1-Có)', 'Thời gian gia hạn đề tài (Số tháng gia hạn)'];
const csv = (rows) => Papa.unparse([headers, ...rows]);

test('excludes totals, year headers and blank numbered slots; repeated STT has unique identities', () => {
  const result = parseLearnerProjects(csv([
    ['10', 'TỔNG SỐ'], ['2', '2025'], ['1', 'Đề tài A'], ['2', ''], ['2', '2026'], ['1', 'Đề tài B'],
  ]));
  assert.equal(result.projects.length, 2);
  assert.equal(result.blankRows, 1);
  assert.deepEqual(result.blankRowsByYear, { 2025: 1 });
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
    ['', '', 'Tổng số đề tài được giao', 'Tổng số đề tài đã nghiệm thu theo Năm giao', 'Tổng số đề tài nghiệm thu theo năm Thống kê', 'Số đề tài gia hạn', 'Đơn vị tài trợ', 'Có Hợp tác Doanh nghiệp/CSYT', 'Có hợp tác quốc tế', 'Kinh phí (Triệu đồng)', 'Số đề tài đã thanh lý'],
    ['2021-2030', 'ĐỀ TÀI', '3', '1', '1'], ['2025', 'ĐỀ TÀI', '1', '1', '0'], ['2026', 'ĐỀ TÀI', '2', '0', '1'],
  ]));
  assert.equal(data.length, 3);
  assert.equal(data[0].assigned, 3);
  assert.equal(data[1].acceptedByAssigned, 1);
  assert.equal(data[1].acceptedByStats, 0);
});

test('reconciles named detail records and numbered rows awaiting details by year and period', () => {
  const detail = parseLearnerProjects(csv([
    ['', '2025'], ['1', 'Đề tài A'], ['2', ''], ['', '2026'], ['1', 'Đề tài B'], ['2', ''], ['3', ''],
  ]));
  assert.deepEqual(reconcileLearnerPeriod('2025', detail.projects, detail.blankRowsByYear), { named: 1, blank: 1 });
  assert.deepEqual(reconcileLearnerPeriod('2026', detail.projects, detail.blankRowsByYear), { named: 1, blank: 2 });
  assert.deepEqual(reconcileLearnerPeriod('2025-2026', detail.projects, detail.blankRowsByYear), { named: 2, blank: 3 });
});

test('official total comes from the summary while named rows measure detail coverage', () => {
  const { projects: [project] } = parseLearnerProjects(csv([['1', 'Đề tài A']]));
  const data = {
    declaredDetailTotal: 233,
    projects: Array.from({ length: 143 }, (_, i) => ({ ...project, year: i === 0 ? '2025' : '2026' })),
    summary: [{ period: '2021-2030', assigned: 223 }, { period: '2021', assigned: 10 }, { period: '2025', assigned: 1 }, { period: '2026', assigned: 142 }],
  };
  assert.deepEqual(getLearnerTotals(data), { period: '2021-2030', official: 223, detailed: 143, missing: 80, excess: 0 });
  assert.deepEqual(getLearnerTotals(data, '2021'), { period: '2021', official: 10, detailed: 0, missing: 10, excess: 0 });
  assert.deepEqual(getLearnerTotals(data, '2025'), { period: '2025', official: 1, detailed: 1, missing: 0, excess: 0 });
  data.summary[0].assigned = 224;
  assert.equal(getLearnerTotals(data).official, 224);
  assert.equal(getLearnerTotals(data).missing, 81);
});

test('missing sources stay unknown instead of replacing the official total with detail counts', () => {
  const detail = parseLearnerProjects(csv([['1', 'Đề tài A']]));
  assert.deepEqual(getLearnerTotals({ summary: null, projects: detail.projects }), { period: '', official: null, detailed: 1, missing: null, excess: null });
  assert.deepEqual(getLearnerTotals({ summary: [{ period: '2021-2030', assigned: 223 }], projects: null }), { period: '2021-2030', official: 223, detailed: null, missing: null, excess: null });
  const result = getLearnerTotals({ summary: [{ period: '2025', assigned: 0 }], projects: [{ ...detail.projects[0], year: '2025' }] }, '2025');
  assert.equal(result.missing, 0);
  assert.equal(result.excess, 1);
});

test('rejects HTML and the staff schema instead of treating them as empty learner data', () => {
  assert.throws(() => parseLearnerProjects('<html>Sign in</html>'));
  assert.throws(() => parseLearnerProjects('STT,Tên đề tài,MSCB chủ nhiệm\n1,Staff project,001'));
  assert.throws(() => parseLearnerSummary('STT,Tên đề tài\n1,A'));
  assert.throws(() => parseLearnerProjects('STT,Tên đề tài,MSSV/MSHV chủ nhiệm\n1,A,001'));
  assert.throws(() => parseLearnerSummary(Papa.unparse([
    ['', '', 'Tổng số đề tài được giao', 'Tổng số đề tài đã nghiệm thu theo Năm giao'],
    ['2025', 'ĐỀ TÀI', '1', '1'],
  ])));
});

test('current detail template keeps project codes and all six members without a cancellation column', () => {
  const memberColumns = Array.from({ length: 6 }, (_, i) => [`Thành viên tham gia ${i + 1}`, `Lớp - Khóa TVTG ${i + 1}`]).flat();
  const currentHeaders = [...headers.filter((h) => h !== 'Đề tài hủy (0-Không, 1-Có)'), 'Mã số đề tài', ...memberColumns];
  const values = {
    STT: '1', 'Tên đề tài': 'Đề tài theo mẫu mới', 'MSSV/MSHV chủ nhiệm': 'SV001',
    'Mã số đề tài': 'NH-2026-001', 'Năm bắt đầu': '2025', 'Năm kết thúc': '2026', 'Tháng kết thúc': '5',
    'Kinh phí (Triệu đồng)': '0', 'Đề tài đã nghiệm thu (0-Không, 1-Có)': '0', 'Gia hạn đề tài (0-Không, 1-Có)': '0',
    ...Object.fromEntries(memberColumns.map((label, i) => [label, i % 2 ? 'Lớp A' : `Thành viên ${i / 2 + 1}`])),
  };
  const { projects: [project] } = parseLearnerProjects(Papa.unparse([currentHeaders, currentHeaders.map((h) => values[h] ?? '')]), new Date(2026, 6, 1));
  assert.equal(project.code, 'NH-2026-001');
  assert.equal(project.members.length, 6);
  assert.deepEqual(project.members[5], { name: 'Thành viên 6', className: 'Lớp A' });
  assert.equal(project.budget, 0);
  assert.equal(project.accepted, false);
  assert.equal(project.cancelled, null);
  assert.equal(project.status, 'Chưa đủ dữ liệu tiến độ');
  for (const field of ['sponsored', 'enterprise', 'international', 'liquidated', 'publications', 'internationalPublications']) {
    assert.equal(project[field], null);
  }
});

test('compact learner summary reads the moved budget column and keeps removed optional metrics unknown', () => {
  const summary = parseLearnerSummary(Papa.unparse([
    ['', '', 'Tổng số đề tài được giao', 'Tổng số đề tài đã nghiệm thu theo Năm giao', 'Tổng số đề tài nghiệm thu theo năm Thống kê', 'Số đề tài gia hạn', 'Kinh phí (Triệu đồng)', '', ''],
    ['2021-2030', 'ĐỀ TÀI', '997', '3', '5', '0', '5.152', '', ''],
  ]));
  assert.deepEqual(summary[0], {
    period: '2021-2030', assigned: 997, acceptedByAssigned: 3, acceptedByStats: 5,
    extended: 0, budget: 5152, sponsored: null, enterprise: null, international: null, liquidated: null,
  });
});

test('learner summary resolves named columns even when their order changes', () => {
  const summary = parseLearnerSummary(Papa.unparse([
    ['', '', 'Kinh phí (Triệu đồng)', 'Tổng số đề tài nghiệm thu theo năm Thống kê', 'Ghi chú', 'Tổng số đề tài được giao', 'Số đề tài gia hạn', 'Tổng số đề tài đã nghiệm thu theo Năm giao'],
    ['2026', 'ĐỀ TÀI', '805', '7', 'Không phải chỉ số', '142', '1', '4'],
  ]));
  assert.equal(summary[0].assigned, 142);
  assert.equal(summary[0].budget, 805);
  assert.equal(summary[0].acceptedByAssigned, 4);
  assert.equal(summary[0].acceptedByStats, 7);
  assert.equal(summary[0].extended, 1);
});
