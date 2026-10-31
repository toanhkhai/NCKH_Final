import { EvaluationGrade, Member, ProjectStatus, StandardUnit } from '../types/project';
import { normalizeUnit } from '../config/units';

/**
 * Parses Vietnamese numeric strings into JavaScript numbers.
 * In Vietnamese accounting:
 * "10.529" -> 10529
 * "1.658" -> 1658
 * "10" -> 10
 * "2,5" -> 2.5
 */
export function parseVNNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  if (!str) return 0;

  // Handle dots as thousand separators (e.g., 10.529 -> 10529)
  // If dot is followed by 3 digits at the end or before another dot:
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  } else if (str.includes('.') && !str.includes(',')) {
    // If e.g. "1.658" or "10.529"
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      str = parts.join('');
    }
  } else {
    // Standard cleanup: replace comma with dot for decimals, remove spaces
    str = str.replace(/\s+/g, '').replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function parseBooleanFlag(val: any): boolean {
  if (!val) return false;
  const str = String(val).trim().toLowerCase();
  return str === '1' || str === 'có' || str === 'true' || str === 'x';
}

export function parseEvaluationGrade(raw?: string): EvaluationGrade {
  if (!raw) return 'CHUA_XEP_LOAI';
  const str = raw.trim().toLowerCase();
  if (str.includes('xuất sắc') || str.includes('xuat sac')) return 'XUAT_SAC';
  if (str.includes('tốt') || str.includes('tot')) return 'TOT';
  if (str.includes('khá') || str.includes('kha')) return 'KHA';
  if (str.includes('trung bình') || str.includes('tb')) return 'TRUNG_BINH';
  return 'CHUA_XEP_LOAI';
}

export function buildDate(year?: number, month?: number, day = 1): Date | undefined {
  if (!year || year < 2000 || year > 2050) return undefined;
  const m = month && month >= 1 && month <= 12 ? month - 1 : 0;
  const d = day >= 1 && day <= 31 ? day : 1;
  return new Date(year, m, d);
}

export function parseDateFromString(str?: string): Date | undefined {
  if (!str) return undefined;
  // Patterns like "21/4/2022" or "2022-04-21" or "21/04/2022"
  const dmyMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    return buildDate(y, m, d);
  }
  return undefined;
}

export function normalizeMember(
  nameRaw?: string,
  staffIdRaw?: string,
  unitRaw?: string,
  role: 'PI' | 'CO_RESEARCHER' = 'CO_RESEARCHER'
): Member | null {
  if (!nameRaw || !nameRaw.trim()) return null;

  let name = nameRaw.trim();
  let staffId = staffIdRaw?.trim() || undefined;
  let unitStr = unitRaw?.trim() || '';

  // Detect external organization or student labels in name e.g. "Nguyễn Hoàng Bảo Ngọc - Bệnh viện Đa Khoa..."
  let isExternal = false;
  let isStudent = false;

  if (name.includes(' - ') || name.includes(' – ') || name.includes('-')) {
    const parts = name.split(/\s*[-–]\s*/);
    if (parts.length > 1) {
      name = parts[0].trim();
      const extra = parts.slice(1).join(' - ').trim();
      if (!unitStr) {
        unitStr = extra;
      }
      if (extra.toLowerCase().includes('hvch') || extra.toLowerCase().includes('sinh viên') || extra.toLowerCase().includes('sv ')) {
        isStudent = true;
      }
      if (extra.toLowerCase().includes('bệnh viện') || extra.toLowerCase().includes('sở y tế') || extra.toLowerCase().includes('ngoài')) {
        isExternal = true;
      }
    }
  }

  const unitGroup: StandardUnit = normalizeUnit(unitStr);
  if (unitGroup === 'Đơn vị ngoài trường') {
    isExternal = true;
  }

  return {
    name,
    staffId: staffId || undefined,
    rawUnit: unitStr || undefined,
    unitGroup,
    role,
    isExternal,
    isStudent,
  };
}

export function computeProjectStatus(
  isStopped: boolean,
  isAccepted: boolean,
  hasAcceptDecision: boolean,
  effectiveEndDate?: Date
): ProjectStatus {
  // 1. Highest priority: Stopped/Cancelled
  if (isStopped) {
    return 'DA_HUY';
  }

  // 2. Officially accepted
  if (isAccepted) {
    return 'DA_NGHIEM_THU';
  }

  // 3. Has acceptance decision or pending review
  if (hasAcceptDecision) {
    return 'CHO_NGHIEM_THU';
  }

  // 4. Overdue check
  if (effectiveEndDate) {
    const now = new Date();
    if (effectiveEndDate < now) {
      return 'QUA_HAN';
    }
  }

  // 5. Normal ongoing
  return 'DANG_THUC_HIEN';
}
