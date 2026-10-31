import React, { useState } from 'react';
import { useDashboard } from './store/useDashboardStore';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { FilterBar } from './components/common/FilterBar';
import { ProjectDrawer } from './components/common/ProjectDrawer';
import { OverviewView } from './components/views/OverviewView';
import { UnitsView } from './components/views/UnitsView';
import { ProgressView } from './components/views/ProgressView';
import { PeopleView } from './components/views/PeopleView';
import { FinanceView } from './components/views/FinanceView';
import { ProjectsTableView } from './components/views/ProjectsTableView';
import { DataQualityView } from './components/views/DataQualityView';
import { AlertCircle, RefreshCw } from 'lucide-react';
import './styles/index.css';
import './styles/dashboard.css';

export const App: React.FC = () => {
  const { activeView, selectedProject, setSelectedProject, isLoading, error, refreshData, data } =
    useDashboard();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="main-content-area">
        <main className="view-container">
          {/* Top Navbar */}
          <Navbar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

          {/* Global Filter Bar across all views */}
          <FilterBar />

          {/* Error Banner if any */}
          {error && (
            <div className="reconciliation-banner glass-card" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
              <AlertCircle size={18} />
              <div style={{ flex: 1 }}>
                <strong>Lỗi kết nối Google Sheets:</strong> {error}
              </div>
              <button className="btn-secondary" onClick={refreshData}>
                <RefreshCw size={14} />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* Loading Initial Skeleton */}
          {isLoading && !data && (
            <div className="empty-state-box glass-card animate-fade-in">
              <div className="empty-icon-wrapper">
                <RefreshCw size={36} className="spin-icon" />
              </div>
              <h3 className="empty-title">Đang đồng bộ dữ liệu mới nhất từ 6 Sheet...</h3>
              <p className="empty-desc">
                Hệ thống đang kết nối trực tiếp đến Google Sheets, phân tích các dòng đề tài và đối chiếu số liệu với Bảng Tổng Hợp.
              </p>
            </div>
          )}

          {/* Active View */}
          {data && (
            <>
              {activeView === 'overview' && <OverviewView />}
              {activeView === 'units' && <UnitsView />}
              {activeView === 'progress' && <ProgressView />}
              {activeView === 'people' && <PeopleView />}
              {activeView === 'finance' && <FinanceView />}
              {activeView === 'projects' && <ProjectsTableView />}
              {activeView === 'data-quality' && <DataQualityView />}
            </>
          )}
        </main>
      </div>

      {/* Slide-over Project Details Drawer */}
      <ProjectDrawer
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </div>
  );
};

export default App;
