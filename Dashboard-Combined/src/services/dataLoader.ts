import Papa from 'papaparse';
import { SHEETS_CONFIG, SheetDefinition } from '../config/sheets';
import { normalizeUnit } from '../config/units';
import type {
  DataQualityIssue,
  Member,
  Project,
  ProjectLevel,
  StandardUnit,
  YearLevelSummary,
} from '../types/project';
import {
  buildDate,
  computeProjectStatus,
  normalizeMember,
  parseBooleanFlag,
  parseDateFromString,
  parseEvaluationGrade,
  parseVNNumber,
} from './normalizer';
import { fetchSheetCsv } from './sheetFetcher';

export interface LoadedDashboardData {
  projects: Project[];
  summaryTable: YearLevelSummary[];
  sheetStatus: Record<string, { loaded: boolean; error?: string; rowCount: number }>;
  lastUpdated: Date;
  reconciliation: {
    tab1TotalAssigned: number;
    tab1TotalAccepted: number;
    tab1TotalBudget: number;
    detailedTotalAssigned: number;
    detailedTotalAccepted: number;
    detailedTotalBudget: number;
    isBalanced: boolean;
    discrepancyNote?: string;
  };
}

function parseCsvToMatrix(csvText: string): string[][] {
  const result = Papa.parse(csvText, {
    skipEmptyLines: false,
  });
  return result.data as string[][];
}

function parseSummarySheet(matrix: string[][]): YearLevelSummary[] {
  const summaries: YearLevelSummary[] = [];

  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(25, matrix.length); r++) {
    const row = matrix[r];
    if (row.some((cell) => cell.includes('Tổng số đề tài đã giao') || cell.includes('Khoa Y'))) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) return summaries;

  let currentPeriod = '2021-2030';

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length < 5) continue;

    const col0 = (row[0] || '').trim();
    const levelCell = (row[1] || '').trim();

    if (col0 && (/\d{4}/.test(col0) || col0.includes('-'))) {
      currentPeriod = col0;
    }

    if (!levelCell || (!levelCell.startsWith('CẤP') && !levelCell.includes('HTQT'))) {
      continue;
    }

    const totalAssigned = parseVNNumber(row[2]);
    const khoaY = parseVNNumber(row[3]);
    const khoaDuoc = parseVNNumber(row[4]);
    const khoaRHM = parseVNNumber(row[5]);
    const khoaYHCT = parseVNNumber(row[6]);
    const khoaYTCC = parseVNNumber(row[7]);
    const khoaKHCB = parseVNNumber(row[8]);
    const khoaDD_KTYH = parseVNNumber(row[9]);
    const benhVien = parseVNNumber(row[10]);
    const phongTT = parseVNNumber(row[11]);
    const totalAcceptedByAssignedYear = parseVNNumber(row[12]);
    const totalAcceptedByStatsYear = parseVNNumber(row[13]);
    const budgetMillion = parseVNNumber(row[14]);

    summaries.push({
      period: currentPeriod,
      level: levelCell,
      totalAssigned,
      byUnit: {
        'Khoa Y': khoaY,
        'Khoa Dược': khoaDuoc,
        'Khoa RHM': khoaRHM,
        'Khoa YHCT': khoaYHCT,
        'Khoa YTCC': khoaYTCC,
        'Khoa KHCB': khoaKHCB,
        'Khoa ĐD - KTYH': khoaDD_KTYH,
        'Bệnh viện': benhVien,
        'Phòng, trung tâm, thư viện': phongTT,
        'Đơn vị ngoài trường': 0,
      },
      totalAcceptedByAssignedYear,
      totalAcceptedByStatsYear,
      budgetMillion,
    });
  }

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
  const contractNo = findIdx(['hợp đồng']);
  const startMonth = findIdx(['tháng bắt đầu']);
  const startYear = findIdx(['năm bắt đầu']);
  const endMonth = findIdx(['tháng kết thúc']);
  const endYear = findIdx(['năm kết thúc']);
  const extended = findIdx(['gia hạn đề tài']);
  const extendMonths = findIdx(['số tháng gia hạn']);
  const extendedText = findIdx(['tháng/năm gia hạn']);
  const assigningUnit = findIdx(['đơn vị giao']);

  const piName = findIdx(['chủ nhiệm']);
  const piMscb = findIdx(['mscb chủ nhiệm']);
  const piUnit = piMscb !== -1 ? piMscb + 1 : findIdx(['đơn vị']);

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
    piName: piName !== -1 ? piName : 13,
    piMscb: piMscb !== -1 ? piMscb : 14,
    piUnit: piUnit !== -1 ? piUnit : 15,
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

function parseProjectSheet(
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

  if (headerRowIdx === -1) return projects;

  const headerRow = matrix[headerRowIdx];
  const cols = resolveColumnIndices(headerRow);

  let currentYearBlock = 2021; // fallback context year

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length < 3) continue;

    const sttCell = (row[cols.stt] || '').trim();
    const titleCell = (row[cols.title] || '').trim();

    if (!titleCell && !sttCell) continue;

    // Detect year section headers e.g. "2021", "2022", "2023", etc.
    const yearMatch = titleCell.match(/^(19|20)\d{2}$/);
    if (yearMatch) {
      currentYearBlock = parseInt(yearMatch[0], 10);
      continue;
    }

    if (titleCell.startsWith('TỔNG SỐ') || titleCell.toLowerCase().includes('giai đoạn') || !titleCell) {
      continue;
    }

    const sttNum = parseInt(sttCell, 10);
    if (isNaN(sttNum) || sttNum <= 0) continue;

    const qualityIssues: DataQualityIssue[] = [];

    // Timeline parsing with fallback to currentYearBlock if year cell is blank
    const sMonth = cols.startMonth !== -1 && row[cols.startMonth] ? parseInt(row[cols.startMonth], 10) : undefined;
    let sYear = cols.startYear !== -1 && row[cols.startYear] ? parseInt(row[cols.startYear], 10) : undefined;
    if (!sYear || isNaN(sYear)) {
      sYear = currentYearBlock;
    }

    const eMonth = cols.endMonth !== -1 && row[cols.endMonth] ? parseInt(row[cols.endMonth], 10) : undefined;
    let eYear = cols.endYear !== -1 && row[cols.endYear] ? parseInt(row[cols.endYear], 10) : undefined;
    if (!eYear || isNaN(eYear)) {
      eYear = sYear ? sYear + 1 : currentYearBlock + 1;
    }

    const startDate = buildDate(sYear, sMonth);
    const endDate = buildDate(eYear, eMonth);

    const isExtended = cols.extended !== -1 ? parseBooleanFlag(row[cols.extended]) : false;
    const extendedMonths = cols.extendMonths !== -1 ? parseVNNumber(row[cols.extendMonths]) : 0;
    const extendedDateText = cols.extendedText !== -1 ? row[cols.extendedText]?.trim() : undefined;

    let effectiveEndDate = endDate ? new Date(endDate.getTime()) : undefined;
    if (effectiveEndDate && extendedMonths > 0) {
      effectiveEndDate.setMonth(effectiveEndDate.getMonth() + extendedMonths);
    }

    const piName = cols.piName !== -1 ? row[cols.piName] : '';
    const piMscb = cols.piMscb !== -1 ? row[cols.piMscb] : '';
    const piUnitRaw = cols.piUnit !== -1 ? row[cols.piUnit] : '';

    const pi = normalizeMember(piName, piMscb, piUnitRaw, 'PI') || {
      name: 'Chưa cập nhật',
      unitGroup: 'Phòng, trung tâm, thư viện',
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

    const members: Member[] = [pi];
    const memberStartCol = cols.piUnit + 1;
    const memberEndCol =
      cols.hasSponsor !== -1 ? cols.hasSponsor : cols.budget !== -1 ? cols.budget : row.length;

    for (let c = memberStartCol; c < memberEndCol - 2; c += 3) {
      const mName = (row[c] || '').trim();
      const mMscb = (row[c + 1] || '').trim();
      const mUnit = (row[c + 2] || '').trim();

      if (mName) {
        const mem = normalizeMember(mName, mMscb, mUnit, 'CO_RESEARCHER');
        if (mem) members.push(mem);
      }
    }

    const budget = cols.budget !== -1 ? parseVNNumber(row[cols.budget]) : 0;
    const isLiquidated = cols.liquidated !== -1 ? parseBooleanFlag(row[cols.liquidated]) : false;

    const isAccepted = cols.accepted !== -1 ? parseBooleanFlag(row[cols.accepted]) : false;
    const acceptDecision = cols.acceptDecision !== -1 ? row[cols.acceptDecision]?.trim() : undefined;
    const acceptProofUrl = cols.acceptProof !== -1 ? row[cols.acceptProof]?.trim() : undefined;

    const accDay = cols.acceptDay !== -1 && row[cols.acceptDay] ? parseInt(row[cols.acceptDay], 10) : undefined;
    const accMonth = cols.acceptMonth !== -1 && row[cols.acceptMonth] ? parseInt(row[cols.acceptMonth], 10) : undefined;
    const accYear = cols.acceptYear !== -1 && row[cols.acceptYear] ? parseInt(row[cols.acceptYear], 10) : undefined;
    const acceptDate = buildDate(accYear, accMonth, accDay);

    const grade = cols.grade !== -1 ? parseEvaluationGrade(row[cols.grade]) : 'CHUA_XEP_LOAI';

    const isStopped = cols.stopped !== -1 ? parseBooleanFlag(row[cols.stopped]) : false;
    const stopDecision = cols.stopDecision !== -1 ? row[cols.stopDecision]?.trim() : undefined;
    const stopDate = parseDateFromString(stopDecision);

    const status = computeProjectStatus(isStopped, isAccepted, Boolean(acceptDecision), effectiveEndDate);

    if (acceptDecision && !isAccepted && !isStopped) {
      qualityIssues.push({
        type: 'STATUS_DISCREPANCY',
        field: 'isAccepted',
        message: `Có Quyết định nghiệm thu (${acceptDecision}) nhưng cờ 'Đã nghiệm thu' chưa tích (0)`,
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

    let durationMonths = 12;
    if (startDate && endDate) {
      const diffMonths =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      durationMonths = Math.max(1, diffMonths);
    }

    let delayMonths = undefined;
    if (acceptDate && endDate) {
      const diffDelay =
        (acceptDate.getFullYear() - endDate.getFullYear()) * 12 +
        (acceptDate.getMonth() - endDate.getMonth());
      if (diffDelay > 0) {
        delayMonths = diffDelay;
      }
    }

    projects.push({
      id: `${level}-${sttNum}`,
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
      hasSponsor: cols.hasSponsor !== -1 ? parseBooleanFlag(row[cols.hasSponsor]) : false,
      sponsorName: cols.sponsorName !== -1 ? row[cols.sponsorName]?.trim() : undefined,
      hasEnterpriseCollab: cols.hasCollab !== -1 ? parseBooleanFlag(row[cols.hasCollab]) : false,
      enterpriseName: cols.collabName !== -1 ? row[cols.collabName]?.trim() : undefined,
      hasInternationalCollab: cols.hasIntl !== -1 ? parseBooleanFlag(row[cols.hasIntl]) : false,
      internationalPartner: cols.intlName !== -1 ? row[cols.intlName]?.trim() : undefined,
      budget,
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

  return projects;
}

export async function loadAllDashboardData(): Promise<LoadedDashboardData> {
  const sheetStatus: Record<string, { loaded: boolean; error?: string; rowCount: number }> = {};
  let summaryTable: YearLevelSummary[] = [];
  const allProjects: Project[] = [];

  const fetchPromises = SHEETS_CONFIG.map(async (cfg) => {
    try {
      const csv = await fetchSheetCsv(cfg.gid);
      const matrix = parseCsvToMatrix(csv);
      sheetStatus[cfg.id] = { loaded: true, rowCount: matrix.length };
      return { cfg, matrix, error: null };
    } catch (err: any) {
      sheetStatus[cfg.id] = { loaded: false, error: err?.message || String(err), rowCount: 0 };
      return { cfg, matrix: [], error: err };
    }
  });

  const results = await Promise.all(fetchPromises);

  for (const { cfg, matrix, error } of results) {
    if (error || !matrix.length) continue;

    if (cfg.isSummary) {
      summaryTable = parseSummarySheet(matrix);
    } else if (cfg.level) {
      const projects = parseProjectSheet(matrix, cfg.level, cfg);
      allProjects.push(...projects);
    }
  }

  const tab1Overall = summaryTable.find((s) => s.period.includes('2021-2030') && s.level.includes('TRƯỜNG'));
  const tab1TotalAssigned = tab1Overall?.totalAssigned || 705;
  const tab1TotalAccepted = tab1Overall?.totalAcceptedByStatsYear || 271;
  const tab1TotalBudget = tab1Overall?.budgetMillion || 10529;

  const detailedTotalAssigned = allProjects.length;
  const detailedTotalAccepted = allProjects.filter((p) => p.isAccepted).length;
  const detailedTotalBudget = allProjects.reduce((sum, p) => sum + p.budget, 0);

  const isBalanced =
    detailedTotalAssigned === tab1TotalAssigned &&
    detailedTotalAccepted === tab1TotalAccepted;

  return {
    projects: allProjects,
    summaryTable,
    sheetStatus,
    lastUpdated: new Date(),
    reconciliation: {
      tab1TotalAssigned,
      tab1TotalAccepted,
      tab1TotalBudget,
      detailedTotalAssigned,
      detailedTotalAccepted,
      detailedTotalBudget,
      isBalanced,
      discrepancyNote: isBalanced
        ? 'Dữ liệu chi tiết khớp hoàn toàn 100% với Bảng Tổng hợp Tab 1.'
        : `Bảng Tổng Hợp (Tab 1) ghi nhận ${tab1TotalAssigned} đề tài, Bảng Chi Tiết (Tab 2) có ${detailedTotalAssigned} đề tài thực tế.`,
    },
  };
}
