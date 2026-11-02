// Read-only audit. The report contains aggregates and source row numbers, never project/person records.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import Papa from 'papaparse';
import { SHEETS_CONFIG, SPREADSHEET_ID } from '../src/config/sheets.ts';
import { parseCsvToMatrix, parseProjectSheet, parseSummarySheet, reconcileDashboardData } from '../src/services/dataLoader.ts';
import { LEARNER_SHEET_ID, parseLearnerProjects, parseLearnerSummary, getLearnerTotals, reconcileLearnerPeriod } from '../src/learners/data.ts';
import { isAcceptedProject } from '../src/services/projectAnalytics.ts';

const args = process.argv.slice(2);
const value = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const base = value('--base-url');
const output = path.resolve(value('--output') || 'docs/production-data-audit.json');
const norm = (text) => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
// Intentionally separate from the application's numeric and boolean readers.
function numeric(cell) {
  const text = String(cell ?? '').trim().replace(/\s/g, '');
  if (!text) return null;
  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text)) return Number(text.replace(/\./g, '').replace(',', '.'));
  if (/^-?\d+(?:[,.]\d+)?$/.test(text)) return Number(text.replace(',', '.'));
  return null;
}
const flag = (cell) => ['1', 'co', 'true', 'x'].includes(norm(cell)) ? true : ['0', 'khong', 'false'].includes(norm(cell)) ? false : null;
const sum = (values) => values.length && values.every((v) => v === null) ? null : values.reduce((total, v) => total + (v ?? 0), 0);
const hash = (csv) => createHash('sha256').update(csv).digest('hex');
const sources = [
  ...SHEETS_CONFIG.map((source) => ({ ...source, dataset: 'staff', workbook: SPREADSHEET_ID })),
  { id: 'summary', gid: '844694624', dataset: 'learners', workbook: LEARNER_SHEET_ID },
  { id: 'detail', gid: '1326842216', dataset: 'learners', workbook: LEARNER_SHEET_ID },
];
async function read(url) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const csv = await response.text();
  if (/<!doctype|<html/i.test(csv)) throw new Error(`${url}: HTML instead of CSV`);
  return csv;
}
const snapshots = await Promise.all(sources.map(async (source) => {
  const direct = `https://docs.google.com/spreadsheets/d/${source.workbook}/export?format=csv&gid=${source.gid}`;
  const url = base ? `${base.replace(/\/$/, '')}/api/sheet?dataset=${source.dataset}&gid=${source.gid}` : direct;
  const csv = await read(url);
  const directCsv = base && args.includes('--compare-direct') ? await read(direct) : null;
  return { ...source, csv, manifest: { dataset: source.dataset, id: source.id, gid: source.gid, readAt: new Date().toISOString(), sha256: hash(csv), proxyMatchesDirect: directCsv === null ? null : hash(csv) === hash(directCsv), source: `https://docs.google.com/spreadsheets/d/${source.workbook}/edit?gid=${source.gid}#gid=${source.gid}` } };
}));
function rawProjects(csv) {
  const matrix = Papa.parse(csv, { skipEmptyLines: false }).data;
  const headerAt = matrix.findIndex((row) => row.some((cell) => norm(cell) === 'ten de tai'));
  if (headerAt < 0) throw new Error('No project header');
  const headers = matrix[headerAt].map(norm);
  const col = (label) => headers.findIndex((h) => h === norm(label));
  const starts = (label) => headers.findIndex((h) => h.startsWith(norm(label)));
  let year = null;
  const rows = [];
  for (let i = headerAt + 1; i < matrix.length; i++) {
    const raw = matrix[i], title = (raw[col('Tên đề tài')] ?? '').trim();
    if (/^\d{4}$/.test(title)) { year = Number(title); continue; }
    const ordinal = numeric(raw[col('STT')]);
    if (!Number.isSafeInteger(ordinal) || ordinal <= 0 || !title || /^tong so(?:\s|$)/.test(norm(title))) continue;
    rows.push({ row: i + 1, year: year ?? numeric(raw[col('Năm bắt đầu')]), title, code: (raw[starts('Mã số')] ?? '').trim(), budget: numeric(raw[starts('Kinh phí')]), accepted: flag(raw[starts('Đề tài đã nghiệm thu')]), stopped: flag(raw[starts('Đề tài ngưng')]), acceptYear: numeric(raw[col('Năm nghiệm thu')]) });
  }
  return rows;
}
const staffSources = snapshots.filter((source) => source.dataset === 'staff');
const summary = parseSummarySheet(parseCsvToMatrix(staffSources.find((source) => source.isSummary).csv));
const staffChecks = staffSources.filter((source) => source.level).map((source) => {
  const parsed = parseProjectSheet(parseCsvToMatrix(source.csv), source.level, source);
  const raw = rawProjects(source.csv);
  const byRow = new Map(parsed.map((project) => [project.sourceRow, project]));
  const mappingDifferences = raw.flatMap((record) => {
    const parsed = byRow.get(record.row);
    if (!parsed) return [{ row: record.row, fields: ['missing record'] }];
    const fields = [];
    if (record.title !== parsed.title) fields.push('title');
    if (record.code !== (parsed.code || '')) fields.push('code');
    if (record.year !== (parsed.assignmentYear ?? parsed.startYear ?? null)) fields.push('assignmentYear');
    if (record.budget !== (parsed.budgetKnown ? parsed.budget : null)) fields.push('budget');
    if (record.accepted !== parsed.sourceFlags.accepted) fields.push('accepted');
    if (record.stopped !== parsed.sourceFlags.stopped) fields.push('stopped');
    return fields.length ? [{ row: record.row, fields }] : [];
  });
  return { source, raw, parsed, report: { id: source.id, rawCount: raw.length, parsedCount: parsed.length, independentBudget: sum(raw.map((r) => r.budget)), parsedBudget: sum(parsed.map((p) => p.budgetKnown ? p.budget : null)), independentAccepted: raw.filter((r) => r.accepted === true && r.stopped !== true).length, parsedAccepted: parsed.filter(isAcceptedProject).length, mappingDifferences, missingBudgetRows: raw.filter((r) => r.budget === null).map((r) => r.row), unknownFlags: Object.fromEntries(['accepted', 'stopped', 'extended', 'liquidated', 'sponsored', 'enterprise', 'international'].map((key) => [key, parsed.filter((p) => p.sourceFlags[key] === null).length])) } };
});
const staff = staffChecks.flatMap((source) => source.parsed);
const staffRaw = staffChecks.flatMap((source) => source.raw);
const sourceStatus = Object.fromEntries(staffSources.map((source) => [source.id, { loaded: true }]));
const reconciliation = reconcileDashboardData(staff, summary, sourceStatus);
const annualStaff = [...new Set(summary.map((row) => row.period))].filter((period) => /^\d{4}$/.test(period)).map((period) => {
  const official = summary.filter((row) => row.period === period), detail = staffRaw.filter((r) => r.year === Number(period));
  return { period, summaryCount: sum(official.map((r) => r.totalAssigned)), detailCount: detail.length, summaryBudget: sum(official.map((r) => r.budgetMillion)), detailKnownBudget: sum(detail.map((r) => r.budget)), summaryAcceptedByAssigned: sum(official.map((r) => r.totalAcceptedByAssignedYear)), detailAcceptedByAssigned: detail.filter((r) => r.accepted === true && r.stopped !== true).length, summaryAcceptedByStats: sum(official.map((r) => r.totalAcceptedByStatsYear)), detailAcceptedByStats: staffRaw.filter((r) => r.accepted === true && r.stopped !== true && r.acceptYear === Number(period)).length };
});
const levelLabel = { TRUONG: 'cap truong', TINH: 'cap tinh', BO: 'cap bo', QUOC_GIA: 'cap quoc gia', HTQT: 'htqt' };
const unitDifferences = summary.flatMap((row) => {
  const [start, end = start] = row.period.split('-').map(Number);
  const detail = staff.filter((p) => levelLabel[p.level] === norm(row.level) && p.assignmentYear >= start && p.assignmentYear <= end);
  return Object.entries(row.byUnit).flatMap(([unit, official]) => {
    const detailed = detail.filter((p) => p.assigningUnit === unit).length;
    return official !== null && official !== detailed ? [{ period: row.period, level: row.level, unit, official, detailed }] : [];
  });
});
function duplicates(projects, codeField, rowField) {
  const codes = new Map();
  for (const p of projects) { const code = norm(p[codeField]); if (code) codes.set(code, [...(codes.get(code) || []), p[rowField]]); }
  return [...codes.values()].filter((rows) => rows.length > 1);
}
const learnerSources = snapshots.filter((source) => source.dataset === 'learners');
const learnerCsv = learnerSources.find((source) => source.id === 'detail').csv;
const learners = parseLearnerProjects(learnerCsv);
const learnerRaw = rawProjects(learnerCsv);
const learnerSummary = parseLearnerSummary(learnerSources.find((source) => source.id === 'summary').csv);
const learnerTotals = getLearnerTotals({ projects: learners.projects, summary: learnerSummary });
const learnerMappings = learnerRaw.flatMap((raw) => {
  const p = learners.projects.find((p) => p.row === raw.row);
  const fields = !p ? ['missing record'] : [raw.title !== p.title && 'title', raw.code !== p.code && 'code', String(raw.year) !== p.year && 'assignmentYear', raw.budget !== p.budget && 'budget', raw.accepted !== p.accepted && 'accepted'].filter(Boolean);
  return fields.length ? [{ row: raw.row, fields }] : [];
});
const report = {
  capturedAt: new Date().toISOString(), readOnly: true, sources: snapshots.map((source) => source.manifest),
  staff: { sources: staffChecks.map((source) => source.report), reconciliation, annual: annualStaff, unitDifferences, annualSummaryBudget: sum(annualStaff.map((r) => r.summaryBudget)), duplicateCodeRows: duplicates(staff, 'code', 'sourceRow'), unknownYearRows: staff.filter((p) => !p.assignmentYear && !p.startYear).map((p) => p.sourceRow) },
  learners: { totals: learnerTotals, rawCount: learnerRaw.length, parsedCount: learners.projects.length, mappingDifferences: learnerMappings, declaredDetailTotal: learners.declaredTotal, detailKnownBudget: sum(learnerRaw.map((r) => r.budget)), summaryBudget: learnerSummary.find((r) => r.period === learnerTotals.period)?.budget ?? null, duplicateCodeRows: duplicates(learners.projects, 'code', 'row'), unknownFlags: Object.fromEntries(['accepted', 'cancelled', 'extended', 'liquidated', 'sponsored', 'enterprise', 'international'].map((key) => [key, learners.projects.filter((p) => p[key] === null).length])), annual: learnerSummary.filter((row) => /^\d{4}$/.test(row.period)).map((row) => ({ period: row.period, official: row.assigned, detailed: reconcileLearnerPeriod(row.period, learners.projects, learners.blankRowsByYear).named, summaryBudget: row.budget, detailKnownBudget: sum(learners.projects.filter((p) => p.year === row.period).map((p) => p.budget)) })) },
};
report.sourceDataNeedsReview = !reconciliation.isBalanced || learners.declaredTotal !== learnerTotals.official || !!learnerTotals.missing || !!learnerTotals.excess || unitDifferences.length > 0 || report.staff.duplicateCodeRows.length > 0 || report.learners.duplicateCodeRows.length > 0 || staffChecks.some((source) => source.report.unknownFlags.accepted > 0) || report.learners.unknownFlags.accepted > 0;
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
const mappingErrors = staffChecks.some((source) => source.report.mappingDifferences.length || source.raw.length !== source.parsed.length) || learnerMappings.length || learnerRaw.length !== learners.projects.length;
console.log(JSON.stringify({ output, mapping: mappingErrors ? 'FAIL' : 'PASS', staff: { count: staff.length, knownBudget: reconciliation.detailedTotalBudget, summaryBudget: reconciliation.tab1TotalBudget, balanced: reconciliation.isBalanced }, learners: { ...learnerTotals, knownBudget: report.learners.detailKnownBudget, declaredDetailTotal: learners.declaredTotal }, sourceDataNeedsReview: report.sourceDataNeedsReview }, null, 2));
if (mappingErrors) process.exitCode = 1;
