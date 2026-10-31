import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Building2, Award, Coins, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { STANDARD_UNITS, UNIT_COLORS } from '../../config/units';
import { StandardUnit } from '../../types/project';

export const UnitsView: React.FC = () => {
  const { data, filteredProjects, theme, updateFilters, setActiveView } = useDashboard();
  const [selectedUnit, setSelectedUnit] = useState<StandardUnit | null>(null);

  const projects = filteredProjects;
  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Unit performance stats
  const unitStats = STANDARD_UNITS.map((unit) => {
    const unitProjects = projects.filter((p) => p.assigningUnit === unit);
    const total = unitProjects.length;
    const accepted = unitProjects.filter((p) => p.isAccepted).length;
    const stopped = unitProjects.filter((p) => p.isStopped).length;
    const extended = unitProjects.filter((p) => p.isExtended).length;
    const totalBudget = unitProjects.reduce((sum, p) => sum + p.budget, 0);
    const avgBudget = total > 0 ? (totalBudget / total).toFixed(1) : '0';
    const acceptRate = total > 0 ? ((accepted / total) * 100).toFixed(1) : '0';
    const excellentCount = unitProjects.filter((p) => p.grade === 'XUAT_SAC').length;

    return {
      unit,
      total,
      accepted,
      stopped,
      extended,
      totalBudget,
      avgBudget,
      acceptRate: parseFloat(acceptRate),
      excellentCount,
      color: UNIT_COLORS[unit],
    };
  }).sort((a, b) => b.total - a.total);

  // Heatmap Data: Unit x Year
  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  const heatmapData: Array<[number, number, number]> = [];

  years.forEach((y, yIdx) => {
    STANDARD_UNITS.forEach((unit, uIdx) => {
      const count = projects.filter((p) => p.startYear === y && p.assigningUnit === unit).length;
      heatmapData.push([yIdx, uIdx, count]);
    });
  });

  const heatmapOption = {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const year = years[params.data[0]];
        const unit = STANDARD_UNITS[params.data[1]];
        const val = params.data[2];
        return `<strong>${unit} (${year})</strong><br/>Số đề tài giao: <b>${val}</b>`;
      },
    },
    grid: {
      top: '5%',
      bottom: '10%',
      left: '18%',
      right: '6%',
    },
    xAxis: {
      type: 'category',
      data: years.map((y) => `Năm ${y}`),
      splitArea: { show: true },
      axisLabel: { color: textColor, fontWeight: 500 },
      axisLine: { lineStyle: { color: gridLineColor } },
    },
    yAxis: {
      type: 'category',
      data: STANDARD_UNITS,
      splitArea: { show: true },
      axisLabel: { color: textColor, fontWeight: 500 },
      axisLine: { lineStyle: { color: gridLineColor } },
    },
    visualMap: {
      min: 0,
      max: 60,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#0f172a', '#0369a1', '#0ea5e9', '#38bdf8', '#34d399'],
      },
      textStyle: { color: textColor },
    },
    series: [
      {
        name: 'Đề tài',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          color: '#ffffff',
          fontWeight: 600,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  // Unit Horizontal Bar Chart
  const barOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '5%',
      bottom: '5%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: gridLineColor } },
    },
    yAxis: {
      type: 'category',
      data: unitStats.map((u) => u.unit).reverse(),
      axisLabel: { color: textColor, fontWeight: 500 },
      axisLine: { lineStyle: { color: gridLineColor } },
    },
    series: [
      {
        name: 'Đã nghiệm thu',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#10b981' },
        data: unitStats.map((u) => u.accepted).reverse(),
      },
      {
        name: 'Chưa nghiệm thu',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#0ea5e9' },
        data: unitStats.map((u) => u.total - u.accepted - u.stopped).reverse(),
      },
      {
        name: 'Đã ngưng / hủy',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#64748b' },
        data: unitStats.map((u) => u.stopped).reverse(),
      },
    ],
  };

  const handleUnitClick = (unit: StandardUnit) => {
    updateFilters({ unit });
    setActiveView('projects');
  };

  return (
    <div className="units-view-container animate-fade-in">
      <div className="view-intro-box">
        <h2 className="view-title">Thống Kê Đề Tài Theo 9 Khoa & Đơn Vị Trực Thuộc</h2>
        <p className="view-subtitle">
          Phân tích chi tiết quy mô, tỷ lệ nghiệm thu, kinh phí và mức độ hoàn thành nhiệm vụ KHCN của từng Khoa, Bệnh viện và Trung tâm.
        </p>
      </div>

      {/* 9 Unit Cards Grid */}
      <div className="unit-cards-grid">
        {unitStats.map((u) => (
          <div
            key={u.unit}
            className="unit-summary-card glass-card"
            style={{ borderLeftColor: u.color, borderLeftWidth: '4px' }}
            onClick={() => handleUnitClick(u.unit)}
          >
            <div className="unit-card-header">
              <span className="unit-name" style={{ color: u.color }}>
                {u.unit}
              </span>
              <button className="unit-inspect-btn" title="Xem danh sách đề tài của đơn vị này">
                <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="unit-card-metric-row">
              <div className="metric-box">
                <span className="metric-num">{u.total}</span>
                <span className="metric-sub">Đã giao</span>
              </div>
              <div className="metric-box">
                <span className="metric-num text-success">{u.accepted}</span>
                <span className="metric-sub">Nghiệm thu</span>
              </div>
              <div className="metric-box">
                <span className="metric-num text-warning">{u.acceptRate}%</span>
                <span className="metric-sub">Tỷ lệ xong</span>
              </div>
            </div>

            <div className="unit-card-footer">
              <div className="footer-item">
                <Coins size={13} />
                <span>{new Intl.NumberFormat('vi-VN').format(u.totalBudget)} Tr VNĐ</span>
              </div>
              {u.stopped > 0 && (
                <div className="footer-item text-muted">
                  <XCircle size={13} />
                  <span>{u.stopped} đã hủy</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Row Charts: Heatmap & Stacked Bar */}
      <div className="charts-grid-2">
        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <Building2 size={18} className="title-icon sky" />
              <h3 className="chart-title">Mật độ Giao Đề tài theo Đơn vị & Năm (Heatmap)</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={heatmapOption} style={{ height: '360px', width: '100%' }} />
          </div>
        </div>

        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <Award size={18} className="title-icon emerald" />
              <h3 className="chart-title">Cơ cấu Hoàn thành & Tỷ lệ Nghiệm thu theo Đơn vị</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={barOption} style={{ height: '360px', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
