import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Building2, Award, Coins, XCircle, ArrowUpRight } from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { STANDARD_UNITS } from '../../config/units';
import { STATUS_COLORS, STATUS_LABELS, type ProjectStatus, type StandardUnit } from '../../types/project';
import { buildUnitYearHeatmap, heatmapTone, HEATMAP_LOW, HEATMAP_HIGH } from '../../services/unitHeatmap';
import '../../styles/units.css';
import { budgetSummary, flagCount, isAcceptedProject, projectFlag } from '../../services/projectAnalytics';

export const UnitsView: React.FC<{ onOpenProjects?: () => void }> = ({ onOpenProjects }) => {
  const { filteredProjects, filters, availableYears, theme, updateFilters, setActiveView } = useDashboard();

  const projects = filteredProjects;
  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Unit performance stats
  const units = filters.unit === 'ALL' ? [...new Set([...STANDARD_UNITS, ...projects.map((p) => p.assigningUnit)])] : [filters.unit];
  const unitStats = units.map((unit) => {
    const unitProjects = projects.filter((p) => p.assigningUnit === unit);
    const total = unitProjects.length;
    const accepted = flagCount(unitProjects, 'accepted') === null ? null : unitProjects.filter(isAcceptedProject).length;
    const stopped = unitProjects.filter((p) => p.isStopped).length;
    const extended = unitProjects.filter((p) => p.isExtended).length;
    const totalBudget = budgetSummary(unitProjects).total;
    const acceptRate = accepted === null ? null : total > 0 ? Number(((accepted / total) * 100).toFixed(1)) : 0;
    const excellentCount = unitProjects.filter((p) => p.grade === 'XUAT_SAC').length;

    return {
      unit,
      total,
      accepted,
      stopped,
      extended,
      totalBudget,
      acceptRate,
      excellentCount,
    };
  }).sort((a, b) => b.total - a.total);

  // Heatmap Data: Unit x Year
  const heatmap = useMemo(() => buildUnitYearHeatmap(projects, {
    years: filters.year === 'ALL' ? availableYears : [filters.year],
    units: filters.unit === 'ALL' ? STANDARD_UNITS : [filters.unit],
  }), [projects, availableYears, filters.year, filters.unit]);
  const heatmapHeight = Math.max(150, heatmap.units.length * 40 + 48);

  const heatmapOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      transitionDuration: 0,
      backgroundColor: '#ffffff',
      borderColor: '#d7dee7',
      borderWidth: 1,
      padding: [9, 12],
      textStyle: { color: '#334155', fontSize: 12 },
      formatter: (params: any) => {
        const [x, y, count] = params.value;
        return `<strong>${heatmap.units[y]}</strong><br/>Năm giao: ${heatmap.years[x] ?? 'Chưa rõ'}<br/>Số đề tài: <b>${count}</b>`;
      },
    },
    grid: {
      top: 8,
      bottom: 36,
      left: 148,
      right: 12,
    },
    xAxis: {
      type: 'category',
      data: heatmap.years.map((year) => year === null ? 'Chưa rõ' : String(year)),
      axisLabel: { color: textColor, fontSize: 11, interval: 0, margin: 12 },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: heatmap.units,
      axisLabel: { color: textColor, fontSize: 11, interval: 0, margin: 12, lineHeight: 14,
        formatter: (unit: string) => unit === 'Phòng, trung tâm, thư viện' ? 'Phòng, trung tâm,\nthư viện' : unit },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    // ECharts requires visualMap for heatmaps; the separate HTML legend stays below the axes.
    visualMap: {
      type: 'piecewise',
      show: false,
      dimension: 2,
      seriesIndex: 0,
      pieces: [...new Set(heatmap.cells.map((cell) => cell[2]))].map((count) => ({
        value: count, color: heatmapTone(count, heatmap.max).background,
      })),
    },
    series: [
      {
        name: 'Đề tài',
        type: 'heatmap',
        data: heatmap.cells.map((value) => {
          const tone = heatmapTone(value[2], heatmap.max);
          return { value, itemStyle: { color: tone.background, borderColor: '#ffffff', borderWidth: 2 }, label: { color: tone.text } };
        }),
        label: {
          show: true,
          fontWeight: 600,
          fontSize: 12,
        },
        emphasis: {
          itemStyle: {
            borderWidth: 2,
            borderColor: '#64748b',
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
      confine: true,
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '5%',
      bottom: 68,
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
    legend: { bottom: 0, type: 'plain', textStyle: { fontSize: 10, color: textColor }, itemWidth: 8, itemHeight: 8, itemGap: 12 },
    series: (Object.keys(STATUS_LABELS) as ProjectStatus[]).filter((status) => projects.some((p) => p.status === status)).map((status) => ({
      name: STATUS_LABELS[status], type: 'bar', stack: 'total', itemStyle: { color: STATUS_COLORS[status] },
      data: [...unitStats].reverse().map((unit) => projects.filter((p) => p.assigningUnit === unit.unit && p.status === status).length),
    })),
  };

  const handleUnitClick = (unit: StandardUnit) => {
    updateFilters({ unit });
    if (onOpenProjects) onOpenProjects();
    else setActiveView('projects');
  };

  return (
    <div className="units-view-container">
      <header className="units-heading">
        <div>
          <h2>Đề tài theo khoa và đơn vị</h2>
          <p>Số đề tài được giao, kết quả nghiệm thu và kinh phí theo bộ lọc hiện tại.</p>
        </div>
        <div className="units-heading-meta">
          <span>{unitStats.length} đơn vị</span>
          <span>{projects.length.toLocaleString('vi-VN')} đề tài</span>
        </div>
      </header>

      <div className="unit-cards-grid" aria-label="Thống kê đề tài theo đơn vị">
        {unitStats.map((u) => (
          <div
            key={u.unit}
            className="unit-summary-card glass-card"
            role="button"
            tabIndex={0}
            aria-label={`Xem danh sách đề tài của ${u.unit}. Đã giao ${u.total}, nghiệm thu ${u.accepted ?? 'chưa cập nhật'}, tỷ lệ ${u.acceptRate === null ? 'chưa cập nhật' : `${u.acceptRate}%`}, kinh phí ${u.totalBudget === null ? 'chưa cập nhật' : `${u.totalBudget} triệu đồng`}, đã ghi nhận hủy ${u.stopped}.`}
            onClick={() => handleUnitClick(u.unit)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleUnitClick(u.unit);
              }
            }}
          >
            <div className="unit-card-header">
              <span className="unit-name">{u.unit}</span>
              <span className="unit-inspect-btn" aria-hidden="true"><ArrowUpRight size={16} /></span>
            </div>
            <div className="unit-card-metric-row">
              <div className="metric-box">
                <span className="metric-num">{u.total.toLocaleString('vi-VN')}</span>
                <span className="metric-sub">Đã giao</span>
              </div>
              <div className="metric-box">
                <span className="metric-num">{u.accepted?.toLocaleString('vi-VN') ?? '—'}</span>
                <span className="metric-sub">Nghiệm thu</span>
              </div>
              <div className="metric-box">
                <span className="metric-num">{u.acceptRate === null ? '—' : `${u.acceptRate.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`}</span>
                <span className="metric-sub">Tỷ lệ nghiệm thu</span>
              </div>
            </div>
            <div className="unit-card-footer">
              <div className="footer-item"><Coins size={13} aria-hidden="true" /><span>{u.totalBudget === null ? 'Kinh phí chưa cập nhật' : `${u.totalBudget.toLocaleString('vi-VN')} Tr VNĐ`}</span></div>
              {u.stopped > 0 && <div className="footer-item"><XCircle size={13} aria-hidden="true" /><span>{u.stopped} đã hủy</span></div>}
            </div>
          </div>
        ))}
      </div>

      <p className="chart-note">Nghiệm thu là số hồ sơ đã được xác nhận, tỷ lệ tính trên tổng hồ sơ được giao. Có {projects.filter((project) => projectFlag(project, 'accepted') === null).length} hồ sơ chưa cập nhật cờ nghiệm thu; dấu — là chưa có dữ liệu xác nhận.</p>

      {/* Row Charts: Heatmap & Stacked Bar */}
      <div className="charts-grid-2">
        <div className="chart-card glass-card unit-heatmap-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <Building2 size={18} className="title-icon sky" />
              <h3 className="chart-title">Số đề tài theo đơn vị và năm giao</h3>
            </div>
          </div>
          <p className="unit-chart-description">{heatmap.total.toLocaleString('vi-VN')} đề tài theo bộ lọc hiện tại. Mỗi ô đếm theo đơn vị chủ trì và năm giao.</p>
          {heatmap.total > 0 ? <>
            <div className="unit-heatmap-scroll" tabIndex={0} role="region" aria-label="Biểu đồ số đề tài theo đơn vị và năm giao">
              <div className="unit-heatmap-canvas" style={{ minWidth: Math.max(410, 160 + heatmap.years.length * 40) }}>
                <ReactECharts option={heatmapOption} notMerge style={{ height: heatmapHeight, width: '100%' }} />
              </div>
            </div>
            <div className="unit-heatmap-legend" aria-label={`Thang màu từ 0 đến ${heatmap.max} đề tài`}>
              <span>Số đề tài:</span><span className="heatmap-zero-swatch" /> <span>0</span>
              {heatmap.max > 1 ? <><span className="heatmap-scale-start">1</span><span className="heatmap-gradient" style={{ background: `linear-gradient(to right, ${HEATMAP_LOW}, ${HEATMAP_HIGH})` }} /><span>{heatmap.max}</span></> : <><span className="heatmap-positive-swatch" /> <span>1</span></>}
            </div>
          </> : <p className="unit-chart-empty">Không có đề tài phù hợp với bộ lọc hiện tại.</p>}
        </div>

        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <Award size={18} className="title-icon emerald" />
              <h3 className="chart-title">Cơ cấu trạng thái đề tài theo đơn vị</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={barOption} notMerge style={{ height: '420px', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
