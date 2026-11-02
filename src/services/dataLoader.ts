import Papa from 'papaparse';
import { SHEETS_CONFIG, type SheetDefinition } from '../config/sheets.ts';
import { normalizeUnit, STANDARD_UNITS } from '../config/units.ts';
import { isAcceptedProject } from './projectAnalytics.ts';
import type {
  DataQualityIssue,
  Member,
  Project,
  ProjectLevel,
  StandardUnit,
  YearLevelSummary,
} from '../types/project.ts';
import {
  buildDate,
  computeProjectStatus,
  normalizeMember,
  parseDateFromString,
  parseEvaluationGrade,
  parseVNNumber,
  parseVNNumberOrNull,
  parseNullableBooleanFlag,
} from './normalizer.ts';
import { fetchSheetCsv } from './sheetFetcher.ts';

export interface LoadedDashboardData {
  projects: Project[];
  summaryTable: YearLevelSummary[];
  sheetStatus: Record<string, { loaded: boolean; error?: string; rowCount: number }>;
  lastUpdated: Date;
  reconciliation: {
    period: string;
    detailsComplete: boolean;
    tab1TotalAssigned: number | null;
    tab1TotalAccepted: number | null;
    tab1TotalBudget: number | null;
    detailedTotalAssigned: number;
    detailedTotalAccepted: number;
    detailedTotalBudget: number;
    isBalanced: boolean;
    discrepancyNote?: string;
  };
}

export function parseCsvToMatrix(csvText: string): string[][] {
  const result = Papa.parse(csvText, {
    skipEmptyLines: false,
  });
  return result.data as string[][];
}

const normalizeHeader = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

export function parseSummarySheet(matrix: string[][]): YearLevelSummary[] {
  const assignedLabel = 'Tổng số đề tài đã giao';
  const headerIndex = matrix.findIndex((row) => row.some((cell) => normalizeHeader(cell) === normalizeHeader(assignedLabel)));
  if (headerIndex < 0) throw new Error('Không tìm thấy tiêu đề bảng tổng hợp cán bộ');
  const headers = new Map(matrix[headerIndex].map((cell, index) => [normalizeHeader(cell), index]));
  const labels = {
    totalAssigned: assignedLabel,
    totalAcceptedByAssignedYear: 'Tổng số đề tài đã nghiệm thu theo năm giao đề tài',
    totalAcceptedByStatsYear: 'Tổng số đề tài nghiệm thu theo năm Thống kê',
    budgetMillion: 'Kinh phí (Triệu đồng)',
  } as const;
  const required = [...Object.values(labels), ...STANDARD_UNITS];
  if (required.some((label) => !headers.has(normalizeHeader(label)))) throw new Error('Bảng tổng hợp cán bộ thiếu cột bắt buộc; cần kiểm tra cấu trúc nguồn');
  const read = (row: string[], label: string) => parseVNNumberOrNull(row[headers.get(normalizeHeader(label)) ?? -1]);
  const summaries: YearLevelSummary[] = [];
  const seen = new Set<string>();
  let period = '';
  for (const row of matrix.slice(headerIndex + 1)) {
    const value = (row[0] || '').trim().replace(/[–—]/g, '-').replace(/\s+/g, '');
    if (/^\d{4}(?:-\d{4})?$/.test(value)) period = value;
    const level = (row[1] || '').trim();
    const key = normalizeHeader(level);
    if (!key.startsWith('cap ') && key !== 'htqt' && key !== 'hop tac quoc te') continue;
    if (!period) throw new Error('Bảng tổng hợp cán bộ thiếu kỳ thống kê');
    const identity = `${period}|${key}`;
    if (seen.has(identity)) throw new Error(`Bảng tổng hợp bị lặp kỳ/cấp: ${period} / ${level}`);
    seen.add(identity);
    summaries.push({
      period, level,
      totalAssigned: read(row, labels.totalAssigned),
      totalAcceptedByAssignedYear: read(row, labels.totalAcceptedByAssignedYear),
      totalAcceptedByStatsYear: read(row, labels.totalAcceptedByStatsYear),
      budgetMillion: read(row, labels.budgetMillion),
      byUnit: Object.fromEntries([...STANDARD_UNITS, 'Đơn vị ngoài trường', 'Chưa xác định đơn vị'].map((unit) => [unit, read(row, unit)])) as YearLevelSummary['byUnit'],
    });
  }
  if (!summaries.length) throw new Error('Bảng tổng hợp cán bộ chưa có dòng số liệu hợp lệ');
  return summaries;
}

function resolveColumnIndices(headerRow: string[]) {
  const norm = headerRow.map((c) => (c || '').toLowerCase().trim());

  const findIdx = (keywords: string[]): number => {
    return norm.findIndex((h) => keywords.every((kw) => h.includes(kw)));
  };

  const stt = findIdx(['stt']);
  const title = findIdx(['tên đề tài']);
  const code = findIdx(['mã số']);
  const assignDecision = findIdx(['quyết định giao']);
  const contractNo = findIdx(['số hợp đồng']);
  const startMonth = findIdx(['tháng bắt đầu']);
  const startYear = findIdx(['năm bắt đầu']);
  const endMonth = findIdx(['tháng kết thúc']);
  const endYear = findIdx(['năm kết thúc']);
  const extended = findIdx(['gia hạn đề tài']);
  const extendMonths = findIdx(['số tháng gia hạn']);
  const extendedText = findIdx(['tháng/năm gia hạn']);
  const assigningUnit = findIdx(['đơn vị giao']);

  const piName = norm.findIndex((header) => header === 'chủ nhiệm');
  const piMscb = findIdx(['mscb chủ nhiệm']);
  const piUnit = piMscb !== -1 && norm[piMscb + 1]?.startsWith('đơn vị') ? piMscb + 1 : -1;

  const hasSponsor = findIdx(['đơn vị tài trợ (0-không']);
  const sponsorName = hasSponsor !== -1 ? hasSponsor + 1 : findIdx(['đơn vị tài trợ']);
  const place = findIdx(['nơi thực hiện']);
  const hasCollab = findIdx(['hợp tác doanh nghiệp']);
  const collabName = hasCollab !== -1 ? hasCollab + 1 : -1;
  const hasIntl = findIdx(['hợp tác quốc tế']);
  const intlName = hasIntl !== -1 ? hasIntl + 1 : -1;

  const budget = findIdx(['kinh phí']);
  const liquidated = findIdx(['thanh lý']);
  const accepted = findIdx(['đã nghiệm thu']);
  const acceptDecision = findIdx(['quyết định nghiệm thu']);
  const acceptProof = findIdx(['minh chứng']);
  const acceptDay = findIdx(['ngày nghiệm thu']);
  const acceptMonth = findIdx(['tháng nghiệm thu']);
  const acceptYear = findIdx(['năm nghiệm thu']);
  const grade = findIdx(['xếp loại']);

  const stopped = findIdx(['ngưng thực hiện']);
  const stopDecision = findIdx(['quyết định ngưng']);
  const impactNote = findIdx(['ý nghĩa', 'tác động']);

  const updatedDate = findIdx(['ngày cập nhật']);
  const updatedBy = findIdx(['người cập nhật']);

  return {
    stt: stt !== -1 ? stt : 0,
    title: title !== -1 ? title : 1,
    code,
    assignDecision,
    contractNo,
    startMonth,
    startYear,
    endMonth,
    endYear,
    extended,
    extendMonths,
    extendedText,
    assigningUnit,
    piName,
    piMscb,
    piUnit,
    hasSponsor,
    sponsorName,
    place,
    hasCollab,
    collabName,
    hasIntl,
    intlName,
    budget,
    liquidated,
    accepted,
    acceptDecision,
    acceptProof,
    acceptDay,
    acceptMonth,
    acceptYear,
    grade,
    stopped,
    stopDecision,
    impactNote,
    updatedDate,
    updatedBy,
  };
}

export function parseProjectSheet(
  matrix: string[][],
  level: ProjectLevel,
  sheetDef: SheetDefinition
): Project[] {
  const projects: Project[] = [];

  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(25, matrix.length); r++) {
    const row = matrix[r];
    if (row && row.some((c) => (c || '').toLowerCase().includes('tên đề tài'))) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) throw new Error(`Không tìm thấy cột Tên đề tài trong tab ${sheetDef.title}`);

  const headerRow = matrix[headerRowIdx];
  const cols = resolveColumnIndices(headerRow);
  if (cols.piMscb < 0 || cols.piName < 0 || cols.budget < 0 || cols.accepted < 0 || cols.startYear < 0) {
    throw new Error(`Cấu trúc tab ${sheetDef.title} không khớp dữ liệu cán bộ`);
  }

  const memberColumns = headerRow.flatMap((header, nameIndex) => {
    const match = header.trim().match(/^(?:cán bộ|thành viên) tham gia (\d+)$/i);
    if (!match) return [];
    const idIndex = headerRow.findIndex((label) => label.trim().toLowerCase() === `mscb tham gia ${match[1]}`);
    const unitIndex = idIndex >= 0 && headerRow[idIndex + 1]?.trim().toLowerCase().startsWith('đơn vị') ? idIndex + 1 : -1;
    return [{ nameIndex, idIndex, unitIndex }];
  });

  let currentYearBlock: number | undefined;

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length < 2) continue;

    const sttCell = (row[cols.stt] || '').trim();
    const titleCell = (row[cols.title] || '').trim();

    if (!titleCell && !sttCell) continue;

    // Detect year section headers e.g. "2021", "2022", "2023", etc.
    const yearMatch = titleCell.match(/^(19|20)\d{2}$/);
    if (yearMatch) {
      currentYearBlock = parseInt(yearMatch[0], 10);
      continue;
    }

    if (/^TỔNG SỐ(?:\s|$)/i.test(titleCell) || !titleCell) {
      continue;
    }

    if (!/^\d+$/.test(sttCell)) continue;
    const sttNum = Number(sttCell);
    if (!Number.isSafeInteger(sttNum) || sttNum <= 0) continue;

    const qualityIssues: DataQualityIssue[] = [];

    // Keep source years separate from the assignment-year section.
    const sMonth = cols.startMonth !== -1 && row[cols.startMonth] ? parseInt(row[cols.startMonth], 10) : undefined;
    let sYear = cols.startYear !== -1 && row[cols.startYear] ? parseInt(row[cols.startYear], 10) : undefined;
    if (!sYear || isNaN(sYear)) sYear = undefined;

    const eMonth = cols.endMonth !== -1 && row[cols.endMonth] ? parseInt(row[cols.endMonth], 10) : undefined;
    let eYear = cols.endYear !== -1 && row[cols.endYear] ? parseInt(row[cols.endYear], 10) : undefined;
    if (!eYear || isNaN(eYear)) eYear = undefined;

    const startDate = buildDate(sYear, sMonth);
    const endDate = buildDate(eYear, eMonth) ? new Date(eYear!, eMonth!, 0, 23, 59, 59, 999) : undefined;

    const flagAt = (index: number) => index >= 0 ? parseNullableBooleanFlag(row[index]) : null;
    const sourceFlags: NonNullable<Project['sourceFlags']> = {
      accepted: flagAt(cols.accepted), stopped: flagAt(cols.stopped), extended: flagAt(cols.extended),
      liquidated: flagAt(cols.liquidated), sponsored: flagAt(cols.hasSponsor),
      enterprise: flagAt(cols.hasCollab), international: flagAt(cols.hasIntl),
    };
    const isExtended = sourceFlags.extended === true;
    const extendedMonths = cols.extendMonths !== -1 ? parseVNNumber(row[cols.extendMonths]) : 0;
    const extendedDateText = cols.extendedText !== -1 ? row[cols.extendedText]?.trim() : undefined;

    let effectiveEndDate = endDate && sourceFlags.extended !== null ? new Date(endDate.getTime()) : undefined;
    if (isExtended) {
      effectiveEndDate = effectiveEndDate && extendedMonths > 0
        ? new Date(effectiveEndDate.getFullYear(), effectiveEndDate.getMonth() + extendedMonths + 1, 0, 23, 59, 59, 999)
        : undefined;
    }

    const piName = cols.piName !== -1 ? row[cols.piName] : '';
    const piMscb = cols.piMscb !== -1 ? row[cols.piMscb] : '';
    const piUnitRaw = cols.piUnit !== -1 ? row[cols.piUnit] : '';

    const pi = normalizeMember(piName, piMscb, piUnitRaw, 'PI') || {
      name: 'Chưa cập nhật',
      unitGroup: 'Chưa xác định đơn vị',
      role: 'PI',
      isExternal: false,
      isStudent: false,
    };

    if (!pi.staffId && !pi.isExternal) {
      qualityIssues.push({
        type: 'MISSING_FIELD',
        field: 'MSCB',
        message: `Chủ nhiệm đề tài (${pi.name}) chưa có Mã số cán bộ`,
        severity: 'low',
      });
    }

    let assigningUnit: StandardUnit = pi.unitGroup;
    let rawAssigningUnit = piUnitRaw;
    if (cols.assigningUnit !== -1 && row[cols.assigningUnit]?.trim()) {
      rawAssigningUnit = row[cols.assigningUnit].trim();
      assigningUnit = normalizeUnit(rawAssigningUnit);
    }
    if (assigningUnit === 'Chưa xác định đơn vị') qualityIssues.push({ type: 'MISSING_FIELD', field: 'assigningUnit', message: 'Đơn vị chủ trì bị thiếu hoặc chưa nhận diện được; không tự gán vào nhóm phòng/trung tâm', severity: 'medium' });

    const members: Member[] = [pi];
    for (const { nameIndex, idIndex, unitIndex } of memberColumns) {
      const mName = (row[nameIndex] || '').trim();
      const mMscb = (row[idIndex] || '').trim();
      const mUnit = (row[unitIndex] || '').trim();

      if (mName) {
        const mem = normalizeMember(mName, mMscb, mUnit, 'CO_RESEARCHER');
        if (mem) members.push(mem);
      }
    }

    const sourceBudget = cols.budget !== -1 ? parseVNNumberOrNull(row[cols.budget]) : null;
    const budget = sourceBudget ?? 0;
    const budgetKnown = sourceBudget !== null;
    const isLiquidated = sourceFlags.liquidated === true;

    const acceptedFlag = sourceFlags.accepted;
    const isAccepted = acceptedFlag === true;
    const acceptDecision = cols.acceptDecision !== -1 ? row[cols.acceptDecision]?.trim() : undefined;
    const acceptProofUrl = cols.acceptProof !== -1 ? row[cols.acceptProof]?.trim() : undefined;

    const accDay = cols.acceptDay !== -1 && row[cols.acceptDay] ? parseInt(row[cols.acceptDay], 10) : undefined;
    const accMonth = cols.acceptMonth !== -1 && row[cols.acceptMonth] ? parseInt(row[cols.acceptMonth], 10) : undefined;
    const accYear = cols.acceptYear !== -1 && row[cols.acceptYear] ? parseInt(row[cols.acceptYear], 10) : undefined;
    const acceptDate = accDay !== undefined ? buildDate(accYear, accMonth, accDay) : undefined;

    const grade = cols.grade !== -1 ? parseEvaluationGrade(row[cols.grade]) : 'CHUA_XEP_LOAI';

    const isStopped = sourceFlags.stopped === true;
    const stopDecision = cols.stopDecision !== -1 ? row[cols.stopDecision]?.trim() : undefined;
    const stopDate = parseDateFromString(stopDecision);

    const status = computeProjectStatus(isStopped, acceptedFlag, Boolean(acceptDecision), sourceFlags.stopped === false ? effectiveEndDate : undefined);

    if (acceptedFlag === null && !isStopped) qualityIssues.push({ type: 'MISSING_FIELD', field: 'isAccepted', message: 'Chưa cập nhật cờ nghiệm thu; không tự suy ra quá hạn', severity: 'medium' });
    if (!budgetKnown) qualityIssues.push({ type: 'MISSING_FIELD', field: 'budget', message: 'Chưa cập nhật kinh phí', severity: 'low' });
    if (budget < 0) qualityIssues.push({ type: 'FORMAT_WARNING', field: 'budget', message: 'Kinh phí âm; cần kiểm tra số liệu nguồn', severity: 'high' });
    if (isAccepted && isStopped) qualityIssues.push({ type: 'STATUS_DISCREPANCY', field: 'status', message: 'Cờ nghiệm thu và ngưng/hủy cùng được chọn; trạng thái ưu tiên ngưng/hủy', severity: 'high' });
    if (startDate && endDate && endDate < startDate) qualityIssues.push({ type: 'DATE_ANOMALY', field: 'endDate', message: 'Ngày kết thúc trước ngày bắt đầu', severity: 'high' });
    if (isExtended && !effectiveEndDate) qualityIssues.push({ type: 'MISSING_FIELD', field: 'extendedMonths', message: 'Có gia hạn nhưng chưa đủ thời gian gia hạn để xác định hạn thực hiện', severity: 'medium' });

    if (acceptDecision && !isAccepted && !isStopped) {
      qualityIssues.push({
        type: 'STATUS_DISCREPANCY',
        field: 'isAccepted',
        message: `Có Quyết định nghiệm thu (${acceptDecision}) nhưng cờ 'Đã nghiệm thu' chưa xác nhận`,
        severity: 'medium',
      });
    }

    if (isAccepted && !acceptDate) {
      qualityIssues.push({
        type: 'MISSING_FIELD',
        field: 'acceptDate',
        message: 'Đề tài đã nghiệm thu nhưng thiếu thông tin ngày/tháng/năm nghiệm thu',
        severity: 'medium',
      });
    }

    let durationMonths: number | undefined;
    if (startDate && endDate && endDate >= startDate) {
      const diffMonths =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      durationMonths = diffMonths + 1;
    }

    let delayMonths = undefined;
    if (acceptDate && effectiveEndDate && acceptDate > effectiveEndDate) {
      const diffDelay =
        (acceptDate.getFullYear() - effectiveEndDate.getFullYear()) * 12 +
        (acceptDate.getMonth() - effectiveEndDate.getMonth());
      if (diffDelay > 0) {
        delayMonths = diffDelay;
      }
    }

    projects.push({
      id: `${sheetDef.gid}-row-${r + 1}`,
      sourceGid: sheetDef.gid,
      sourceRow: r + 1,
      assignmentYear: currentYearBlock ?? sYear,
      level,
      stt: sttNum,
      title: titleCell,
      code: cols.code !== -1 ? row[cols.code]?.trim() : undefined,
      assignDecision: cols.assignDecision !== -1 ? row[cols.assignDecision]?.trim() : undefined,
      contractNo: cols.contractNo !== -1 ? row[cols.contractNo]?.trim() : undefined,
      startMonth: sMonth,
      startYear: sYear,
      endMonth: eMonth,
      endYear: eYear,
      startDate,
      endDate,
      isExtended,
      extendedMonths,
      extendedDateText,
      effectiveEndDate,
      assigningUnit,
      rawAssigningUnit,
      placeOfExecution: cols.place !== -1 ? row[cols.place]?.trim() : undefined,
      members,
      pi,
      hasSponsor: sourceFlags.sponsored === true,
      sponsorName: cols.sponsorName !== -1 ? row[cols.sponsorName]?.trim() : undefined,
      hasEnterpriseCollab: sourceFlags.enterprise === true,
      enterpriseName: cols.collabName !== -1 ? row[cols.collabName]?.trim() : undefined,
      hasInternationalCollab: sourceFlags.international === true,
      internationalPartner: cols.intlName !== -1 ? row[cols.intlName]?.trim() : undefined,
      budget,
      budgetKnown,
      isLiquidated,
      isAccepted,
      acceptDecision,
      acceptProofUrl,
      acceptDay: accDay,
      acceptMonth: accMonth,
      acceptYear: accYear,
      acceptDate,
      grade,
      isStopped,
      sourceFlags,
      stopDecision,
      stopDate,
      impactNote: cols.impactNote !== -1 ? row[cols.impactNote]?.trim() : undefined,
      updatedDate: cols.updatedDate !== -1 ? row[cols.updatedDate]?.trim() : undefined,
      updatedBy: cols.updatedBy !== -1 ? row[cols.updatedBy]?.trim() : undefined,
      status,
      durationMonths,
      delayMonths,
      qualityIssues,
    });
  }

  const codes = new Map<string, Project[]>();
  for (const project of projects) {
    const code = project.code?.trim().toUpperCase();
    if (code) codes.set(code, [...(codes.get(code) || []), project]);
  }
  for (const group of codes.values()) {
    if (group.length < 2) continue;
    for (const project of group) project.qualityIssues.push({ type: 'FORMAT_WARNING', field: 'code', message: `Mã đề tài trùng trong tab tại các dòng ${group.map((p) => p.sourceRow).join(', ')}; cần xác minh, chưa tự gộp hồ sơ`, severity: 'medium' });
  }
  return projects;
}

export function reconcileDashboardData(projects: Project[], summaryTable: YearLevelSummary[], sheetStatus: LoadedDashboardData['sheetStatus']): LoadedDashboardData['reconciliation'] {
  const years = projects.map((project) => project.assignmentYear ?? project.startYear).filter((year): year is number => year !== undefined);
  const periods = [...new Set(summaryTable.map((row) => row.period))].filter((value) => /^\d{4}-\d{4}$/.test(value));
  const covering = periods.filter((value) => { const [start, end] = value.split('-').map(Number); return years.every((year) => year >= start && year <= end); });
  covering.sort((a, b) => { const [a0, a1] = a.split('-').map(Number), [b0, b1] = b.split('-').map(Number); return (b1 - b0) - (a1 - a0) || b1 - a1; });
  const period = covering[0] || '';
  const rows = summaryTable.filter((row) => period && row.period === period);
  const expectedLevels = ['cap truong', 'cap tinh', 'cap bo', 'cap quoc gia', 'htqt'];
  const summaryComplete = !!sheetStatus.summary?.loaded && rows.length === expectedLevels.length && expectedLevels.every((level) => rows.some((row) => normalizeHeader(row.level) === level || level === 'htqt' && normalizeHeader(row.level) === 'hop tac quoc te'));
  const sum = (field: 'totalAssigned' | 'totalAcceptedByAssignedYear' | 'budgetMillion') => summaryComplete && rows.every((row) => row[field] !== null) ? rows.reduce((total, row) => total + row[field]!, 0) : null;
  // These detail records form an assignment-year cohort, even when acceptance happens in a later period.
  const tab1TotalAssigned = sum('totalAssigned'), tab1TotalAccepted = sum('totalAcceptedByAssignedYear'), tab1TotalBudget = sum('budgetMillion');
  const detailsComplete = SHEETS_CONFIG.filter((source) => !source.isSummary).every((source) => sheetStatus[source.id]?.loaded);
  const detailedTotalAssigned = projects.length;
  const detailedTotalAccepted = projects.filter(isAcceptedProject).length;
  const detailedTotalBudget = projects.filter((project) => project.budgetKnown).reduce((total, project) => total + project.budget, 0);
  const isBalanced = detailsComplete && years.length === projects.length && tab1TotalAssigned !== null && tab1TotalAccepted !== null && tab1TotalBudget !== null &&
    detailedTotalAssigned === tab1TotalAssigned && detailedTotalAccepted === tab1TotalAccepted &&
    Math.abs(detailedTotalBudget - tab1TotalBudget) < .0001 && projects.every((project) => project.budgetKnown);
  const fmt = (value: number | null) => value === null ? 'chưa có đủ dữ liệu' : value.toLocaleString('vi-VN');
  return {
    period, detailsComplete, tab1TotalAssigned, tab1TotalAccepted, tab1TotalBudget,
    detailedTotalAssigned, detailedTotalAccepted, detailedTotalBudget, isBalanced,
    discrepancyNote: isBalanced ? 'Số đề tài, số nghiệm thu và kinh phí chi tiết khớp tổng kỳ trên tab tổng hợp.'
      : `Kỳ ${period || 'chưa xác định'}. Tổng hợp: ${fmt(tab1TotalAssigned)} đề tài, ${fmt(tab1TotalBudget)} triệu đồng. Chi tiết đã đọc: ${detailedTotalAssigned} đề tài, ${fmt(detailedTotalBudget)} triệu đồng; cần đối chiếu phần thiếu hoặc chênh lệch.`,
  };
}

export async function loadAllDashboardData(): Promise<LoadedDashboardData> {
  const sheetStatus: LoadedDashboardData['sheetStatus'] = {};
  const results = await Promise.all(SHEETS_CONFIG.map(async (source) => {
    try {
      const matrix = parseCsvToMatrix(await fetchSheetCsv(source.gid));
      const summary = source.isSummary ? parseSummarySheet(matrix) : [];
      const projects = source.level ? parseProjectSheet(matrix, source.level, source) : [];
      sheetStatus[source.id] = { loaded: true, rowCount: matrix.length };
      return { summary, projects };
    } catch (error) {
      sheetStatus[source.id] = { loaded: false, rowCount: 0, error: error instanceof Error ? error.message : String(error) };
      return { summary: [], projects: [] };
    }
  }));
  const projects = results.flatMap((result) => result.projects);
  const summaryTable = results.flatMap((result) => result.summary);
  return { projects, summaryTable, sheetStatus, lastUpdated: new Date(), reconciliation: reconcileDashboardData(projects, summaryTable, sheetStatus) };
}
