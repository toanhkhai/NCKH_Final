import React from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  XCircle,
  FileCheck2,
  Calendar,
} from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { acceptanceSeries, flagCount, isAcceptedProject } from '../../services/projectAnalytics';

export const ProgressView: React.FC = () => {
  const { filteredProjects, theme, setSelectedProject } = useDashboard();
  const projects = filteredProjects;

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Metrics
  const acceptedProjects = projects.filter(isAcceptedProject);
  const overdueProjects = projects.filter((p) => p.status === 'QUA_HAN');
  const extendedProjects = projects.filter((p) => p.isExtended);
  const stoppedProjects = projects.filter((p) => p.isStopped);
  const hasKnownProgress = projects.some((p) => p.status !== 'CHUA_CAP_NHAT' && p.status !== 'CHO_NGHIEM_THU');

  // Chart 1: Dual Bar: Nghiệm thu theo năm giao vs Nghiệm thu theo năm Thống kê
  const acceptance = acceptanceSeries(projects);
  const years = acceptance.years;
  const acceptedByAssignedYear = acceptance.assigned;
  const acceptedByStatsYear = acceptance.accepted;

  const dualBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      textStyle: { color: textColor },
      top: '2%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      top: '16%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: years.map((y) => `Năm ${y}`),
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: gridLineColor } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: gridLineColor } },
    },
    series: [
      {
        name: 'Nghiệm thu (Theo Năm Giao đề tài)',
        type: 'bar',
        data: acceptedByAssignedYear,
        itemStyle: { color: '#0ea5e9', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: 'Nghiệm thu (Theo Năm Thống Kê / Năm NT)',
        type: 'bar',
        data: acceptedByStatsYear,
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  // Group Cancellation Decisions
  const cancellationGroups: Record<string, number> = {};
  stoppedProjects.forEach((p) => {
    const dec = p.stopDecision || 'Quyết định khác';
    // Normalize key
    const key = dec.replace(/\s+/g, ' ').trim();
    cancellationGroups[key] = (cancellationGroups[key] || 0) + 1;
  });

  return (
    <div className="progress-view-container animate-fade-in">
      <div className="view-intro-box">
        <h2 className="view-title">Theo Dõi Tiến Độ Thực Hiện & Nghiệm Thu Đề Tài</h2>
        <p className="view-subtitle">
          Giám sát chu kỳ thực hiện đề tài từ khi giao, gia hạn, nghiệm thu đến các đợt thu hồi quyết định.
        </p>
      </div>

      {/* Progress Cards */}
      <div className="progress-kpi-row">
        <div className="progress-mini-card glass-card">
          <div className="mini-icon-box emerald">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="mini-val">{flagCount(projects, 'accepted') === null ? 'Chưa cập nhật' : acceptedProjects.length}</div>
            <div className="mini-label">Đã nghiệm thu chính thức</div>
          </div>
        </div>

        <div className="progress-mini-card glass-card">
          <div className="mini-icon-box amber">
            <History size={20} />
          </div>
          <div>
            <div className="mini-val">{flagCount(projects, 'extended') === null ? 'Chưa cập nhật' : extendedProjects.length}</div>
            <div className="mini-label">Đề tài được duyệt gia hạn</div>
          </div>
        </div>

        <div className="progress-mini-card glass-card">
          <div className="mini-icon-box red">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="mini-val">{projects.length && !hasKnownProgress ? 'Chưa đủ dữ liệu' : overdueProjects.length}</div>
            <div className="mini-label">Đề tài quá hạn thực hiện</div>
          </div>
        </div>

        <div className="progress-mini-card glass-card">
          <div className="mini-icon-box slate">
            <XCircle size={20} />
          </div>
          <div>
            <div className="mini-val">{flagCount(projects, 'stopped') === null ? 'Chưa cập nhật' : stoppedProjects.length}</div>
            <div className="mini-label">Đề tài có quyết định hủy</div>
          </div>
        </div>
      </div>

      {/* Dual Bar Chart */}
      <div className="chart-card glass-card">
        <div className="chart-card-header">
          <div className="chart-title-box">
            <Calendar size={18} className="title-icon sky" />
            <h3 className="chart-title">
              So Sánh: Nghiệm Thu Theo Năm Giao vs Nghiệm Thu Theo Năm Thống Kê
            </h3>
          </div>
        </div>
        <div className="chart-wrapper">
          <ReactECharts option={dualBarOption} style={{ height: '360px', width: '100%' }} />
        </div>
      </div>

      {/* Cancellation Batches & Overdue Warnings */}
      <div className="charts-grid-2">
        {/* Cancellation Batches */}
        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <XCircle size={18} className="title-icon rose" />
              <h3 className="chart-title">Các đợt thu hồi / hủy ({stoppedProjects.length} đề tài đã ghi nhận)</h3>
            </div>
          </div>
          <div className="cancellation-list">
            {!stoppedProjects.length && <p className="chart-note">Chưa ghi nhận đề tài ngưng/hủy theo bộ lọc.</p>}
            {Object.entries(cancellationGroups).map(([dec, count], idx) => (
              <div key={idx} className="cancellation-item">
                <div className="cancellation-info">
                  <span className="cancellation-name">{dec}</span>
                  <span className="cancellation-count badge badge-danger">
                    {count} đề tài thu hồi
                  </span>
                </div>
                <div className="cancellation-bar-bg">
                  <div
                    className="cancellation-bar-fill"
                    style={{ width: `${stoppedProjects.length ? count / stoppedProjects.length * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Overdue or Warning list */}
        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <AlertTriangle size={18} className="title-icon amber" />
              <h3 className="chart-title">Cảnh Báo Đề Tài Cần Lưu Ý Đôn Đốc</h3>
            </div>
          </div>
          <div className="warning-scroll-list">
            {!overdueProjects.length && <p className="chart-note">Chưa ghi nhận đề tài quá hạn theo bộ lọc.</p>}
            {overdueProjects.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="warning-item clickable"
                onClick={() => setSelectedProject(p)}
              >
                <div className="warning-item-left">
                  <div className="warning-title">{p.title}</div>
                  <div className="warning-meta">
                    <span>Chủ nhiệm: <strong>{p.pi.name}</strong></span>
                    <span>• {p.assigningUnit}</span>
                    <span className="text-warning">
                      • Hạn thực hiện: {p.effectiveEndDate?.toLocaleDateString('vi-VN') ?? 'Chưa cập nhật'}
                    </span>
                  </div>
                </div>
                <button className="view-detail-mini-btn">Chi tiết</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
