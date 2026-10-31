import React from 'react';
import { Search, X, RotateCcw, Filter, CheckCircle } from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { LEVEL_LABELS, ProjectLevel, ProjectStatus, StandardUnit, STATUS_LABELS } from '../../types/project';
import { STANDARD_UNITS } from '../../config/units';

export const FilterBar: React.FC = () => {
  const { filters, updateFilters, resetFilters, filteredProjects, data, availableYears } = useDashboard();

  const isFiltered =
    filters.level !== 'ALL' ||
    filters.year !== 'ALL' ||
    filters.unit !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.grade !== 'ALL' ||
    filters.searchQuery.trim() !== '' ||
    filters.onlyExtended ||
    filters.onlySponsored;

  const levelOptions: Array<{ id: ProjectLevel | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'Tất cả các Cấp' },
    { id: 'TRUONG', label: 'Cấp Trường' },
    { id: 'TINH', label: 'Cấp Tỉnh' },
    { id: 'BO', label: 'Cấp Bộ' },
    { id: 'QUOC_GIA', label: 'Cấp Quốc gia' },
    { id: 'HTQT', label: 'Hợp tác quốc tế' },
  ];

  const statusOptions: Array<{ id: ProjectStatus | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'Tất cả Trạng thái' },
    { id: 'DA_NGHIEM_THU', label: 'Đã nghiệm thu' },
    { id: 'DANG_THUC_HIEN', label: 'Đang thực hiện' },
    { id: 'CHO_NGHIEM_THU', label: 'Chờ nghiệm thu' },
    { id: 'QUA_HAN', label: 'Quá hạn' },
    { id: 'DA_HUY', label: 'Đã ngưng / hủy' },
  ];

  return (
    <div className="filter-bar-card glass-card">
      <div className="filter-row-top">
        {/* Search Box */}
        <div className="search-box-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo tên đề tài, chủ nhiệm, MSCB, quyết định..."
            value={filters.searchQuery}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
          />
          {filters.searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => updateFilters({ searchQuery: '' })}
              aria-label="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Level Pills */}
        <div className="level-pills-list">
          {levelOptions.map((opt) => {
            const count =
              opt.id === 'ALL'
                ? data?.projects.length || 0
                : data?.projects.filter((p) => p.level === opt.id).length || 0;
            const isSelected = filters.level === opt.id;
            return (
              <button
                key={opt.id}
                className={`level-pill-btn ${isSelected ? 'active' : ''}`}
                onClick={() => updateFilters({ level: opt.id })}
              >
                <span>{opt.label}</span>
                <span className="pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-row-bottom">
        <div className="filter-dropdowns">
          {/* Year select */}
          <div className="filter-group">
            <label className="filter-label">Năm giao:</label>
            <select
              className="filter-select"
              value={filters.year}
              onChange={(e) =>
                updateFilters({
                  year: e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10),
                })
              }
            >
              <option value="ALL">Tất cả các năm (2021–2026)</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>

          {/* Unit select */}
          <div className="filter-group">
            <label className="filter-label">Đơn vị:</label>
            <select
              className="filter-select"
              value={filters.unit}
              onChange={(e) =>
                updateFilters({ unit: e.target.value as StandardUnit | 'ALL' })
              }
            >
              <option value="ALL">Tất cả 9 đơn vị</option>
              {STANDARD_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Status select */}
          <div className="filter-group">
            <label className="filter-label">Trạng thái:</label>
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) =>
                updateFilters({ status: e.target.value as ProjectStatus | 'ALL' })
              }
            >
              {statusOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Stats & Reset */}
        <div className="filter-actions">
          <div className="result-count-badge">
            <CheckCircle size={14} className="count-icon" />
            <span>
              Hiển thị <strong>{filteredProjects.length}</strong> / {data?.projects.length || 0} đề tài
            </span>
          </div>

          {isFiltered && (
            <button className="reset-filter-btn" onClick={resetFilters} title="Khôi phục bộ lọc mặc định">
              <RotateCcw size={14} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
