import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Users,
  Search,
  UserCheck,
  FolderGit2,
  Award,
  ArrowRight,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { useDashboard } from '../../store/useDashboardStore';
import { Member, Project } from '../../types/project';

export const PeopleView: React.FC = () => {
  const { filteredProjects, theme, setSelectedProject } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResearcher, setSelectedResearcher] = useState<string | null>(null);

  const projects = filteredProjects;
  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Aggregate by Principal Investigators (PIs)
  const piStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        staffId?: string;
        unit: string;
        totalLed: number;
        acceptedCount: number;
        totalParticipated: number;
        projects: Project[];
      }
    >();

    projects.forEach((p) => {
      // 1. Leader
      const piKey = p.pi.staffId || p.pi.name;
      if (!map.has(piKey)) {
        map.set(piKey, {
          name: p.pi.name,
          staffId: p.pi.staffId,
          unit: p.pi.unitGroup,
          totalLed: 0,
          acceptedCount: 0,
          totalParticipated: 0,
          projects: [],
        });
      }
      const piRecord = map.get(piKey)!;
      piRecord.totalLed += 1;
      piRecord.totalParticipated += 1;
      if (p.isAccepted) piRecord.acceptedCount += 1;
      piRecord.projects.push(p);

      // 2. Members
      p.members.slice(1).forEach((m) => {
        const mKey = m.staffId || m.name;
        if (!map.has(mKey)) {
          map.set(mKey, {
            name: m.name,
            staffId: m.staffId,
            unit: m.unitGroup,
            totalLed: 0,
            acceptedCount: 0,
            totalParticipated: 0,
            projects: [],
          });
        }
        const mRecord = map.get(mKey)!;
        mRecord.totalParticipated += 1;
        if (!mRecord.projects.includes(p)) {
          mRecord.projects.push(p);
        }
      });
    });

    return Array.from(map.values());
  }, [projects]);

  // Top Leaders list
  const topLeaders = useMemo(() => {
    return [...piStats]
      .filter((r) => r.totalLed > 0)
      .sort((a, b) => b.totalLed - a.totalLed)
      .slice(0, 10);
  }, [piStats]);

  // Search filter
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase().trim();
    return piStats
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.staffId && r.staffId.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [piStats, searchTerm]);

  // Selected researcher projects
  const activeResearcherData = useMemo(() => {
    if (!selectedResearcher) return null;
    return piStats.find(
      (r) => (r.staffId || r.name) === selectedResearcher
    );
  }, [piStats, selectedResearcher]);

  // Top Leaders Horizontal Chart Option
  const leaderBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
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
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: gridLineColor } },
    },
    yAxis: {
      type: 'category',
      data: topLeaders.map((l) => l.name).reverse(),
      axisLabel: { color: textColor, fontWeight: 500 },
      axisLine: { lineStyle: { color: gridLineColor } },
    },
    series: [
      {
        name: 'Đề tài chủ trì',
        type: 'bar',
        data: topLeaders.map((l) => l.totalLed).reverse(),
        itemStyle: {
          color: '#0ea5e9',
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: textColor,
          fontWeight: 600,
        },
      },
    ],
  };

  return (
    <div className="people-view-container animate-fade-in">
      <div className="view-intro-box">
        <h2 className="view-title">Nhân Sự & Đội Ngũ Cán Bộ Nghiên Cứu Khoa Học</h2>
        <p className="view-subtitle">
          Thống kê danh sách Chủ nhiệm đề tài, cán bộ phối hợp và mạng lưới nghiên cứu liên chuyên khoa.
        </p>
      </div>

      {/* Search Researcher Box */}
      <div className="researcher-search-card glass-card">
        <div className="researcher-search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="researcher-input"
            placeholder="Tra cứu cán bộ: nhập Họ tên hoặc Mã số cán bộ (MSCB)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {searchResults.length > 0 && (
          <div className="researcher-results-dropdown">
            {searchResults.map((r) => (
              <div
                key={r.staffId || r.name}
                className="researcher-result-item"
                onClick={() => {
                  setSelectedResearcher(r.staffId || r.name);
                  setSearchTerm('');
                }}
              >
                <div className="result-name">{r.name}</div>
                <div className="result-meta">
                  {r.staffId && <span className="mscb-badge">MSCB: {r.staffId}</span>}
                  <span className="unit-badge">{r.unit}</span>
                  <span className="count-tag">
                    Chủ nhiệm: <strong>{r.totalLed}</strong> • Tham gia: <strong>{r.totalParticipated}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Researcher Profile Modal/Panel */}
      {activeResearcherData && (
        <div className="researcher-profile-card glass-card animate-fade-in">
          <div className="profile-header">
            <div className="profile-info-left">
              <div className="profile-avatar">
                <UserCheck size={28} />
              </div>
              <div>
                <h3 className="profile-name">{activeResearcherData.name}</h3>
                <div className="profile-badges">
                  {activeResearcherData.staffId && (
                    <span className="mscb-badge">MSCB: {activeResearcherData.staffId}</span>
                  )}
                  <span className="unit-badge">{activeResearcherData.unit}</span>
                </div>
              </div>
            </div>

            <button
              className="btn-secondary"
              onClick={() => setSelectedResearcher(null)}
            >
              Đóng hồ sơ
            </button>
          </div>

          <div className="profile-stats-row">
            <div className="p-stat">
              <span className="p-num">{activeResearcherData.totalLed}</span>
              <span className="p-label">Đề tài Chủ nhiệm</span>
            </div>
            <div className="p-stat">
              <span className="p-num text-success">{activeResearcherData.acceptedCount}</span>
              <span className="p-label">Đã nghiệm thu</span>
            </div>
            <div className="p-stat">
              <span className="p-num text-sky">{activeResearcherData.totalParticipated}</span>
              <span className="p-label">Tổng lượt tham gia</span>
            </div>
          </div>

          <div className="profile-projects-list">
            <h4 className="list-title">Danh sách đề tài liên quan:</h4>
            <div className="projects-scroll">
              {activeResearcherData.projects.map((p) => (
                <div
                  key={p.id}
                  className="profile-project-item clickable"
                  onClick={() => setSelectedProject(p)}
                >
                  <div className="item-title">{p.title}</div>
                  <div className="item-meta">
                    <span>Vai trò: <strong>{p.pi.name === activeResearcherData.name ? 'Chủ nhiệm' : 'Tham gia'}</strong></span>
                    <span>• Năm: {p.startYear}</span>
                    <span>• {p.assigningUnit}</span>
                    <span className="badge-inline">{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Researchers & Participation Breakdown */}
      <div className="charts-grid-2">
        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <Award size={18} className="title-icon sky" />
              <h3 className="chart-title">Top Cán Bộ Chủ Nhiệm Nhiều Đề Tài Nhất</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ReactECharts option={leaderBarOption} style={{ height: '360px', width: '100%' }} />
          </div>
        </div>

        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div className="chart-title-box">
              <Briefcase size={18} className="title-icon emerald" />
              <h3 className="chart-title">Danh Sách Cán Bộ Nghiên Cứu Tích Cực</h3>
            </div>
          </div>

          <div className="top-people-table-wrapper">
            <table className="mini-data-table">
              <thead>
                <tr>
                  <th>Cán bộ</th>
                  <th>Đơn vị</th>
                  <th className="num-col">Chủ nhiệm</th>
                  <th className="num-col">Tham gia</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {topLeaders.slice(0, 7).map((l, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="table-person-name">{l.name}</div>
                      {l.staffId && <div className="table-person-mscb">{l.staffId}</div>}
                    </td>
                    <td><span className="unit-pill">{l.unit}</span></td>
                    <td className="num-col bold text-sky">{l.totalLed}</td>
                    <td className="num-col">{l.totalParticipated}</td>
                    <td>
                      <button
                        className="btn-inspect-mini"
                        onClick={() => setSelectedResearcher(l.staffId || l.name)}
                      >
                        Xem đề tài
                      </button>
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
