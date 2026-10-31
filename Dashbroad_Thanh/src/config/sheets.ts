import { ProjectLevel } from '../types/project';

export const SPREADSHEET_ID = '1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg';

export interface SheetDefinition {
  id: string;
  gid: string;
  level?: ProjectLevel;
  title: string;
  isSummary: boolean;
  expectedMemberCount: number; // e.g. 4 for Truong, 15 for Tinh/Bo/QG
}

export const SHEETS_CONFIG: SheetDefinition[] = [
  {
    id: 'summary',
    gid: '844694624',
    title: 'TỔNG HỢP - Số tự động',
    isSummary: true,
    expectedMemberCount: 0,
  },
  {
    id: 'truong',
    gid: '1326842216',
    level: 'TRUONG',
    title: 'Cấp Trường',
    isSummary: false,
    expectedMemberCount: 4,
  },
  {
    id: 'tinh',
    gid: '80327175',
    level: 'TINH',
    title: 'Cấp Tỉnh',
    isSummary: false,
    expectedMemberCount: 15,
  },
  {
    id: 'bo',
    gid: '1053013808',
    level: 'BO',
    title: 'Cấp Bộ',
    isSummary: false,
    expectedMemberCount: 15,
  },
  {
    id: 'quoc_gia',
    gid: '660559511',
    level: 'QUOC_GIA',
    title: 'Cấp Quốc gia',
    isSummary: false,
    expectedMemberCount: 15,
  },
  {
    id: 'htqt',
    gid: '603726587',
    level: 'HTQT',
    title: 'Hợp tác quốc tế',
    isSummary: false,
    expectedMemberCount: 15,
  },
];

export function getSheetFetchUrls(gid: string): { proxyUrl: string; directUrl: string } {
  const timestamp = Date.now();
  return {
    proxyUrl: `/api/sheet?gid=${gid}&_t=${timestamp}`,
    directUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}&_t=${timestamp}`,
  };
}
