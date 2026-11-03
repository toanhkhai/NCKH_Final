import React from 'react';
import { Database, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onResetFilters?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Chưa có dữ liệu đề tài',
  description = 'Không có đề tài phù hợp với bộ lọc hiện tại.',
  onResetFilters,
}) => {
  return (
    <div className="empty-state-box glass-card animate-fade-in">
      <div className="empty-icon-wrapper">
        <Database size={40} className="empty-icon" />
      </div>

      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-desc">{description}</p>}

      {onResetFilters && (
        <button className="btn-secondary empty-reset-btn" onClick={onResetFilters}>
          <RotateCcw size={15} />
          <span>Đặt lại bộ lọc tìm kiếm</span>
        </button>
      )}
    </div>
  );
};
