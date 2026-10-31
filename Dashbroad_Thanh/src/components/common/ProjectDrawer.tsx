import React from 'react';
import {
  X,
  Calendar,
  Building,
  User,
  Coins,
  FileText,
  AlertCircle,
  ExternalLink,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import {
  GRADE_COLORS,
  GRADE_LABELS,
  LEVEL_LABELS,
  Project,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../types/project';

interface ProjectDrawerProps {
  project: Project | null;
  onClose: () => void;
}

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({ project, onClose }) => {
  if (!project) return null;

  const formatDate = (d?: Date) => {
    if (!d) return '—';
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const statusColor = STATUS_COLORS[project.status];
  const gradeColor = GRADE_COLORS[project.grade];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <span className="drawer-level-tag">{LEVEL_LABELS[project.level]}</span>
            <span className="drawer-stt">STT #{project.stt}</span>
            <span
              className="badge drawer-status-badge"
              style={{ backgroundColor: `${statusColor}22`, color: statusColor, borderColor: statusColor }}
            >
              {STATUS_LABELS[project.status]}
            </span>
          </div>

          <button className="drawer-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Project Title */}
        <div className="drawer-title-box">
          <h2 className="drawer-project-title">{project.title}</h2>
          {project.code && <div className="drawer-project-code">Mã số đề tài: {project.code}</div>}
        </div>

        {/* Quality Alerts */}
        {project.qualityIssues.length > 0 && (
          <div className="drawer-alerts-box">
            {project.qualityIssues.map((issue, idx) => (
              <div key={idx} className={`drawer-alert alert-${issue.severity}`}>
                <AlertCircle size={16} />
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="drawer-body">
          {/* 1. General & Timeline */}
          <section className="drawer-section">
            <h3 className="drawer-section-title">
              <Calendar size={16} />
              <span>Thời gian thực hiện</span>
            </h3>
            <div className="drawer-grid-2">
              <div className="drawer-field">
                <span className="field-label">Thời gian bắt đầu:</span>
                <span className="field-value">
                  Tháng {project.startMonth?.toString().padStart(2, '0') || '—'}/{project.startYear || '—'}
                </span>
              </div>
              <div className="drawer-field">
                <span className="field-label">Thời gian kết thúc:</span>
                <span className="field-value">
                  Tháng {project.endMonth?.toString().padStart(2, '0') || '—'}/{project.endYear || '—'}
                </span>
              </div>
              <div className="drawer-field">
                <span className="field-label">Thời lượng dự kiến:</span>
                <span className="field-value">{project.durationMonths} tháng</span>
              </div>
              <div className="drawer-field">
                <span className="field-label">Tình trạng gia hạn:</span>
                <span className="field-value">
                  {project.isExtended ? (
                    <span className="text-warning">
                      Có gia hạn {project.extendedMonths ? `(${project.extendedMonths} tháng)` : ''} {project.extendedDateText || ''}
                    </span>
                  ) : (
                    'Không gia hạn'
                  )}
                </span>
              </div>
            </div>
          </section>

          {/* 2. Assignment & Units */}
          <section className="drawer-section">
            <h3 className="drawer-section-title">
              <Building size={16} />
              <span>Đơn vị & Quyết định giao</span>
            </h3>
            <div className="drawer-grid-2">
              <div className="drawer-field">
                <span className="field-label">Đơn vị chủ trì:</span>
                <span className="field-value bold-unit">{project.assigningUnit}</span>
              </div>
              <div className="drawer-field">
                <span className="field-label">Quyết định giao đề tài:</span>
                <span className="field-value">{project.assignDecision || 'Chưa cập nhật'}</span>
              </div>
              {project.placeOfExecution && (
                <div className="drawer-field full-width">
                  <span className="field-label">Nơi thực hiện:</span>
                  <span className="field-value">{project.placeOfExecution}</span>
                </div>
              )}
            </div>
          </section>

          {/* 3. Research Team */}
          <section className="drawer-section">
            <h3 className="drawer-section-title">
              <Users size={16} />
              <span>Nhân sự thực hiện ({project.members.length} người)</span>
            </h3>

            {/* PI Card */}
            <div className="pi-highlight-card">
              <div className="pi-avatar">
                <User size={22} />
              </div>
              <div className="pi-info">
                <div className="pi-role-tag">Chủ nhiệm đề tài</div>
                <div className="pi-name">{project.pi.name}</div>
                <div className="pi-sub">
                  {project.pi.staffId && <span className="mscb-badge">MSCB: {project.pi.staffId}</span>}
                  <span className="unit-badge">{project.pi.unitGroup}</span>
                </div>
              </div>
            </div>

            {/* Co-researchers */}
            {project.members.length > 1 && (
              <div className="members-list">
                <div className="members-heading">Cán bộ phối hợp tham gia:</div>
                <div className="members-grid">
                  {project.members.slice(1).map((m, idx) => (
                    <div key={idx} className="member-item">
                      <div className="member-name">{m.name}</div>
                      <div className="member-meta">
                        {m.staffId && <span className="member-mscb">MSCB: {m.staffId}</span>}
                        <span className="member-unit">{m.unitGroup}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 4. Financials & Collaborations */}
          <section className="drawer-section">
            <h3 className="drawer-section-title">
              <Coins size={16} />
              <span>Kinh phí & Hợp tác</span>
            </h3>
            <div className="drawer-grid-2">
              <div className="drawer-field">
                <span className="field-label">Kinh phí đề tài:</span>
                <span className="field-value budget-highlight">
                  {new Intl.NumberFormat('vi-VN').format(project.budget)} triệu đồng
                  <span className="budget-sub">({(project.budget * 1000000).toLocaleString('vi-VN')} VNĐ)</span>
                </span>
              </div>
              <div className="drawer-field">
                <span className="field-label">Thanh lý hợp đồng:</span>
                <span className="field-value">
                  {project.isLiquidated ? (
                    <span className="badge-liquidated yes">Đã thanh lý hợp đồng</span>
                  ) : (
                    <span className="badge-liquidated no">Chưa thanh lý</span>
                  )}
                </span>
              </div>
              <div className="drawer-field">
                <span className="field-label">Đơn vị tài trợ:</span>
                <span className="field-value">
                  {project.hasSponsor ? project.sponsorName || 'Có đơn vị tài trợ' : 'Không'}
                </span>
              </div>
              <div className="drawer-field">
                <span className="field-label">Hợp tác DN/CSYT:</span>
                <span className="field-value">
                  {project.hasEnterpriseCollab ? project.enterpriseName || 'Có hợp tác' : 'Không'}
                </span>
              </div>
            </div>
          </section>

          {/* 5. Acceptance & Evaluation */}
          <section className="drawer-section">
            <h3 className="drawer-section-title">
              <Award size={16} />
              <span>Kết quả Nghiệm thu</span>
            </h3>
            <div className="drawer-grid-2">
              <div className="drawer-field">
                <span className="field-label">Trạng thái nghiệm thu:</span>
                <span className="field-value">
                  {project.isAccepted ? (
                    <span className="status-pill accepted">
                      <CheckCircle2 size={14} />
                      Đã nghiệm thu chính thức
                    </span>
                  ) : (
                    <span className="status-pill pending">Chưa nghiệm thu</span>
                  )}
                </span>
              </div>
              <div className="drawer-field">
                <span className="field-label">Xếp loại đề tài:</span>
                <span
                  className="grade-display-tag"
                  style={{ color: gradeColor, borderColor: gradeColor }}
                >
                  {GRADE_LABELS[project.grade]}
                </span>
              </div>
              <div className="drawer-field">
                <span className="field-label">Quyết định nghiệm thu:</span>
                <span className="field-value">{project.acceptDecision || '—'}</span>
              </div>
              <div className="drawer-field">
                <span className="field-label">Ngày nghiệm thu:</span>
                <span className="field-value">
                  {project.acceptDate ? formatDate(project.acceptDate) : '—'}
                  {project.delayMonths && project.delayMonths > 0 && (
                    <span className="delay-badge">Trễ {project.delayMonths} tháng so với hạn ban đầu</span>
                  )}
                </span>
              </div>
              {project.acceptProofUrl && (
                <div className="drawer-field full-width">
                  <span className="field-label">Minh chứng (Biên bản):</span>
                  <a
                    href={project.acceptProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="proof-link"
                  >
                    <span>Xem file scan biên bản nghiệm thu</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* 6. Cancelled Status (if applicable) */}
          {project.isStopped && (
            <section className="drawer-section stopped-section">
              <h3 className="drawer-section-title text-danger">
                <XCircle size={16} />
                <span>Thông tin Ngưng / Hủy thực hiện</span>
              </h3>
              <div className="drawer-field">
                <span className="field-label">Quyết định hủy:</span>
                <span className="field-value text-danger font-medium">
                  {project.stopDecision || 'Đã có quyết định hủy'}
                </span>
              </div>
            </section>
          )}

          {/* 7. Extra impact notes */}
          {project.impactNote && (
            <section className="drawer-section">
              <h3 className="drawer-section-title">
                <FileText size={16} />
                <span>Ý nghĩa, tác động kinh tế - xã hội</span>
              </h3>
              <p className="impact-text">{project.impactNote}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
