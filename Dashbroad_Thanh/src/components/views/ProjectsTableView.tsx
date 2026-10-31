import React, { useState, useMemo } from 'react';
import {
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import {
  GRADE_COLORS,
  GRADE_LABELS,
  LEVEL_LABELS,
  Project,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../types/project';
import { EmptyState } from '../common/EmptyState';

type SortField = 'stt' | 'title' | 'startYear' | 'budget' | 'assigningUnit';
type SortOrder = 'asc' | 'desc';

export const ProjectsTableView: React.FC = () => {
  const { filteredProjects, setSelectedProject, updateFilters, resetFilters } = useDashboard();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<SortField>('stt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Sorting
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'title') {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedProjects.length / pageSize) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProjects.slice(start, start + pageSize);
  }, [sortedProjects, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!sortedProjects.length) return;

    const headers = [
      'STT',
      'Cấp đề tài',
      'Tên đề tài',
      'Mã số',
      'Quyết định giao',
      'Năm bắt đầu',
      'Năm kết thúc',
      'Đơn vị chủ trì',
      'Chủ nhiệm',
      'MSCB Chủ nhiệm',
      'Kinh phí (Triệu)',
      'Trạng thái',
      'Xếp loại',
      'Quyết định nghiệm thu',
    ];

    const rows = sortedProjects.map((p) => [
      p.stt,
      LEVEL_LABELS[p.level],
      `"${p.title.replace(/"/g, '""')}"`,
      p.code || '',
      `"${(p.assignDecision || '').replace(/"/g, '""')}"`,
      p.startYear || '',
      p.endYear || '',
      `"${p.assigningUnit}"`,
      `"${p.pi.name}"`,
      p.pi.staffId || '',
      p.budget,
      STATUS_LABELS[p.status],
      GRADE_LABELS[p.grade],
      `"${(p.acceptDecision || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + // UTF-8 BOM for Excel in Vietnamese
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `De_Tai_KHCN_DHYDCT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!filteredProjects.length) {
    return (
      <EmptyState
        title="Không tìm thấy đề tài nào"
        description="Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh các tiêu chí bộ lọc phía trên."
        onResetFilters={resetFilters}
      />
    );
  }

  return (
    <div className="projects-table-view-container animate-fade-in">
      <div className="table-controls-bar glass-card">
        <div className="controls-left">
          <span className="results-badge">
            Tổng cộng: <strong>{filteredProjects.length}</strong> đề tài
          </span>
        </div>

        <div className="controls-right">
          <div className="page-size-selector">
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="page-select"
            >
              <option value={15}>15 dòng</option>
              <option value={25}>25 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>

          <button className="btn-secondary export-btn" onClick={handleExportCsv} title="Tải xuống danh sách dưới dạng Excel CSV">
            <Download size={15} />
            <span>Xuất Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Table Wrapper (modern-web-guidance: tabindex 0, role region, sticky headers) */}
      <div
        className="table-responsive-wrapper glass-card"
        tabIndex={0}
        role="region"
        aria-label="Danh mục đề tài khoa học công nghệ"
      >
        <table className="modern-table main-data-table">
          <thead>
            <tr>
              <th className="stt-col clickable" onClick={() => handleSort('stt')}>
                <div className="th-content">
                  <span>STT</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="title-col clickable" onClick={() => handleSort('title')}>
                <div className="th-content">
                  <span>Tên Đề Tài & Quyết Định</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Chủ Nhiệm & MSCB</th>
              <th className="clickable" onClick={() => handleSort('assigningUnit')}>
                <div className="th-content">
                  <span>Đơn Vị</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="clickable num-col" onClick={() => handleSort('startYear')}>
                <div className="th-content justify-end">
                  <span>Năm Giao</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="clickable num-col" onClick={() => handleSort('budget')}>
                <div className="th-content justify-end">
                  <span>Kinh Phí</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Trạng Thái</th>
              <th>Xếp Loại</th>
              <th className="action-col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProjects.map((p) => {
              const statusColor = STATUS_COLORS[p.status];
              const gradeColor = GRADE_COLORS[p.grade];
              return (
                <tr
                  key={p.id}
                  className="table-row-hover clickable"
                  onClick={() => setSelectedProject(p)}
                >
                  <td className="stt-col">
                    <span className="stt-badge">#{p.stt}</span>
                  </td>

                  <td className="title-col">
                    <div className="project-title-text" title={p.title}>
                      {p.title}
                    </div>
                    {p.assignDecision && (
                      <div className="project-decision-sub">QĐ: {p.assignDecision}</div>
                    )}
                  </td>

                  <td>
                    <div className="pi-cell-name">{p.pi.name}</div>
                    {p.pi.staffId && (
                      <div className="pi-cell-mscb">MSCB: {p.pi.staffId}</div>
                    )}
                  </td>

                  <td>
                    <span className="unit-badge">{p.assigningUnit}</span>
                  </td>

                  <td className="num-col bold">
                    {p.startYear || '—'}
                  </td>

                  <td className="num-col budget-cell">
                    {p.budget} Tr
                  </td>

                  <td>
                    <span
                      className="badge status-pill"
                      style={{
                        backgroundColor: `${statusColor}18`,
                        color: statusColor,
                        borderColor: `${statusColor}44`,
                      }}
                    >
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>

                  <td>
                    <span
                      className="grade-cell"
                      style={{ color: gradeColor }}
                    >
                      {GRADE_LABELS[p.grade]}
                    </span>
                  </td>

                  <td className="action-col" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="inspect-action-btn"
                      onClick={() => setSelectedProject(p)}
                      title="Xem toàn bộ 49 trường thông tin"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="pagination-bar glass-card">
        <div className="pagination-info">
          Trang <strong>{currentPage}</strong> / {totalPages} (Tổng số {sortedProjects.length} đề tài)
        </div>

        <div className="pagination-buttons">
          <button
            className="page-nav-btn"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            <ChevronLeft size={16} />
            <span>Trước</span>
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 3 + i;
              if (pageNum > totalPages) pageNum = totalPages - (4 - i);
            }
            return (
              <button
                key={pageNum}
                className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            className="page-nav-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            <span>Tiếp</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
