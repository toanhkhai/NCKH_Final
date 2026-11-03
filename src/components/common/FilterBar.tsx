import React from 'react';
import { Search, X, RotateCcw, Filter, CheckCircle } from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { GRADE_LABELS, type EvaluationGrade, type ProjectLevel, type ProjectStatus, type StandardUnit, STATUS_LABELS } from '../../types/project';
import { STANDARD_UNITS } from '../../config/units';
import { filterProjects } from '../../services/projectTable';

export const FilterBar: React.FC<{ hideCatalogFields?: boolean }> = ({ hideCatalogFields = false }) => {
  const { filters, updateFilters, resetFilters, filteredProjects, data, availableYears } = useDashboard();

  const isFiltered =
    filters.level !== 'ALL' ||
    filters.year !== 'ALL' ||
    filters.unit !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.grade !== 'ALL' ||
    filters.searchQuery.trim() !== '' ||
    filters.onlyExtended ||
    filters.onlySponsored || filters.onlyHasCollab || filters.budgetRange[0] > 0 || Number.isFinite(filters.budgetRange[1]);
  const unitOptions = [...new Set([...STANDARD_UNITS, ...(data?.projects ?? []).map((p) => p.assigningUnit)])];
  const projectsForCounts = filterProjects(data?.projects ?? [], { ...filters, level: 'ALL' });

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
    { id: 'CHO_NGHIEM_THU', label: STATUS_LABELS.CHO_NGHIEM_THU },
    { id: 'QUA_HAN', label: 'Quá hạn' },
    { id: 'DA_HUY', label: 'Đã ngưng / hủy' },
    { id: 'CHUA_CAP_NHAT', label: 'Chưa cập nhật trạng thái' },
  ];

  return (
    <div className="filter-bar-card staff-filter-bar">
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
                ? projectsForCounts.length
                : projectsForCounts.filter((p) => p.level === opt.id).length;
            const isSelected = filters.level === opt.id;
            return (
              <button
                key={opt.id}
                className={`level-pill-btn ${isSelected ? 'active' : ''}`}
                aria-pressed={isSelected}
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
            <label className="filter-label" htmlFor="staff-filter-year">Năm giao:</label>
            <select
              id="staff-filter-year"
              className="filter-select"
              value={filters.year}
              onChange={(e) =>
                updateFilters({
                  year: e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10),
                })
              }
            >
              <option value="ALL">Tất cả các năm</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>

          {/* Unit select */}
          <div className="filter-group">
            <label className="filter-label" htmlFor="staff-filter-unit">Đơn vị chủ trì:</label>
            <select
              id="staff-filter-unit"
              className="filter-select"
              value={filters.unit}
              onChange={(e) =>
                updateFilters({ unit: e.target.value as StandardUnit | 'ALL' })
              }
            >
              <option value="ALL">Tất cả đơn vị</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Status select */}
          {!hideCatalogFields && <><div className="filter-group">
            <label className="filter-label" htmlFor="staff-filter-status">Trạng thái:</label>
            <select
              id="staff-filter-status"
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
          <div className="filter-group">
            <label className="filter-label" htmlFor="staff-filter-grade">Xếp loại:</label>
            <select id="staff-filter-grade" className="filter-select" value={filters.grade} onChange={(event) => updateFilters({ grade: event.target.value as EvaluationGrade | 'ALL' })}>
              <option value="ALL">Tất cả xếp loại</option>
              {Object.entries(GRADE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div></>}
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
      <div className="staff-filter-options">
        <span>Chỉ xem:</span>
        <label><input type="checkbox" checked={filters.onlyExtended} onChange={(event) => updateFilters({ onlyExtended: event.target.checked })} /> Có gia hạn</label>
        <label><input type="checkbox" checked={filters.onlySponsored} onChange={(event) => updateFilters({ onlySponsored: event.target.checked })} /> Có tài trợ</label>
        <label><input type="checkbox" checked={filters.onlyHasCollab} onChange={(event) => updateFilters({ onlyHasCollab: event.target.checked })} /> Có hợp tác</label>
      </div>
    </div>
  );
};
