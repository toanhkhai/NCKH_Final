import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { projectPage, projectSourceUrl } from '../../services/projectTable';

export const DataQualityView: React.FC = () => {
  const { data, filteredProjects, setSelectedProject } = useDashboard();
  const [requestedPage, setRequestedPage] = useState(1);
  useEffect(() => setRequestedPage(1), [filteredProjects]);

  if (!data) return null;

  const projects = filteredProjects;
  const reconciliation = data.reconciliation;

  // Collect all projects with issues
  const projectsWithIssues = projects.filter((p) => p.qualityIssues.length > 0);
  const page = projectPage(projectsWithIssues, requestedPage, 30);
  const severity = (project: typeof projects[number]) => project.qualityIssues.some((issue) => issue.severity === 'high') ? 'high' : project.qualityIssues.some((issue) => issue.severity === 'medium') ? 'medium' : 'low';

  // Categorize
  const missingMscb = projects.filter((p) =>
    p.qualityIssues.some((i) => i.field === 'MSCB')
  );
  const statusDiscrepancies = projects.filter((p) =>
    p.qualityIssues.some((i) => i.type === 'STATUS_DISCREPANCY')
  );
  const missingDates = projects.filter((p) =>
    p.qualityIssues.some((i) => i.field === 'acceptDate')
  );

  const healthScore = (
    (projects.length ? (projects.length - projectsWithIssues.length) / projects.length : 0) *
    100
  ).toFixed(1);

  // Link to specific sheet row on Google Sheets
  const fmt = (value: number | null) => value === null ? 'Chưa có đủ dữ liệu' : value.toLocaleString('vi-VN');
  const comparison = (left: number | null, right: number, covered = true) => left === null || !reconciliation.detailsComplete || !covered ? <span className="text-warning">Chưa đủ dữ liệu đối chiếu</span> : Math.abs(left - right) < 0.0001
    ? <span className="text-success">Khớp</span> : <span className="text-warning">Lệch {new Intl.NumberFormat('vi-VN').format(Math.abs(left - right))}</span>;

  return (
    <div className="data-quality-view-container animate-fade-in">
      <div className="view-intro-box">
        <h2 className="view-title">Kiểm Tra Chất Lượng Dữ Liệu & Đối Chiếu Bảng Tính</h2>
        <p className="view-subtitle">
          Tự động phát hiện các bất thường, mâu thuẫn trạng thái hoặc thiếu sót thông tin trong Google Sheets để bộ phận phụ trách kịp thời cập nhật.
        </p>
      </div>

      {/* Health Score & Reconciliation Row */}
      <div className="charts-grid-2">
        {/* Health Score Card */}
        <div className="dq-score-card glass-card">
          <div className="score-left">
            <div className="score-circle">
              <span className="score-num">{projects.length ? `${healthScore}%` : '—'}</span>
              <span className="score-label">Độ hoàn thiện</span>
            </div>
          </div>

          <div className="score-right">
            <h3 className="score-heading">Chỉ Số Sức Khỏe Dữ Liệu</h3>
            <p className="score-desc">
              Có <strong>{projects.length - projectsWithIssues.length}</strong> / {projects.length} hồ sơ theo bộ lọc không có cảnh báo ở các trường đang kiểm tra: mã cán bộ, kinh phí, thời gian và trạng thái.
            </p>
            <div className="score-badges-row">
              <span className={`badge ${reconciliation.isBalanced ? 'badge-success' : 'badge-warning'}`}>
                <CheckCircle2 size={13} /> {reconciliation.isBalanced ? 'Khớp bảng tổng hợp' : 'Cần kiểm tra đối chiếu'}
              </span>
              {projectsWithIssues.length > 0 && (
                <span className="badge badge-warning">
                  <AlertTriangle size={13} /> {projectsWithIssues.length} đề tài cần rà soát
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab 1 Cross-Verification Box */}
        <div className="dq-reconciliation-card glass-card">
          <div className="recon-header">
            <ShieldCheck size={20} className="shield-icon" />
            <h3 className="recon-title">Kết Quả Đối Chiếu Chéo Với Bảng Tổng Hợp Tab 1</h3>
          </div>
          <p className="chart-note">Đối chiếu toàn bộ các cấp trong kỳ {reconciliation.period || 'chưa xác định'}, không áp dụng bộ lọc hồ sơ. Danh sách cần bổ sung phía dưới áp dụng bộ lọc.</p>
          <p className="chart-note">Kinh phí đã có số liệu ở {data.projects.filter((project) => project.budgetKnown).length}/{data.projects.length} hồ sơ.{reconciliation.detailsComplete && reconciliation.tab1TotalBudget !== null && Math.abs(reconciliation.detailedTotalBudget - reconciliation.tab1TotalBudget) > .0001 ? ` Phần đã ghi nhận chênh ${fmt(Math.abs(reconciliation.detailedTotalBudget - reconciliation.tab1TotalBudget))} triệu đồng so với tổng hợp; cần kiểm tra nguồn và bổ sung ô còn thiếu.` : ''}</p>

          <div className="recon-table-wrapper">
            <table className="recon-table">
              <thead>
                <tr>
                  <th>Chỉ số kiểm chứng</th>
                  <th className="num-col">Bảng Tổng Hợp (Tab 1)</th>
                  <th className="num-col">Các tab chi tiết</th>
                  <th className="status-col">Đối chiếu</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tổng số đề tài đã giao</td>
                  <td className="num-col bold">{fmt(reconciliation.tab1TotalAssigned)}</td>
                  <td className="num-col bold">{reconciliation.detailedTotalAssigned}</td>
                  <td className="status-col">{comparison(reconciliation.tab1TotalAssigned, reconciliation.detailedTotalAssigned)}</td>
                </tr>
                <tr>
                  <td>Đã nghiệm thu theo năm giao</td>
                  <td className="num-col bold">{fmt(reconciliation.tab1TotalAccepted)}</td>
                  <td className="num-col bold">{reconciliation.detailedTotalAccepted}</td>
                  <td className="status-col">{comparison(reconciliation.tab1TotalAccepted, reconciliation.detailedTotalAccepted)}</td>
                </tr>
                <tr>
                  <td>Tổng kinh phí phân bổ</td>
                  <td className="num-col bold">
                    {fmt(reconciliation.tab1TotalBudget)} Tr
                  </td>
                  <td className="num-col bold">
                    {new Intl.NumberFormat('vi-VN').format(reconciliation.detailedTotalBudget)} Tr
                  </td>
                  <td className="status-col">{comparison(reconciliation.tab1TotalBudget, reconciliation.detailedTotalBudget, data.projects.every((project) => project.budgetKnown))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Issues Breakdown */}
      <div className="dq-issues-section">
        <h3 className="section-title">
          <AlertCircle size={18} className="text-warning" />
          <span>Danh Sách Đề Tài Cần Bổ Sung Thông Tin ({projectsWithIssues.length} đề tài)</span>
        </h3>

        <div className="issues-table-card glass-card">
          <div className="table-responsive-wrapper" tabIndex={0} role="region" aria-label="Danh sách cần sửa">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên đề tài</th>
                  <th>Chủ nhiệm & Đơn vị</th>
                  <th>Vấn đề phát hiện</th>
                  <th>Mức độ</th>
                  <th>Chỉnh sửa trên Sheet</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="stt-badge">#{p.stt}</span>
                    </td>
                    <td className="title-cell-wrap">
                      <strong className="clickable" onClick={() => setSelectedProject(p)}>
                        {p.title}
                      </strong>
                    </td>
                    <td>
                      <div>{p.pi.name}</div>
                      <span className="unit-badge">{p.assigningUnit}</span>
                    </td>
                    <td>
                      <div className="issues-stack">
                        {p.qualityIssues.map((issue, idx) => (
                          <div key={idx} className="issue-msg-item">
                            • {issue.message}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`severity-tag ${severity(p)}`}>
                        {severity(p) === 'high'
                          ? 'Cao'
                          : severity(p) === 'medium'
                          ? 'Cần bổ sung'
                          : 'Nhắc nhở'}
                      </span>
                    </td>
                    <td>
                      <a
                        href={projectSourceUrl(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-sheet-jump"
                        title="Mở đúng dòng này trên Google Sheets để chỉnh sửa"
                      >
                        <span>Mở dòng {p.sourceRow}</span>
                        <ExternalLink size={13} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="catalog-footer catalog-pagination" aria-label="Phân trang hồ sơ cần bổ sung">
            <button type="button" disabled={page.currentPage <= 1} onClick={() => setRequestedPage(page.currentPage - 1)}>Trang trước</button>
            <span>Trang {page.currentPage} / {page.totalPages} · {projectsWithIssues.length} hồ sơ</span>
            <button type="button" disabled={page.currentPage >= page.totalPages} onClick={() => setRequestedPage(page.currentPage + 1)}>Trang sau</button>
          </nav>
        </div>
      </div>
    </div>
  );
};
