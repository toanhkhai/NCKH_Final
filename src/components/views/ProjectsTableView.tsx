import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { GRADE_LABELS, STATUS_LABELS } from '../../types/project';
import { exportProjectsCsv, projectAssignmentYear, projectPage, sortProjects, type ProjectSortField, type ProjectSortOrder } from '../../services/projectTable';
import '../../styles/project-catalog.css';

const formatNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });

export function ProjectsTableView() {
  const { filteredProjects, setSelectedProject, resetFilters, isLoading } = useDashboard();
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<ProjectSortField>('assignmentYear');
  const [sortOrder, setSortOrder] = useState<ProjectSortOrder>('desc');
  const sorted = useMemo(() => sortProjects(filteredProjects, sortField, sortOrder), [filteredProjects, sortField, sortOrder]);
  useEffect(() => { setRequestedPage(1); }, [filteredProjects, sortField, sortOrder, pageSize]);
  const page = projectPage(sorted, requestedPage, pageSize);

  const handleSort = (field: ProjectSortField) => {
    setRequestedPage(1);
    setSortOrder(sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };
  const sortHeader = (label: string, field: ProjectSortField, numeric = false) => (
    <th scope="col" className={numeric ? 'catalog-number' : ''} aria-sort={sortField === field ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="catalog-sort" onClick={() => handleSort(field)}>
        {label}{sortField !== field ? <ArrowUpDown size={12} /> : sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      </button>
    </th>
  );
  const exportCsv = () => {
    if (!sorted.length) return;
    const url = URL.createObjectURL(new Blob([exportProjectsCsv(sorted)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `De_Tai_KHCN_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const firstPageButton = Math.max(1, Math.min(page.currentPage - 2, page.totalPages - 4));

  return <section className="project-catalog" aria-label="Danh mục đề tài cán bộ" aria-busy={isLoading}>
    <div className="catalog-toolbar">
      <div><h2>Danh mục đề tài</h2><p>{formatNumber.format(sorted.length)} đề tài theo bộ lọc{sorted.length > 0 && ` · Dòng ${page.offset + 1}–${Math.min(page.offset + pageSize, sorted.length)}`}</p></div>
      <div className="catalog-tools">
        <label>Số dòng <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setRequestedPage(1); }}>
          {[15, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
        </select></label>
        <button type="button" className="catalog-export" onClick={exportCsv} disabled={!sorted.length}><Download size={15} /> Xuất CSV</button>
      </div>
    </div>

    <div className="catalog-table-scroll" tabIndex={0} role="region" aria-label="Bảng đề tài, cuộn ngang để xem đủ cột">
      <table className="catalog-table">
        <colgroup><col className="catalog-col-index" /><col className="catalog-col-title" /><col className="catalog-col-pi" /><col className="catalog-col-unit" /><col className="catalog-col-year" /><col className="catalog-col-budget" /><col className="catalog-col-status" /><col className="catalog-col-grade" /><col className="catalog-col-actions" /></colgroup>
        <thead><tr>
          <th scope="col">STT</th>
          {sortHeader('Tên đề tài / Quyết định', 'title')}
          {sortHeader('Chủ nhiệm', 'pi')}
          {sortHeader('Đơn vị', 'assigningUnit')}
          {sortHeader('Năm giao', 'assignmentYear', true)}
          {sortHeader('Kinh phí (tr.đ)', 'budget', true)}
          <th scope="col">Trạng thái</th><th scope="col">Xếp loại</th><th scope="col" className="catalog-actions">Mở</th>
        </tr></thead>
        <tbody>{page.rows.map((project, index) => <tr key={project.id}>
          <td className="catalog-index">{page.offset + index + 1}</td>
          <td><button type="button" className="catalog-project-title" onClick={() => setSelectedProject(project)} title={project.title}>{project.title}</button>
            {project.code && <div className="catalog-secondary">Mã: {project.code}</div>}
            {project.assignDecision && <div className="catalog-decision" title={project.assignDecision}>QĐ: {project.assignDecision}</div>}
          </td>
          <td><span className="catalog-pi">{project.pi.name}</span>{project.pi.staffId && <div className="catalog-secondary">MSCB: {project.pi.staffId}</div>}</td>
          <td>{project.assigningUnit}</td>
          <td className="catalog-number">{projectAssignmentYear(project) ?? '—'}</td>
          <td className="catalog-number">{project.budgetKnown ? formatNumber.format(project.budget) : <span className="catalog-secondary">Chưa cập nhật</span>}</td>
          <td><span className={`catalog-status catalog-status-${project.status}`}>{STATUS_LABELS[project.status]}</span></td>
          <td className={project.grade === 'CHUA_XEP_LOAI' ? 'catalog-muted' : ''}>{GRADE_LABELS[project.grade]}</td>
          <td><div className="catalog-row-actions">
            <button type="button" onClick={() => setSelectedProject(project)} title="Xem chi tiết" aria-label={`Xem chi tiết: ${project.title}`}><Eye size={16} /></button>
          </div></td>
        </tr>)}</tbody>
      </table>
      {!sorted.length && <div className="catalog-empty"><p>{isLoading ? 'Đang tải dữ liệu…' : 'Không có đề tài phù hợp với bộ lọc.'}</p><button type="button" onClick={resetFilters}>Đặt lại bộ lọc</button></div>}
    </div>
    <div className="catalog-footer">
      <nav className="catalog-pagination" aria-label="Phân trang đề tài">
        <button type="button" disabled={page.currentPage <= 1} onClick={() => setRequestedPage(page.currentPage - 1)} aria-label="Trang trước"><ChevronLeft size={16} /></button>
        {Array.from({ length: Math.min(5, page.totalPages) }, (_, i) => firstPageButton + i).map((number) => <button type="button" key={number} aria-current={number === page.currentPage ? 'page' : undefined} onClick={() => setRequestedPage(number)}>{number}</button>)}
        <button type="button" disabled={page.currentPage >= page.totalPages} onClick={() => setRequestedPage(page.currentPage + 1)} aria-label="Trang sau"><ChevronRight size={16} /></button>
        <span>{page.currentPage} / {page.totalPages}</span>
      </nav>
    </div>
  </section>;
}
