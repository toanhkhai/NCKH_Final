import React from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Coins,
  FileCheck2,
  Handshake,
  TrendingUp,
  AlertCircle,
  Building,
  CheckCircle,
} from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { STANDARD_UNITS, UNIT_COLORS } from '../../config/units';
import { STATUS_LABELS } from '../../types/project';
import { budgetSummary, budgetTiers as buildBudgetTiers, collaborationCount, flagCount, isAcceptedProject, projectFlag } from '../../services/projectAnalytics';

export const FinanceView: React.FC = () => {
  const { filteredProjects, theme, setSelectedProject } = useDashboard();
  const projects = filteredProjects;

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const budget = budgetSummary(projects);
  const totalBudgetMillion = budget.total;
  const liquidatedCount = flagCount(projects, 'liquidated');
  const unliquidatedCount = flagCount(projects.filter(isAcceptedProject), 'liquidated', false);
  const collabCount = collaborationCount(projects);
  const fmt = (value: number | null) => value === null ? 'Chưa cập nhật' : value.toLocaleString('vi-VN');

  // Chart 1: Budget by Unit
  const unitBudgets = [...new Set([...STANDARD_UNITS, ...projects.map((project) => project.assigningUnit)])].map((unit) => {
    const sum = budgetSummary(projects.filter((p) => p.assigningUnit === unit)).total;
    return {
      unit,
      budget: sum,
      color: UNIT_COLORS[unit],
    };
  }).sort((a, b) => (b.budget ?? -Infinity) - (a.budget ?? -Infinity));

  const unitBudgetBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const item = params[0];
        return `<strong>${item.name}</strong><br/>Kinh phí đã ghi nhận: <b>${typeof item.value === 'number' ? item.value.toLocaleString('vi-VN') : 'Chưa cập nhật'}</b> triệu đồng`;
      },
    },
    grid: {
      left: '3%',
      right: '6%',
      bottom: '5%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Triệu đồng',
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: gridLineColor } },
    },
    yAxis: {
      type: 'category',
      data: unitBudgets.map((u) => u.unit).reverse(),
      axisLabel: { color: textColor, fontWeight: 500 },
      axisLine: { lineStyle: { color: gridLineColor } },
    },
    series: [
      {
        name: 'Kinh phí',
        type: 'bar',
        data: unitBudgets.map((u) => u.budget).reverse(),
        itemStyle: {
          color: '#f59e0b',
          borderRadius: [0, 4, 4, 0],
        },
      },
    ],
  };

  // Chart 2: Budget Distribution Range (5M, 10M, 12M, 15M, 30M, >30M)
  const budgetTiers = buildBudgetTiers(projects);

  const budgetTierOption = {
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
      data: budgetTiers.map((t) => t.label),
      axisLabel: { color: textColor, fontWeight: 500 },
      axisLine: { lineStyle: { color: gridLineColor } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: gridLineColor } },
    },
    series: [
      {
        name: 'Số đề tài',
        type: 'bar',
        data: budgetTiers.map((t) => t.count),
        itemStyle: {
          color: '#0ea5e9',
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          color: textColor,
          fontWeight: 'bold',
        },
      },
    ],
  };

  // High budget projects
  const highBudgetProjects = projects.filter((project) => project.budgetKnown)
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 7);

  return (
    <div className="finance-view-container animate-fade-in">
      <div className="view-intro-box">
        <h2 className="view-title">Kinh Phí Nghiên Cứu, Thanh Lý Hợp Đồng & Hợp Tác</h2>
        <p className="view-subtitle">
          Quản lý tài chính đề tài khoa học công nghệ, tình trạng thanh lý hợp đồng và mối liên kết doanh nghiệp/cơ sở y tế.
        </p>
      </div>

      {/* Financial KPIs */}
      <div className="finance-kpi-grid">
        <div className="finance-card glass-card">
          <div className="finance-icon-box amber">
            <Coins size={22} />
          </div>
          <div>
            <div className="finance-val">
              {totalBudgetMillion === null ? 'Chưa cập nhật' : `${fmt(totalBudgetMillion)} Tr`}
            </div>
            <div className="finance-sub">Kinh phí đã ghi nhận (triệu đồng); {budget.missing} hồ sơ chưa cập nhật</div>
          </div>
        </div>

        <div className="finance-card glass-card">
          <div className="finance-icon-box emerald">
            <FileCheck2 size={22} />
          </div>
          <div>
            <div className="finance-val">{fmt(liquidatedCount)}</div>
            <div className="finance-sub">Hợp đồng đã thanh lý hoàn tất</div>
          </div>
        </div>

        <div className="finance-card glass-card">
          <div className="finance-icon-box rose">
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="finance-val">{fmt(unliquidatedCount)}</div>
            <div className="finance-sub">Đã nghiệm thu nhưng chưa thanh lý</div>
          </div>
        </div>

        <div className="finance-card glass-card">
          <div className="finance-icon-box sky">
            <Handshake size={22} />
          </div>
          <div>
            <div className="finance-val">{fmt(collabCount)}</div>
            <div className="finance-sub">Có tài trợ / hợp tác DN, CSYT hoặc quốc tế (mỗi đề tài tính một lần)</div>
          </div>
        </div>
      </div>
      <p className="chart-note">Có {projects.filter((project) => projectFlag(project, 'liquidated') === null).length} hồ sơ chưa cập nhật thanh lý; các ô trống không được tính là chưa thanh lý.</p>

      {/* Row Charts: Unit Budget & Budget Range */}
      <div className="charts-grid-2">
        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <Coins size={18} className="title-icon amber" />
              <h3 className="chart-title">Tổng Kinh Phí Theo Đơn Vị (Triệu đồng)</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={unitBudgetBarOption} style={{ height: '340px', width: '100%' }} />
          </div>
        </div>

        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <TrendingUp size={18} className="title-icon sky" />
              <h3 className="chart-title">Phân Bố Mức Định Mức Kinh Phí Đề Tài</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={budgetTierOption} style={{ height: '340px', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Top High-Budget Projects */}
      <div className="chart-card glass-card">
        <div className="chart-card-header">
          <div className="chart-title-box">
            <Coins size={18} className="title-icon emerald" />
            <h3 className="chart-title">Các đề tài có kinh phí đã ghi nhận cao nhất theo bộ lọc</h3>
          </div>
        </div>

        <div className="table-responsive-wrapper" tabIndex={0} role="region" aria-label="Đề tài kinh phí cao">
          <table className="modern-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên đề tài</th>
                <th>Chủ nhiệm</th>
                <th>Đơn vị</th>
                <th className="num-col">Kinh phí (Triệu)</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {highBudgetProjects.map((p) => (
                <tr key={p.id}>
                  <td>#{p.stt}</td>
                  <td className="title-cell-wrap"><strong>{p.title}</strong></td>
                  <td>{p.pi.name}</td>
                  <td><span className="unit-badge">{p.assigningUnit}</span></td>
                  <td className="num-col bold text-warning">{p.budget} Triệu</td>
                  <td><span className="badge-inline">{STATUS_LABELS[p.status]}</span></td>
                  <td>
                    <button
                      className="btn-inspect-mini"
                      onClick={() => setSelectedProject(p)}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
