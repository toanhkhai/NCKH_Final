export type ProjectLevel = 'TRUONG' | 'TINH' | 'BO' | 'QUOC_GIA' | 'HTQT';

export const LEVEL_LABELS: Record<ProjectLevel, string> = {
  TRUONG: 'Cấp Trường',
  TINH: 'Cấp Tỉnh',
  BO: 'Cấp Bộ',
  QUOC_GIA: 'Cấp Quốc gia',
  HTQT: 'Hợp tác quốc tế',
};

export type ProjectStatus = 
  | 'DANG_THUC_HIEN' 
  | 'QUA_HAN' 
  | 'CHO_NGHIEM_THU' 
  | 'DA_NGHIEM_THU' 
  | 'DA_HUY';

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  DANG_THUC_HIEN: 'Đang thực hiện',
  QUA_HAN: 'Quá hạn',
  CHO_NGHIEM_THU: 'Chờ nghiệm thu',
  DA_NGHIEM_THU: 'Đã nghiệm thu',
  DA_HUY: 'Đã ngưng / hủy',
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  DANG_THUC_HIEN: '#3b82f6', // blue
  QUA_HAN: '#ef4444',        // red
  CHO_NGHIEM_THU: '#f59e0b', // amber
  DA_NGHIEM_THU: '#10b981',  // emerald
  DA_HUY: '#6b7280',         // gray
};

export type EvaluationGrade = 'XUAT_SAC' | 'TOT' | 'KHA' | 'TRUNG_BINH' | 'CHUA_XEP_LOAI';

export const GRADE_LABELS: Record<EvaluationGrade, string> = {
  XUAT_SAC: 'Xuất sắc',
  TOT: 'Tốt',
  KHA: 'Khá',
  TRUNG_BINH: 'Trung bình',
  CHUA_XEP_LOAI: 'Chưa xếp loại',
};

export const GRADE_COLORS: Record<EvaluationGrade, string> = {
  XUAT_SAC: '#10b981',
  TOT: '#06b6d4',
  KHA: '#f59e0b',
  TRUNG_BINH: '#f97316',
  CHUA_XEP_LOAI: '#9ca3af',
};

export type StandardUnit =
  | 'Khoa Y'
  | 'Khoa Dược'
  | 'Khoa RHM'
  | 'Khoa YHCT'
  | 'Khoa YTCC'
  | 'Khoa KHCB'
  | 'Khoa ĐD - KTYH'
  | 'Bệnh viện'
  | 'Phòng, trung tâm, thư viện'
  | 'Đơn vị ngoài trường';

export interface Member {
  name: string;
  staffId?: string; // MSCB
  rawUnit?: string;
  unitGroup: StandardUnit;
  role: 'PI' | 'CO_RESEARCHER';
  isExternal: boolean;
  isStudent: boolean;
}

export interface DataQualityIssue {
  type: 'MISSING_FIELD' | 'DATE_ANOMALY' | 'STATUS_DISCREPANCY' | 'FORMAT_WARNING';
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Project {
  id: string; // `${level}-${stt}`
  level: ProjectLevel;
  stt: number;
  title: string;
  code?: string;
  assignDecision?: string; // QĐ giao đề tài
  contractNo?: string;

  // Timeline
  startMonth?: number;
  startYear?: number;
  endMonth?: number;
  endYear?: number;
  startDate?: Date;
  endDate?: Date;
  isExtended: boolean;
  extendedMonths: number;
  extendedDateText?: string;
  effectiveEndDate?: Date;

  // Assignment & Team
  assigningUnit: StandardUnit;
  rawAssigningUnit?: string;
  placeOfExecution?: string;
  members: Member[];
  pi: Member; // Principal Investigator (Chủ nhiệm)

  // Collaborations & Sponsors
  hasSponsor: boolean;
  sponsorName?: string;
  hasEnterpriseCollab: boolean;
  enterpriseName?: string;
  hasInternationalCollab: boolean;
  internationalPartner?: string;

  // Financials
  budget: number; // in Million VND (e.g. 10.529 means 10.529 million = 10,529,000 VND)
  isLiquidated: boolean; // 1 = Đã thanh lý, 0 = Chưa

  // Acceptance / Review
  isAccepted: boolean;
  acceptDecision?: string;
  acceptProofUrl?: string;
  acceptDay?: number;
  acceptMonth?: number;
  acceptYear?: number;
  acceptDate?: Date;
  grade: EvaluationGrade;

  // Discontinued / Cancelled
  isStopped: boolean;
  stopDecision?: string;
  stopDate?: Date;

  // Extra notes (Tabs 3-6)
  impactNote?: string;

  // Metadata
  updatedDate?: string;
  updatedBy?: string;

  // Computed & Derived
  status: ProjectStatus;
  durationMonths: number;
  delayMonths?: number;
  qualityIssues: DataQualityIssue[];
}

export interface YearLevelSummary {
  period: string; // "2021-2030", "2021", etc.
  level: string;   // "CẤP TRƯỜNG", "CẤP TỈNH", etc.
  totalAssigned: number;
  byUnit: Record<StandardUnit, number>;
  totalAcceptedByAssignedYear: number;
  totalAcceptedByStatsYear: number;
  budgetMillion: number;
}

export interface FilterState {
  level: ProjectLevel | 'ALL';
  year: number | 'ALL';
  unit: StandardUnit | 'ALL';
  status: ProjectStatus | 'ALL';
  grade: EvaluationGrade | 'ALL';
  searchQuery: string;
  onlyExtended: boolean;
  onlySponsored: boolean;
  onlyHasCollab: boolean;
  budgetRange: [number, number]; // [min, max]
}
