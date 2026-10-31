import { StandardUnit } from '../types/project';

export const STANDARD_UNITS: StandardUnit[] = [
  'Khoa Y',
  'Khoa Dược',
  'Khoa RHM',
  'Khoa YHCT',
  'Khoa YTCC',
  'Khoa KHCB',
  'Khoa ĐD - KTYH',
  'Bệnh viện',
  'Phòng, trung tâm, thư viện',
];

export const UNIT_COLORS: Record<StandardUnit, string> = {
  'Khoa Y': '#0284c7', // sky
  'Khoa Dược': '#10b981', // emerald
  'Khoa RHM': '#8b5cf6', // purple
  'Khoa YHCT': '#f59e0b', // amber
  'Khoa YTCC': '#06b6d4', // cyan
  'Khoa KHCB': '#ec4899', // pink
  'Khoa ĐD - KTYH': '#3b82f6', // blue
  'Bệnh viện': '#ef4444', // red
  'Phòng, trung tâm, thư viện': '#6366f1', // indigo
  'Đơn vị ngoài trường': '#64748b', // slate
};

/**
 * Normalizes any free-form raw unit string into one of the standard units.
 */
export function normalizeUnit(raw?: string): StandardUnit {
  if (!raw) return 'Phòng, trung tâm, thư viện';
  const str = raw.trim();

  // 1. Direct matches
  if (str === 'Khoa Y' || str.startsWith('Khoa Y -')) return 'Khoa Y';
  if (str === 'Khoa Dược' || str.startsWith('Khoa Dược')) return 'Khoa Dược';
  if (str === 'Khoa RHM' || str.toLowerCase().includes('răng hàm mặt')) return 'Khoa RHM';
  if (str === 'Khoa YHCT' || str.toLowerCase().includes('y học cổ truyền')) return 'Khoa YHCT';
  if (str === 'Khoa YTCC' || str.toLowerCase().includes('y tế công cộng')) return 'Khoa YTCC';
  if (str === 'Khoa KHCB' || str.toLowerCase().includes('khoa học cơ bản')) return 'Khoa KHCB';
  if (
    str === 'Khoa ĐD - KTYH' ||
    str.includes('ĐD') ||
    str.toLowerCase().includes('điều dưỡng') ||
    str.toLowerCase().includes('kỹ thuật y học')
  ) {
    return 'Khoa ĐD - KTYH';
  }
  if (
    str === 'Bệnh viện' ||
    str.toLowerCase().includes('bệnh viện') ||
    str.toLowerCase().includes('bv ') ||
    str.startsWith('Khoa Khám')
  ) {
    return 'Bệnh viện';
  }

  // 2. Offices, Centers, Library
  if (
    str.toLowerCase().includes('phòng') ||
    str.toLowerCase().includes('trung tâm') ||
    str.toLowerCase().includes('thư viện') ||
    str.toLowerCase().includes('tt ') ||
    str.toLowerCase().includes('văn phòng') ||
    str.includes('QLCLGD') ||
    str.includes('KHCN') ||
    str.includes('TCNS') ||
    str.includes('GDYH')
  ) {
    return 'Phòng, trung tâm, thư viện';
  }

  // 3. External entities
  if (
    str.toLowerCase().includes('sở y tế') ||
    str.toLowerCase().includes('công ty') ||
    str.toLowerCase().includes('doanh nghiệp') ||
    str.toLowerCase().includes('ngoài trường') ||
    str.toLowerCase().includes('học viên') ||
    str.toLowerCase().includes('sv ')
  ) {
    return 'Đơn vị ngoài trường';
  }

  return 'Phòng, trung tâm, thư viện';
}
