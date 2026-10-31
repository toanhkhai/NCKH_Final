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

export const ProgressView: React.FC = () => {
  const { filteredProjects, theme, setSelectedProject } = useDashboard();
  const projects = filteredProjects;

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Metrics
  const acceptedProjects = projects.filter((p) => p.isAccepted);
  const overdueProjects = projects.filter((p) => p.status === 'QUA_HAN');
  const extendedProjects = projects.filter((p) => p.isExtended);
  const stoppedProjects = projects.filter((p) => p.isStopped);

  // Chart 1: Dual Bar: Nghiệm thu theo năm giao vs Nghiệm thu theo năm Thống kê
  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  // Accepted by assigned year: project started in Y and is accepted
  const acceptedByAssignedYear = years.map(
    (y) => projects.filter((p) => p.startYear === y && p.isAccepted).length
  );
  // Accepted by acceptance year: project accepted in Y
  const acceptedByStatsYear = years.map(
    (y) => projects.filter((p) => p.acceptYear === y).length
  );

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
    let key = dec.replace(/\n.*/g, '').trim();
    if (key.includes('2781')) key = 'QĐ 2781/QĐ-ĐHYDCT (04/09/2024)';
    else if (key.includes('3964')) key = 'QĐ 3964/QĐ-ĐHYDCT (10/09/2024)';
    else if (key.toLowerCase().includes('đơn')) key = 'Xin hủy theo đơn cá nhân';
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
            <div className="mini-val">{acceptedProjects.length}</div>
            <div className="mini-label">Đã nghiệm thu chính thức</div>
          </div>
        </div>

        <div className="progress-mini-card glass-card">
          <div className="mini-icon-box amber">
            <History size={20} />
          </div>
          <div>
            <div className="mini-val">{extendedProjects.length}</div>
            <div className="mini-label">Đề tài được duyệt gia hạn</div>
          </div>
        </div>

        <div className="progress-mini-card glass-card">
          <div className="mini-icon-box red">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="mini-val">{overdueProjects.length}</div>
            <div className="mini-label">Đề tài quá hạn thực hiện</div>
          </div>
        </div>

        <div className="progress-mini-card glass-card">
          <div className="mini-icon-box slate">
            <XCircle size={20} />
          </div>
          <div>
            <div className="mini-val">{stoppedProjects.length}</div>
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
        <p className="chart-note">
          * Năm giao: phản ánh các đề tài được khởi động năm đó đã hoàn thành (tính lũy kế). Năm thống kê: phản ánh số lượng hội đồng nghiệm thu thực tế đã tổ chức trong năm đó.
        </p>
      </div>

      {/* Cancellation Batches & Overdue Warnings */}
      <div className="charts-grid-2">
        {/* Cancellation Batches */}
        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <XCircle size={18} className="title-icon rose" />
              <h3 className="chart-title">Thống Kê Các Đợt Thu Hồi / Hủy Đề Tài (71 đề tài)</h3>
            </div>
          </div>
          <div className="cancellation-list">
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
                    style={{ width: `${Math.min(100, (count / 40) * 100)}%` }}
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
                      • Hạn ban đầu: {p.endMonth}/{p.endYear}
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
