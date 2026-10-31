import React from 'react';
import { Database, ExternalLink, RotateCcw } from 'lucide-react';
import { SPREADSHEET_ID, SHEETS_CONFIG } from '../../config/sheets';
import { ProjectLevel } from '../../types/project';

interface EmptyStateProps {
  title?: string;
  description?: string;
  level?: ProjectLevel;
  onResetFilters?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Chưa có dữ liệu đề tài',
  description = 'Hiện tại bảng tính chưa có dữ liệu hoặc không có đề tài nào phù hợp với bộ lọc hiện tại.',
  level,
  onResetFilters,
}) => {
  const targetSheet = level
    ? SHEETS_CONFIG.find((s) => s.level === level)
    : undefined;

  const sheetUrl = targetSheet
    ? `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${targetSheet.gid}`
    : `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;

  return (
    <div className="empty-state-box glass-card animate-fade-in">
      <div className="empty-icon-wrapper">
        <Database size={40} className="empty-icon" />
      </div>

      <h3 className="empty-title">{title}</h3>
      <p className="empty-desc">{description}</p>

      {targetSheet && (
        <div className="empty-guide-card">
          <p className="guide-text">
            💡 Hệ thống được lập trình để <strong>tự động nhận diện dữ liệu mới</strong>. Khi thầy/cô nhập các đề tài vào Tab <strong>{targetSheet.title}</strong> trên Google Sheet, toàn bộ biểu đồ và bảng thống kê sẽ tự động hiển thị ngay khi tải lại trang!
          </p>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary empty-link-btn"
          >
            <span>Mở Tab {targetSheet.title} trên Sheet</span>
            <ExternalLink size={15} />
          </a>
        </div>
      )}

      {onResetFilters && (
        <button className="btn-secondary empty-reset-btn" onClick={onResetFilters}>
          <RotateCcw size={15} />
          <span>Đặt lại bộ lọc tìm kiếm</span>
        </button>
      )}
    </div>
  );
};
