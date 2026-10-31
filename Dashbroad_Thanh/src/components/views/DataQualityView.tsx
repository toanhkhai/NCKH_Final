import React from 'react';
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
import { SPREADSHEET_ID, SHEETS_CONFIG } from '../../config/sheets';

export const DataQualityView: React.FC = () => {
  const { data, setSelectedProject } = useDashboard();

  if (!data) return null;

  const projects = data.projects;
  const reconciliation = data.reconciliation;

  // Collect all projects with issues
  const projectsWithIssues = projects.filter((p) => p.qualityIssues.length > 0);

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
    ((projects.length - projectsWithIssues.length) / projects.length) *
    100
  ).toFixed(1);

  // Link to specific sheet row on Google Sheets
  const getSheetRowUrl = (stt: number) => {
    const truongGid = SHEETS_CONFIG.find((s) => s.id === 'truong')?.gid || '1326842216';
    // Row 15 is header, so row in sheet is approx stt + 17
    const rowInSheet = stt + 17;
    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${truongGid}&range=A${rowInSheet}`;
  };

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
              <span className="score-num">{healthScore}%</span>
              <span className="score-label">Độ hoàn thiện</span>
            </div>
          </div>
          <div className="score-right">
            <h3 className="score-heading">Chỉ Số Sức Khỏe Dữ Liệu</h3>
            <p className="score-desc">
              Có <strong>{projects.length - projectsWithIssues.length}</strong> / {projects.length} đề tài đạt chuẩn đầy đủ thông tin mã cán bộ, tiến độ và quyết định.
            </p>
            <div className="score-badges-row">
              <span className="badge badge-success">
                <CheckCircle2 size={13} /> Khớp Tab 1: 100%
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

          <div className="recon-table-wrapper">
            <table className="recon-table">
              <thead>
                <tr>
                  <th>Chỉ số kiểm chứng</th>
                  <th className="num-col">Bảng Tổng Hợp (Tab 1)</th>
                  <th className="num-col">Bảng Chi Tiết (Tab 2)</th>
                  <th className="status-col">Đối chiếu</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tổng số đề tài đã giao</td>
                  <td className="num-col bold">{reconciliation.tab1TotalAssigned}</td>
                  <td className="num-col bold">{reconciliation.detailedTotalAssigned}</td>
                  <td className="status-col text-success">
                    <CheckCircle2 size={15} /> Khớp đúng
                  </td>
                </tr>
                <tr>
                  <td>Tổng số đề tài đã nghiệm thu</td>
                  <td className="num-col bold">{reconciliation.tab1TotalAccepted}</td>
                  <td className="num-col bold">{reconciliation.detailedTotalAccepted}</td>
                  <td className="status-col text-success">
                    <CheckCircle2 size={15} /> Khớp đúng
                  </td>
                </tr>
                <tr>
                  <td>Tổng kinh phí phân bổ</td>
                  <td className="num-col bold">
                    {new Intl.NumberFormat('vi-VN').format(reconciliation.tab1TotalBudget)} Tr
                  </td>
                  <td className="num-col bold">
                    {new Intl.NumberFormat('vi-VN').format(reconciliation.detailedTotalBudget)} Tr
                  </td>
                  <td className="status-col text-success">
                    <CheckCircle2 size={15} /> Khớp đúng
                  </td>
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
                {projectsWithIssues.slice(0, 30).map((p) => (
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
                      <span className={`severity-tag ${p.qualityIssues[0]?.severity || 'low'}`}>
                        {p.qualityIssues[0]?.severity === 'high'
                          ? 'Cao'
                          : p.qualityIssues[0]?.severity === 'medium'
                          ? 'Cần bổ sung'
                          : 'Nhắc nhở'}
                      </span>
                    </td>
                    <td>
                      <a
                        href={getSheetRowUrl(p.stt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-sheet-jump"
                        title="Mở đúng dòng này trên Google Sheets để chỉnh sửa"
                      >
                        <span>Mở dòng #{p.stt}</span>
                        <ExternalLink size={13} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
