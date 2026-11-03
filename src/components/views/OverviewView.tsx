import React from 'react';
import ReactECharts from 'echarts-for-react';
import {
  FolderGit2,
  CheckCircle,
  Clock,
  XCircle,
  Coins,
  History,
  TrendingUp,
  Award,
  PieChart,
  Building,
} from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { KpiCard } from '../common/KpiCard';
import { EmptyState } from '../common/EmptyState';
import { GRADE_COLORS, STATUS_COLORS, STATUS_LABELS, LEVEL_LABELS } from '../../types/project';
import { yearSeries, budgetSummary, flagCount, isAcceptedProject } from '../../services/projectAnalytics';
import { UNIT_COLORS, STANDARD_UNITS } from '../../config/units';
import { buildUnitYearHeatmap } from '../../services/unitHeatmap';

export const OverviewView: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
  const { data, filters, filteredProjects, theme, isLoading } = useDashboard();

  if (isLoading) {
    return <EmptyState title="Đang tải dữ liệu…" description="" />;
  }

  if (!data?.projects.length) {
    return (
      <EmptyState
        title="Chưa có dữ liệu đề tài"
        description="Chưa có đề tài để hiển thị."
      />
    );
  }

  const projects = filteredProjects;

  // KPI Metrics Calculation
  const totalAssigned = projects.length;
  const acceptedProjects = projects.filter(isAcceptedProject);
  const acceptedCount = acceptedProjects.length;
  const acceptedKnown = flagCount(projects, 'accepted');
  const ongoingCount = projects.filter((p) => p.status === 'DANG_THUC_HIEN').length;
  const overdueCount = projects.filter((p) => p.status === 'QUA_HAN').length;
  const pendingCount = projects.filter((p) => p.status === 'CHO_NGHIEM_THU').length;
  const unknownStatusCount = projects.filter((p) => p.status === 'CHUA_CAP_NHAT').length;
  const stoppedCount = projects.filter((p) => p.isStopped).length;
  const extendedCount = projects.filter((p) => p.isExtended).length;
  const budget = budgetSummary(projects);
  const totalBudgetMillion = budget.total;

  const acceptedRate = totalAssigned > 0 ? ((acceptedCount / totalAssigned) * 100).toFixed(1) : '0';
  const extendedRate = totalAssigned > 0 ? ((extendedCount / totalAssigned) * 100).toFixed(1) : '0';

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Chart 1: Projects by Year & Budget
  const trend = yearSeries(projects);
  const years = trend.years;
  const yearAssignedCounts = trend.assigned;
  const yearAcceptedCounts = trend.accepted;
  const yearBudgetTotals = trend.budgets;

  const trendChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let str = `<strong>Năm ${params[0].name}</strong><br/>`;
        params.forEach((item: any) => {
          str += `${item.marker} ${item.seriesName}: <b>${typeof item.value === 'number' ? item.value.toLocaleString('vi-VN') : 'Chưa cập nhật'}</b> ${
            item.seriesName.includes('Kinh phí') ? 'triệu' : 'đề tài'
          }<br/>`;
        });
        return str;
      },
    },
    legend: {
      textStyle: { color: textColor },
      top: '0%',
      right: '2%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: years.map((y) => y === null ? 'Chưa rõ năm giao' : `Năm ${y}`),
      axisLine: { lineStyle: { color: gridLineColor } },
      axisLabel: { color: textColor, fontWeight: 500 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Số đề tài',
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridLineColor } },
      },
      {
        type: 'value',
        name: 'Kinh phí (Triệu VNĐ)',
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Đã giao',
        type: 'bar',
        data: yearAssignedCounts,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: '#0ea5e9',
        },
      },
      {
        name: 'Đã nghiệm thu',
        type: 'bar',
        data: yearAcceptedCounts,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: '#10b981',
        },
      },
      {
        name: 'Tổng kinh phí (triệu)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: yearBudgetTotals,
        lineStyle: { width: 3, color: '#f59e0b' },
        itemStyle: { color: '#f59e0b' },
      },
    ],
  };

  const assignedByUnit = buildUnitYearHeatmap(projects);
  const unitYearChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value: number) => `${value.toLocaleString('vi-VN')} đề tài` },
    legend: { type: 'scroll', top: 0, textStyle: { color: textColor } },
    grid: { left: '3%', right: '4%', bottom: 35, top: 75, containLabel: true },
    xAxis: {
      type: 'category', name: 'Năm giao', nameLocation: 'middle', nameGap: 25, nameTextStyle: { color: textColor },
      data: assignedByUnit.years.map((year) => year === null ? 'Chưa rõ' : String(year)),
      axisLabel: { color: textColor }, axisLine: { lineStyle: { color: gridLineColor } },
    },
    yAxis: {
      type: 'value', name: 'Số đề tài', minInterval: 1, nameTextStyle: { color: textColor },
      axisLabel: { color: textColor }, splitLine: { lineStyle: { color: gridLineColor } },
    },
    series: assignedByUnit.units.map((unit, index) => ({
      name: unit, type: 'bar', stack: 'assigned',
      itemStyle: { color: UNIT_COLORS[unit] },
      data: assignedByUnit.cells.filter(([, unitIndex]) => unitIndex === index).map(([, , count]) => count),
    })),
  };

  // Chart 2: Status Donut Chart
  const statusCounts = [
    { name: 'Đã nghiệm thu', value: acceptedCount, itemStyle: { color: STATUS_COLORS.DA_NGHIEM_THU } },
    { name: 'Đang thực hiện', value: ongoingCount, itemStyle: { color: STATUS_COLORS.DANG_THUC_HIEN } },
    { name: 'Quá hạn', value: overdueCount, itemStyle: { color: STATUS_COLORS.QUA_HAN } },
    { name: STATUS_LABELS.CHO_NGHIEM_THU, value: pendingCount, itemStyle: { color: STATUS_COLORS.CHO_NGHIEM_THU } },
    { name: 'Đã ngưng / hủy', value: stoppedCount, itemStyle: { color: STATUS_COLORS.DA_HUY } },
    { name: 'Chưa cập nhật trạng thái', value: unknownStatusCount, itemStyle: { color: STATUS_COLORS.CHUA_CAP_NHAT } },
  ];

  const statusDonutOption = {
    backgroundColor: 'transparent',
    title: {
      text: `{val|${totalAssigned.toLocaleString('vi-VN')}}\n{lbl|Tổng đề tài}`,
      left: '28%',
      top: 'middle',
      textAlign: 'center',
      textStyle: {
        rich: {
          val: {
            fontSize: 26,
            fontWeight: 700,
            color: isDark ? '#f8fafc' : '#0f172a',
            lineHeight: 32,
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          },
          lbl: {
            fontSize: 12,
            fontWeight: 500,
            color: isDark ? '#94a3b8' : '#64748b',
            lineHeight: 18,
          },
        },
      },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: {
        color: isDark ? '#f8fafc' : '#0f172a',
        fontSize: 13,
      },
      formatter: '{b}: <b>{c}</b> đề tài ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '4%',
      top: 'middle',
      itemGap: 14,
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle',
      textStyle: {
        color: textColor,
        fontSize: 13,
        rich: {
          name: {
            width: 100,
            fontSize: 13,
            color: isDark ? '#cbd5e1' : '#334155',
          },
          val: {
            width: 38,
            align: 'right',
            fontSize: 13,
            fontWeight: 700,
            color: isDark ? '#f8fafc' : '#0f172a',
          },
          pct: {
            width: 48,
            align: 'right',
            fontSize: 12,
            color: isDark ? '#94a3b8' : '#64748b',
          },
        },
      },
      formatter: (name: string) => {
        const item = statusCounts.find((s) => s.name === name);
        const count = item ? item.value : 0;
        const pct = totalAssigned > 0 ? ((count / totalAssigned) * 100).toFixed(1) : '0';
        return `{name|${name}}{val|${count.toLocaleString('vi-VN')}}{pct|${pct}%}`;
      },
    },
    series: [
      {
        name: 'Trạng thái',
        type: 'pie',
        radius: ['52%', '72%'],
        center: ['28%', '50%'],
        avoidLabelOverlap: true,
        padAngle: 1.5,
        itemStyle: {
          borderRadius: 4,
          borderWidth: 0,
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 4,
        },
        data: statusCounts,
      },
    ],
  };

  // Chart 3: Evaluation Grades
  const gradeCounts = [
    { name: 'Xuất sắc', value: acceptedProjects.filter((p) => p.grade === 'XUAT_SAC').length, color: GRADE_COLORS.XUAT_SAC },
    { name: 'Tốt', value: acceptedProjects.filter((p) => p.grade === 'TOT').length, color: GRADE_COLORS.TOT },
    { name: 'Khá', value: acceptedProjects.filter((p) => p.grade === 'KHA').length, color: GRADE_COLORS.KHA },
    { name: 'Trung bình', value: acceptedProjects.filter((p) => p.grade === 'TRUNG_BINH').length, color: GRADE_COLORS.TRUNG_BINH },
    { name: 'Chưa xếp loại', value: acceptedProjects.filter((p) => p.grade === 'CHUA_XEP_LOAI').length, color: GRADE_COLORS.CHUA_XEP_LOAI },
  ];

  const gradeBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: gradeCounts.map((g) => g.name),
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
        type: 'bar',
        data: gradeCounts.map((g) => ({
          value: g.value,
          itemStyle: { color: g.color, borderRadius: [4, 4, 0, 0] },
        })),
        label: {
          show: true,
          position: 'top',
          color: textColor,
          fontWeight: 'bold',
        },
      },
    ],
  };

  // Chart 4: Unit Breakdown (Treemap)
  const unitCounts = [...new Set([...STANDARD_UNITS, ...projects.map((project) => project.assigningUnit)])].map((unit) => {
    const count = projects.filter((p) => p.assigningUnit === unit).length;
    return {
      name: unit,
      value: count,
      itemStyle: { color: UNIT_COLORS[unit] },
    };
  }).filter((u) => u.value > 0);

  const unitTreemapOption = {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: '{b}: <b>{c}</b> đề tài',
    },
    series: [
      {
        type: 'treemap',
        data: unitCounts,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: '{b}\n{c} đề tài',
          fontSize: 13,
          color: '#ffffff',
          fontWeight: 600,
        },
        itemStyle: {
          borderColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: 2,
          gapWidth: 2,
        },
      },
    ],
  };

  return (
    <div className="overview-view-container animate-fade-in">
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <KpiCard
          title="Tổng số đề tài"
          value={totalAssigned.toLocaleString('vi-VN')}
          subtitle={filters.year === 'ALL' ? 'Tất cả các năm' : `Năm giao ${filters.year}`}
          icon={<FolderGit2 size={22} />}
          colorScheme="sky"
          trendText={filters.level === 'ALL' ? `${new Set(projects.map((project) => project.level)).size} cấp đề tài` : LEVEL_LABELS[filters.level]}
        />

        <KpiCard
          title="Đề tài đã nghiệm thu"
          value={acceptedKnown === null ? 'Chưa cập nhật' : acceptedCount.toLocaleString('vi-VN')}
          subtitle={acceptedKnown === null ? 'Chưa có số liệu nghiệm thu' : `Chiếm ${acceptedRate}% tổng số đề tài`}
          icon={<CheckCircle size={22} />}
          colorScheme="emerald"
          trendText={acceptedKnown === null ? 'Chưa cập nhật' : `${acceptedRate}%`}
          progressPercent={acceptedKnown === null ? undefined : parseFloat(acceptedRate)}
        />

        <KpiCard
          title="Tổng kinh phí đã cấp"
          value={totalBudgetMillion === null ? 'Chưa cập nhật' : `${totalBudgetMillion.toLocaleString('vi-VN')} Tr`}
          subtitle={totalBudgetMillion === null ? 'Chưa cập nhật' : `${(totalBudgetMillion / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} tỷ đồng`}
          icon={<Coins size={22} />}
          colorScheme="amber"
          trendText="Triệu VNĐ"
        />

        <KpiCard
          title="Đề tài đã gia hạn"
          value={flagCount(projects, 'extended') === null ? 'Chưa cập nhật' : extendedCount.toLocaleString('vi-VN')}
          subtitle={flagCount(projects, 'extended') === null ? 'Chưa có số liệu gia hạn' : `Chiếm ${extendedRate}% tổng số đề tài`}
          icon={<History size={22} />}
          colorScheme="purple"
          trendText={flagCount(projects, 'extended') === null ? 'Chưa cập nhật' : `${extendedCount} đã ghi nhận`}
          progressPercent={flagCount(projects, 'extended') === null ? undefined : parseFloat(extendedRate)}
        />

        <KpiCard
          title="Đề tài ngưng / hủy"
          value={flagCount(projects, 'stopped') === null ? 'Chưa cập nhật' : stoppedCount.toLocaleString('vi-VN')}
          subtitle="Theo các Quyết định thu hồi"
          icon={<XCircle size={22} />}
          colorScheme="rose"
          trendText={flagCount(projects, 'stopped') === null ? 'Chưa cập nhật' : `${stoppedCount} đã ghi nhận`}
          progressPercent={flagCount(projects, 'stopped') === null ? undefined : totalAssigned ? stoppedCount / totalAssigned * 100 : 0}
        />
      </div>

      {/* Row 1 Charts: Trend & Status */}
      <div className="charts-grid-2">
        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <TrendingUp size={18} className="title-icon sky" />
              <h3 className="chart-title">{isAdmin ? 'Số lượng Đề tài Giao, Nghiệm thu & Kinh phí qua các Năm' : 'Các đề tài đã giao từng đơn vị theo năm'}</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={isAdmin ? trendChartOption : unitYearChartOption} notMerge style={{ height: '340px', width: '100%' }} />
          </div>
        </div>

        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <PieChart size={18} className="title-icon emerald" />
              <h3 className="chart-title">Cơ cấu Trạng thái Đề tài Thực hiện</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={statusDonutOption} style={{ height: '340px', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Unit Treemap & Grade Bar */}
      <div className="charts-grid-2">
        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <Building size={18} className="title-icon indigo" />
              <h3 className="chart-title">Phân bố Đề tài theo 9 Đơn vị (Khoa / Bệnh viện)</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={unitTreemapOption} style={{ height: '320px', width: '100%' }} />
          </div>
        </div>

        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <Award size={18} className="title-icon amber" />
              <h3 className="chart-title">Phân bố Xếp loại Nghiệm thu (Đề tài đã hoàn thành)</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={gradeBarOption} style={{ height: '320px', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Summary by reporting period */}
      {data.summaryTable.length > 0 && (
        <div className="summary-matrix-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <FolderGit2 size={18} className="title-icon sky" />
              <h3 className="chart-title">Thống kê theo kỳ</h3>
            </div>
          </div>

          <div className="table-responsive-wrapper" tabIndex={0} role="region" aria-label="Bảng tổng hợp theo năm" title="Thống kê toàn kỳ, độc lập với bộ lọc đề tài">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Năm</th>
                  <th>Cấp</th>
                  <th className="num-col">Đã giao</th>
                  <th className="num-col">Khoa Y</th>
                  <th className="num-col">Khoa Dược</th>
                  <th className="num-col">Khoa RHM</th>
                  <th className="num-col">Khoa YHCT</th>
                  <th className="num-col">Khoa YTCC</th>
                  <th className="num-col">Khoa KHCB</th>
                  <th className="num-col">ĐD-KTYH</th>
                  <th className="num-col">Bệnh viện</th>
                  <th className="num-col">Phòng/TT</th>
                  <th className="num-col highlight-col">Nghiệm thu (năm giao)</th>
                  <th className="num-col highlight-col">Nghiệm thu (năm TK)</th>
                  <th className="num-col budget-col">Kinh phí (Triệu)</th>
                </tr>
              </thead>
              <tbody>
                {data.summaryTable
                  .filter((s) => s.totalAssigned === null || s.totalAssigned > 0 || /^\d{4}-\d{4}$/.test(s.period))
                  .map((row, idx) => (
                    <tr key={idx} className={/^\d{4}-\d{4}$/.test(row.period) ? 'total-row' : ''}>
                      <td className="period-cell"><strong>{row.period}</strong></td>
                      <td><span className="level-badge-inline">{row.level}</span></td>
                      <td className="num-col bold">{row.totalAssigned?.toLocaleString('vi-VN') ?? 'Chưa cập nhật'}</td>
                      <td className="num-col">{row.byUnit['Khoa Y'] ?? '—'}</td>
                      <td className="num-col">{row.byUnit['Khoa Dược'] ?? '—'}</td>
                      <td className="num-col">{row.byUnit['Khoa RHM'] ?? '—'}</td>
                      <td className="num-col">{row.byUnit['Khoa YHCT'] ?? '—'}</td>
                      <td className="num-col">{row.byUnit['Khoa YTCC'] ?? '—'}</td>
                      <td className="num-col">{row.byUnit['Khoa KHCB'] ?? '—'}</td>
                      <td className="num-col">{row.byUnit['Khoa ĐD - KTYH'] ?? '—'}</td>
                      <td className="num-col">{row.byUnit['Bệnh viện'] ?? '—'}</td>
                      <td className="num-col">{row.byUnit['Phòng, trung tâm, thư viện'] ?? '—'}</td>
                      <td className="num-col highlight-col">{row.totalAcceptedByAssignedYear ?? '—'}</td>
                      <td className="num-col highlight-col">{row.totalAcceptedByStatsYear ?? '—'}</td>
                      <td className="num-col budget-col bold">
                        {row.budgetMillion?.toLocaleString('vi-VN') ?? 'Chưa cập nhật'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
