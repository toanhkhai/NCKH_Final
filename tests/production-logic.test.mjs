import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { SHEETS_CONFIG } from '../src/config/sheets.ts';
import { STANDARD_UNITS, normalizeUnit } from '../src/config/units.ts';
import { parseCsvToMatrix, parseProjectSheet, parseSummarySheet, reconcileDashboardData, loadAllDashboardData } from '../src/services/dataLoader.ts';
import { yearSeries, acceptanceSeries, budgetSummary, budgetTiers, flagCount, projectFlag, collaborationCount, researcherStats, projectLevelCounts } from '../src/services/projectAnalytics.ts';
import { fetchSheetCsv } from '../src/services/sheetFetcher.ts';
import { countLearnerFlags, learnerChartGroups, sumKnown, parseLearnerProjects } from '../src/learners/data.ts';
import { parseDateFromString } from '../src/services/normalizer.ts';

const headers = ['STT', 'Tên đề tài', 'Năm bắt đầu', 'Tháng bắt đầu', 'Năm kết thúc', 'Tháng kết thúc', 'Chủ nhiệm', 'MSCB chủ nhiệm', 'Đơn vị', 'Kinh phí', 'Gia hạn đề tài', 'Số tháng gia hạn', 'Đề tài đã nghiệm thu', 'Đề tài ngưng thực hiện', 'Trạng thái thanh lý hợp đồng', 'Đề tài có đơn vị tài trợ (0-Không, 1-Có)', 'Đề tài có hợp tác doanh nghiệp/CSYT', 'Đề tài có hợp tác quốc tế', 'Năm nghiệm thu', 'Tháng nghiệm thu', 'Ngày nghiệm thu'];
const source = SHEETS_CONFIG.find((entry) => entry.id === 'truong');
const raw = (patch = {}) => ({ STT: '1', 'Tên đề tài': 'Hồ sơ A', 'Năm bắt đầu': '2025', 'Tháng bắt đầu': '1', 'Năm kết thúc': '2026', 'Tháng kết thúc': '5', 'Chủ nhiệm': 'Nguyễn An', 'MSCB chủ nhiệm': '001', 'Đơn vị': 'Khoa Y', 'Kinh phí': '10', 'Gia hạn đề tài': '0', 'Đề tài đã nghiệm thu': '0', 'Đề tài ngưng thực hiện': '0', ...patch });
const csv = (rows, columns = headers) => Papa.unparse([columns, ...rows.map((row) => columns.map((column) => row[column] ?? ''))]);
const project = (patch = {}, values = {}) => ({ ...parseProjectSheet(parseCsvToMatrix(csv([raw(values)])), 'TRUONG', source)[0], ...patch });
const summaryHeaders = ['', 'Tên đề tài', 'Tổng số đề tài đã giao', ...STANDARD_UNITS, 'Tổng số đề tài đã nghiệm thu theo năm giao đề tài', 'Tổng số đề tài nghiệm thu theo năm Thống kê', 'Kinh phí (Triệu đồng)'];
const levels = ['CẤP TRƯỜNG', 'CẤP TỈNH', 'CẤP BỘ', 'CẤP QUỐC GIA', 'HTQT'];
const summaryCsv = (period, counts = [1, 0, 0, 0, 0], money = [10, 0, 0, 0, 0]) => Papa.unparse([summaryHeaders, ...levels.map((level, i) => [i ? '' : period, level, counts[i], ...STANDARD_UNITS.map((_, j) => j ? 0 : counts[i]), counts[i], counts[i], money[i]])]);
const statuses = () => Object.fromEntries(SHEETS_CONFIG.map((entry) => [entry.id, { loaded: true, rowCount: 1 }]));

test('project classification uses source levels, including the HTQT sheet, and retains all five groups', () => {
  const htqt = SHEETS_CONFIG.find((entry) => entry.id === 'htqt');
  assert.equal(htqt.level, 'HTQT');
  assert.equal(htqt.title, 'Hợp tác quốc tế');
  const international = parseProjectSheet(parseCsvToMatrix(csv([
    raw({ 'Đề tài có hợp tác quốc tế': '0' }), raw({ STT: '2', 'Tên đề tài': 'Hồ sơ HTQT B' }),
  ])), htqt.level, htqt);
  const records = [
    project({ hasInternationalCollab: true }), project({ isStopped: true }),
    project({ level: 'TINH' }), project({ level: 'QUOC_GIA' }), ...international,
  ];
  const groups = projectLevelCounts(records);
  assert.deepEqual(groups.map(({ level, value }) => [level, value]), [['TRUONG', 2], ['TINH', 1], ['BO', 0], ['QUOC_GIA', 1], ['HTQT', 2]]);
  assert.equal(groups.find((group) => group.level === 'HTQT').name, 'Hợp tác quốc tế');
  assert.equal(groups.reduce((total, group) => total + group.value, 0), records.length);
  assert.deepEqual(projectLevelCounts(records.filter((record) => record.level === 'HTQT')).map((group) => group.value), [0, 0, 0, 0, 2]);
  assert.deepEqual(projectLevelCounts([]).map((group) => group.value), [0, 0, 0, 0, 0]);
});

test('duplicate project codes warn on every source row without dropping distinct records', () => {
  const columns = [...headers, 'Mã số đề tài'];
  const records = parseProjectSheet(parseCsvToMatrix(csv([raw({ 'Mã số đề tài': 'ABC' }), raw({ STT: '2', 'Tên đề tài': 'Hồ sơ B', 'Mã số đề tài': 'abc' })], columns)), 'TRUONG', source);
  assert.equal(records.length, 2);
  assert.ok(records.every((record) => record.qualityIssues.some((issue) => issue.field === 'code')));
  assert.equal(new Set(records.map((record) => record.id)).size, 2);
});

test('decision dates accept DMY and ISO while rejecting impossible calendar dates', () => {
  assert.equal(parseDateFromString('Quyết định ngày 21/04/2022').getDate(), 21);
  assert.equal(parseDateFromString('2022-04-21').getMonth(), 3);
  assert.equal(parseDateFromString('2022-02-31'), undefined);
});

test('missing or unrecognized host units stay unknown and remain in unit/year totals', () => {
  assert.equal(normalizeUnit(''), 'Chưa xác định đơn vị');
  assert.equal(normalizeUnit('Đơn vị mới chưa cấu hình'), 'Chưa xác định đơn vị');
  assert.equal(normalizeUnit('KHOA Y'), 'Khoa Y');
  const unknown = project({}, { 'Đơn vị': '' });
  assert.equal(unknown.assigningUnit, 'Chưa xác định đơn vị');
  assert.ok(unknown.qualityIssues.some((issue) => issue.field === 'assigningUnit'));
  assert.equal(yearSeries([unknown]).assigned[0], 1);
});

test('reconciliation follows the assignment cohort when acceptance falls in a later period', () => {
  const accepted = project({ assignmentYear: 2029, acceptYear: 2031, isAccepted: true });
  const summaries = parseSummarySheet(parseCsvToMatrix(summaryCsv('2021-2030'))).map((row) => ({ ...row, totalAcceptedByStatsYear: 0 }));
  assert.equal(reconcileDashboardData([accepted], summaries, statuses()).isBalanced, true);
  assert.equal(reconcileDashboardData([{ ...accepted, assignmentYear: undefined, startYear: undefined }], summaries, statuses()).isBalanced, false);
});

test('learner categories combine Unicode and case variants while preserving the original source fields', () => {
  const columns = ['STT', 'Tên đề tài', 'MSSV/MSHV chủ nhiệm', 'Năm bắt đầu', 'Năm kết thúc', 'Kinh phí (Triệu đồng)', 'Đề tài đã nghiệm thu (0-Không, 1-Có)', 'Gia hạn đề tài (0-Không, 1-Có)', 'Lớp', 'Đơn vị quản lý'];
  const sourceRows = [raw({ 'Lớp': 'Dược', 'Đơn vị quản lý': 'Dược' }), raw({ STT: '2', 'Lớp': 'Dược'.normalize('NFD'), 'Đơn vị quản lý': 'DƯỢC' })];
  const { projects } = parseLearnerProjects(csv(sourceRows, columns));
  assert.equal(projects.length, 2);
  assert.equal(projects[0].className, projects[1].className);
  assert.equal(projects[0].unit, projects[1].unit);
  assert.equal(projects[1].raw['Lớp'], 'Dược'.normalize('NFD'));
});

test('all trend charts expand to future assignment and acceptance years and retain unknown-year records', () => {
  const records = [project({ assignmentYear: 2029, startYear: 2025, isAccepted: true, acceptYear: 2031 }), project({ id: 'b', assignmentYear: undefined, startYear: undefined, budgetKnown: false })];
  const trend = yearSeries(records);
  assert.deepEqual(trend.years, [2029, null]);
  assert.deepEqual(trend.assigned, [1, 1]);
  assert.deepEqual(trend.budgets, [10, null]);
  const acceptance = acceptanceSeries([...records, project({ id: 'c', assignmentYear: 2029, acceptYear: 2030, isAccepted: false })]);
  assert.deepEqual(acceptance.years, [2029, 2031]);
  assert.deepEqual(acceptance.accepted, [0, 1]);
  assert.deepEqual(acceptance.assigned, [1, 0]);
});

test('budget buckets form a complete partition including 11, 16, 20, 29, negative and missing amounts', () => {
  const records = [0, 9, 10, 11, 16, 19, 20, 29, 30, 66, -1].map((budget, index) => project({ id: String(index), budget }));
  records.push(project({ id: 'unknown', budget: 0, budgetKnown: false }));
  const tiers = budgetTiers(records);
  assert.deepEqual(tiers.map((tier) => tier.count), [2, 4, 2, 2, 1, 1]);
  assert.equal(tiers.reduce((sum, tier) => sum + tier.count, 0), records.length);
  assert.deepEqual(budgetSummary([records.at(-1)]), { total: null, missing: 1 });
  assert.deepEqual(budgetSummary([]), { total: 0, missing: 0 });
});

test('blank liquidation and other source flags stay unknown instead of becoming explicit no', () => {
  const unknown = project();
  assert.equal(projectFlag(unknown, 'liquidated'), null);
  assert.equal(flagCount([unknown], 'liquidated', false), null);
  assert.equal(flagCount([], 'liquidated', false), 0);
  const explicitNo = project({}, { 'Trạng thái thanh lý hợp đồng': '0' });
  assert.equal(flagCount([unknown, explicitNo], 'liquidated', false), 1);
});

test('funding and every collaboration flag count each project once', () => {
  const both = project({}, { 'Đề tài có đơn vị tài trợ (0-Không, 1-Có)': '1', 'Đề tài có hợp tác doanh nghiệp/CSYT': '1', 'Đề tài có hợp tác quốc tế': '1' });
  assert.equal(collaborationCount([both]), 1);
  assert.equal(collaborationCount([project()]), null);
});

test('person identity uses staff codes or name plus unit and participation counts each person once per project', () => {
  const one = project();
  one.members = [one.pi, one.pi, { ...one.pi, name: 'Người B', staffId: '002' }, { ...one.pi, name: 'Người B', staffId: '002' }];
  const people = researcherStats([one]);
  assert.equal(people.length, 2);
  assert.ok(people.every((person) => person.totalParticipated === 1 && person.projects.length === 1));
  const left = project({ id: 'left', pi: { name: 'Trần An', unitGroup: 'Khoa Y' }, members: [] });
  const right = project({ id: 'right', pi: { name: 'Trần An', unitGroup: 'Khoa Dược' }, members: [] });
  assert.equal(researcherStats([left, right]).length, 2);
  assert.equal(researcherStats([project({ pi: { name: 'Chưa cập nhật', unitGroup: 'Khoa Y' }, members: [] })]).length, 0);
});

test('missing dates never invent twelve months or an acceptance day; extension controls the deadline', () => {
  assert.equal(project({}, { 'Tháng bắt đầu': '' }).durationMonths, undefined);
  assert.equal(project().durationMonths, 17);
  const extended = project({}, { 'Gia hạn đề tài': '1', 'Số tháng gia hạn': '3', 'Đề tài đã nghiệm thu': '1', 'Năm nghiệm thu': '2026', 'Tháng nghiệm thu': '7', 'Ngày nghiệm thu': '1' });
  assert.equal(extended.delayMonths, undefined);
  assert.equal(project({}, { 'Đề tài đã nghiệm thu': '1', 'Năm nghiệm thu': '2026', 'Tháng nghiệm thu': '7' }).acceptDate, undefined);
});

test('contradictory accepted/cancelled flags stay visible as an issue without double-counting acceptance', () => {
  const stopped = project({}, { 'Đề tài đã nghiệm thu': '1', 'Đề tài ngưng thực hiện': '1' });
  assert.equal(stopped.status, 'DA_HUY');
  assert.ok(stopped.qualityIssues.some((issue) => issue.field === 'status' && issue.severity === 'high'));
  assert.deepEqual(acceptanceSeries([stopped]).assigned, [0]);
});

test('summary resolves reordered columns by header name and rejects absent or duplicated periods', () => {
  const matrix = parseCsvToMatrix(summaryCsv('2031-2040'));
  const order = [0, 1, 14, ...Array.from({ length: 12 }, (_, i) => i + 2)];
  const parsed = parseSummarySheet(matrix.map((row) => order.map((index) => row[index] ?? '')));
  assert.equal(parsed[0].budgetMillion, 10);
  assert.equal(parsed[0].totalAssigned, 1);
  assert.equal(parsed[0].period, '2031-2040');
  const missingBudget = matrix.map((row) => [...row]); missingBudget[1][14] = '';
  assert.equal(parseSummarySheet(missingBudget)[0].budgetMillion, null);
  assert.throws(() => parseSummarySheet([summaryHeaders, ['', 'CẤP TRƯỜNG', '1']]));
  assert.throws(() => parseSummarySheet([...matrix, matrix[1]]));
});

test('global reconciliation includes province, ministry, national and international levels in a dynamic period', () => {
  const records = [project({ assignmentYear: 2032, isAccepted: true }), project({ id: 'b', level: 'TINH', assignmentYear: 2032, isAccepted: true, budget: 20 })];
  const summary = parseSummarySheet(parseCsvToMatrix(summaryCsv('2031-2040', [1, 1, 0, 0, 0], [10, 20, 0, 0, 0])));
  const result = reconcileDashboardData(records, summary, statuses());
  assert.equal(result.period, '2031-2040');
  assert.equal(result.tab1TotalAssigned, 2);
  assert.equal(result.tab1TotalBudget, 30);
  assert.equal(result.isBalanced, true);
  const partial = statuses(); partial.tinh.loaded = false;
  assert.equal(reconcileDashboardData(records, summary, partial).isBalanced, false);
  assert.equal(reconcileDashboardData(records, [], statuses()).tab1TotalAssigned, null);
});

test('each refresh reads new records and a broken sheet does not discard healthy sources', async (t) => {
  let phase = 0;
  t.mock.method(globalThis, 'fetch', async (input) => {
    const gid = new URL(String(input), 'http://localhost').searchParams.get('gid');
    const entry = SHEETS_CONFIG.find((source) => source.gid === gid);
    if (entry.isSummary) return new Response(summaryCsv('2021-2030', [phase ? 2 : 1, 0, 0, 0, 0], [phase ? 20 : 10, 0, 0, 0, 0]));
    if (entry.id === 'tinh' && phase === 2) return new Response('STT,Tên đề tài\n1,Khung không hợp lệ');
    const body = entry.id === 'truong' ? csv([raw(), ...(phase ? [raw({ STT: '2', 'Tên đề tài': 'Hồ sơ năm mới', 'Năm bắt đầu': '2029' })] : [])]) : csv([]);
    return new Response(body);
  });
  const initial = await loadAllDashboardData();
  assert.equal(initial.projects.length, 1);
  phase = 1;
  const refreshed = await loadAllDashboardData();
  assert.equal(refreshed.projects.length, 2);
  assert.ok(yearSeries(refreshed.projects).years.includes(2029));
  phase = 2;
  const partial = await loadAllDashboardData();
  assert.equal(partial.projects.length, 2);
  assert.equal(partial.sheetStatus.tinh.loaded, false);
  assert.equal(partial.sheetStatus.truong.loaded, true);
  assert.equal(partial.reconciliation.detailsComplete, false);
});

test('proxy recovery is retried and every read uses no-store with a bounded signal', async (t) => {
  const calls = []; let phase = 0;
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    calls.push(String(input));
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal);
    if (String(input).startsWith('/api/') && phase === 0) return new Response('Down', { status: 503 });
    return new Response(`STT,Tên đề tài\n1,Phase ${phase}`);
  });
  assert.match(await fetchSheetCsv(source.gid), /Phase 0/);
  phase = 1;
  assert.match(await fetchSheetCsv(source.gid), /Phase 1/);
  assert.equal(calls.filter((url) => url.startsWith('/api/')).length, 2);
  assert.equal(calls.length, 3);
});

test('learner counts distinguish missing flags from zero and chart groups preserve all categories', () => {
  assert.equal(countLearnerFlags([{ accepted: null }], 'accepted'), null);
  assert.equal(countLearnerFlags([{ accepted: false }], 'accepted'), 0);
  assert.equal(countLearnerFlags([], 'accepted'), 0);
  assert.equal(sumKnown([]), 0);
  assert.equal(sumKnown([null]), null);
  assert.equal(sumKnown([null, 0]), 0);
  const groups = Array.from({ length: 14 }, (_, i) => [String(2021 + i), i + 1]);
  assert.equal(learnerChartGroups(groups).reduce((sum, [, count]) => sum + count, 0), 105);
  assert.deepEqual(learnerChartGroups(groups, true), groups);
});
