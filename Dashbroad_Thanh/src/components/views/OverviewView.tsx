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
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { KpiCard } from '../common/KpiCard';
import { EmptyState } from '../common/EmptyState';
import { GRADE_COLORS, STATUS_COLORS, StandardUnit } from '../../types/project';
import { UNIT_COLORS, STANDARD_UNITS } from '../../config/units';

export const OverviewView: React.FC = () => {
  const { data, filteredProjects, theme, setSelectedProject, updateFilters, isLoading } = useDashboard();

  if (isLoading) {
    return <EmptyState title="Đang nạp dữ liệu từ Google Sheets..." />;
  }

  if (!data?.projects.length) {
    return (
      <EmptyState
        title="Chưa có dữ liệu đề tài"
        description="Không tìm thấy đề tài nào trong dữ liệu tải về từ Google Sheets hoặc bảng tính chưa có số liệu."
      />
    );
  }

  const projects = filteredProjects;

  // KPI Metrics Calculation
  const totalAssigned = projects.length;
  const acceptedCount = projects.filter((p) => p.isAccepted).length;
  const ongoingCount = projects.filter((p) => p.status === 'DANG_THUC_HIEN').length;
  const overdueCount = projects.filter((p) => p.status === 'QUA_HAN').length;
  const pendingCount = projects.filter((p) => p.status === 'CHO_NGHIEM_THU').length;
  const stoppedCount = projects.filter((p) => p.isStopped).length;
  const extendedCount = projects.filter((p) => p.isExtended).length;
  const totalBudgetMillion = projects.reduce((sum, p) => sum + p.budget, 0);

  const acceptedRate = totalAssigned > 0 ? ((acceptedCount / totalAssigned) * 100).toFixed(1) : '0';
  const extendedRate = totalAssigned > 0 ? ((extendedCount / totalAssigned) * 100).toFixed(1) : '0';

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Chart 1: Projects by Year & Budget
  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  const yearAssignedCounts = years.map((y) => projects.filter((p) => p.startYear === y).length);
  const yearAcceptedCounts = years.map((y) => projects.filter((p) => p.startYear === y && p.isAccepted).length);
  const yearBudgetTotals = years.map((y) =>
    projects.filter((p) => p.startYear === y).reduce((sum, p) => sum + p.budget, 0)
  );

  const trendChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let str = `<strong>Năm ${params[0].name}</strong><br/>`;
        params.forEach((item: any) => {
          str += `${item.marker} ${item.seriesName}: <b>${item.value.toLocaleString('vi-VN')}</b> ${
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
      data: years.map((y) => `Năm ${y}`),
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

  // Chart 2: Status Donut Chart
  const statusCounts = [
    { name: 'Đã nghiệm thu', value: acceptedCount, itemStyle: { color: STATUS_COLORS.DA_NGHIEM_THU } },
    { name: 'Đang thực hiện', value: ongoingCount, itemStyle: { color: STATUS_COLORS.DANG_THUC_HIEN } },
    { name: 'Quá hạn', value: overdueCount, itemStyle: { color: STATUS_COLORS.QUA_HAN } },
    { name: 'Chờ nghiệm thu', value: pendingCount, itemStyle: { color: STATUS_COLORS.CHO_NGHIEM_THU } },
    { name: 'Đã ngưng / hủy', value: stoppedCount, itemStyle: { color: STATUS_COLORS.DA_HUY } },
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
    { name: 'Xuất sắc', value: projects.filter((p) => p.grade === 'XUAT_SAC').length, color: GRADE_COLORS.XUAT_SAC },
    { name: 'Tốt', value: projects.filter((p) => p.grade === 'TOT').length, color: GRADE_COLORS.TOT },
    { name: 'Khá', value: projects.filter((p) => p.grade === 'KHA').length, color: GRADE_COLORS.KHA },
    { name: 'Trung bình', value: projects.filter((p) => p.grade === 'TRUNG_BINH').length, color: GRADE_COLORS.TRUNG_BINH },
    { name: 'Chưa xếp loại', value: projects.filter((p) => p.grade === 'CHUA_XEP_LOAI').length, color: GRADE_COLORS.CHUA_XEP_LOAI },
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
  const unitCounts = STANDARD_UNITS.map((unit) => {
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
      {/* Reconciliation Success Banner */}
      {data.reconciliation.isBalanced && (
        <div className="reconciliation-banner glass-card">
          <ShieldCheck size={18} className="shield-icon" />
          <span>
            <strong>Đã đối chiếu hoàn tất:</strong> Dữ liệu từ Sheet khớp 100% với Bảng Tổng hợp Tab 1 (705 đề tài giao, 271 nghiệm thu, 10.529 triệu đồng kinh phí).
          </span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <KpiCard
          title="Tổng số đề tài đã giao"
          value={totalAssigned.toLocaleString('vi-VN')}
          subtitle="Giai đoạn 2021 – 2030"
          icon={<FolderGit2 size={22} />}
          colorScheme="sky"
          trendText="100% Cấp Trường"
          progressPercent={100}
        />

        <KpiCard
          title="Đề tài đã nghiệm thu"
          value={acceptedCount.toLocaleString('vi-VN')}
          subtitle={`Đạt tỷ lệ ${acceptedRate}%`}
          icon={<CheckCircle size={22} />}
          colorScheme="emerald"
          trendText={`${acceptedRate}%`}
          progressPercent={parseFloat(acceptedRate)}
        />

        <KpiCard
          title="Tổng kinh phí đã cấp"
          value={`${new Intl.NumberFormat('vi-VN').format(totalBudgetMillion)} Tr`}
          subtitle={`Tương đương ${(totalBudgetMillion / 1000).toFixed(2)} tỷ đồng`}
          icon={<Coins size={22} />}
          colorScheme="amber"
          trendText="Triệu VNĐ"
          progressPercent={75}
        />

        <KpiCard
          title="Đề tài đã gia hạn"
          value={extendedCount.toLocaleString('vi-VN')}
          subtitle={`Chiếm ${extendedRate}% tổng số đề tài`}
          icon={<History size={22} />}
          colorScheme="purple"
          trendText="149 đề tài"
          progressPercent={parseFloat(extendedRate)}
        />

        <KpiCard
          title="Đề tài ngưng / hủy"
          value={stoppedCount.toLocaleString('vi-VN')}
          subtitle="Theo các Quyết định thu hồi"
          icon={<XCircle size={22} />}
          colorScheme="rose"
          trendText="71 đề tài"
          progressPercent={10}
        />
      </div>

      {/* Row 1 Charts: Trend & Status */}
      <div className="charts-grid-2">
        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <TrendingUp size={18} className="title-icon sky" />
              <h3 className="chart-title">Số lượng Đề tài Giao, Nghiệm thu & Kinh phí qua các Năm</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={trendChartOption} style={{ height: '340px', width: '100%' }} />
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

      {/* Tab 1 Native Summary Matrix */}
      {data.summaryTable.length > 0 && (
        <div className="summary-matrix-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <FolderGit2 size={18} className="title-icon sky" />
              <h3 className="chart-title">Bảng Thống kê Tự động Gốc từ Tab 1 (Đối chiếu Chéo)</h3>
            </div>
          </div>

          <div className="table-responsive-wrapper" tabIndex={0} role="region" aria-label="Bảng tổng hợp theo năm">
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
                  .filter((s) => s.totalAssigned > 0 || s.period === '2021-2030')
                  .map((row, idx) => (
                    <tr key={idx} className={row.period === '2021-2030' ? 'total-row' : ''}>
                      <td className="period-cell"><strong>{row.period}</strong></td>
                      <td><span className="level-badge-inline">{row.level}</span></td>
                      <td className="num-col bold">{row.totalAssigned.toLocaleString('vi-VN')}</td>
                      <td className="num-col">{row.byUnit['Khoa Y']}</td>
                      <td className="num-col">{row.byUnit['Khoa Dược']}</td>
                      <td className="num-col">{row.byUnit['Khoa RHM']}</td>
                      <td className="num-col">{row.byUnit['Khoa YHCT']}</td>
                      <td className="num-col">{row.byUnit['Khoa YTCC']}</td>
                      <td className="num-col">{row.byUnit['Khoa KHCB']}</td>
                      <td className="num-col">{row.byUnit['Khoa ĐD - KTYH']}</td>
                      <td className="num-col">{row.byUnit['Bệnh viện']}</td>
                      <td className="num-col">{row.byUnit['Phòng, trung tâm, thư viện']}</td>
                      <td className="num-col highlight-col">{row.totalAcceptedByAssignedYear}</td>
                      <td className="num-col highlight-col">{row.totalAcceptedByStatsYear}</td>
                      <td className="num-col budget-col bold">
                        {new Intl.NumberFormat('vi-VN').format(row.budgetMillion)}
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
