import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AlertCircle, Menu, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from './nckh/components/ErrorBoundary.jsx';
import { LoginModal } from './nckh/components/LoginModal.jsx';
import { useDashboard, type DashboardView } from './store/useDashboardStore';
import { Sidebar, type PublicationView } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';
import { FilterBar } from './components/common/FilterBar';
import { ProjectDrawer } from './components/common/ProjectDrawer';
import { OverviewView } from './components/views/OverviewView';
import { UnitsView } from './components/views/UnitsView';
import { ProgressView } from './components/views/ProgressView';
import { PeopleView } from './components/views/PeopleView';
import { FinanceView } from './components/views/FinanceView';
import { ProjectsTableView } from './components/views/ProjectsTableView';
import { DataQualityView } from './components/views/DataQualityView';
import { learnerViews, type LearnerView } from './learners/data';

type Area = 'projects' | 'learners' | 'publications';
type Route = { area: 'projects'; view: DashboardView } | { area: 'learners'; view: LearnerView } | { area: 'publications'; view: PublicationView };
const PublicationsDashboard = lazy(() => import('./nckh/App.jsx'));
const LearnerDashboard = lazy(() => import('./learners/LearnerDashboard'));

const projectViews: DashboardView[] = ['overview', 'units', 'progress', 'people', 'finance', 'projects', 'data-quality'];
const publicationViews: PublicationView[] = ['all', 'source1', 'source2', 'lookup'];

function readRoute(): Route {
  const [, group, nestedView] = window.location.hash.match(/^#\/projects\/(staff|learners)\/([a-z0-9-]+)$/) || [];
  if (group === 'learners' && learnerViews.includes(nestedView as LearnerView)) return { area: 'learners', view: nestedView as LearnerView };
  if (group === 'staff' && projectViews.includes(nestedView as DashboardView)) return { area: 'projects', view: nestedView as DashboardView };
  const [, area, view] = window.location.hash.match(/^#\/(projects|publications)\/([a-z0-9-]+)$/) || [];
  if (area === 'publications' && publicationViews.includes(view as PublicationView)) {
    return { area, view: view as PublicationView };
  }
  if (area === 'projects' && projectViews.includes(view as DashboardView)) {
    return { area, view: view as DashboardView };
  }
  return { area: 'projects', view: 'overview' };
}

function ProjectsDashboard({ view, onNavigate, onLogin }: { view: DashboardView; onNavigate: (view: DashboardView) => void; onLogin: () => void }) {
  const { activeView, setActiveView, selectedProject, setSelectedProject, isLoading, error, refreshData, data } = useDashboard();

  useEffect(() => {
    if (activeView !== view) setActiveView(view);
  }, [activeView, setActiveView, view]);

  return (
    <main className="view-container">
      <Navbar onLogin={onLogin} title="ĐỀ TÀI CÁN BỘ — THỐNG KÊ KẾT QUẢ & HIỆU QUẢ KHCN" />
      <FilterBar />
      {error && (
        <div className="reconciliation-banner glass-card" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}><strong>Lỗi kết nối Google Sheets:</strong> {error}</div>
          <button className="btn-secondary" onClick={refreshData}><RefreshCw size={14} /><span>Thử lại</span></button>
        </div>
      )}
      {isLoading && !data && (
        <div className="empty-state-box glass-card animate-fade-in">
          <div className="empty-icon-wrapper"><RefreshCw size={36} className="spin-icon" /></div>
          <h3 className="empty-title">Đang đồng bộ dữ liệu mới nhất từ 6 Sheet...</h3>
          <p className="empty-desc">Hệ thống đang kết nối đến Google Sheets và đối chiếu số liệu với Bảng Tổng Hợp.</p>
        </div>
      )}
      {data && (
        <>
          {activeView === 'overview' && <OverviewView />}
          {activeView === 'units' && <UnitsView onOpenProjects={() => onNavigate('projects')} />}
          {activeView === 'progress' && <ProgressView />}
          {activeView === 'people' && <PeopleView />}
          {activeView === 'finance' && <FinanceView />}
          {activeView === 'projects' && <ProjectsTableView />}
          {activeView === 'data-quality' && <DataQualityView />}
        </>
      )}
      <ProjectDrawer project={selectedProject} onClose={() => setSelectedProject(null)} />
    </main>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => setIsLoginOpen(false), []);
  const [visited, setVisited] = useState<Record<Area, boolean>>({
    projects: route.area === 'projects',
    learners: route.area === 'learners',
    publications: route.area === 'publications',
  });

  useEffect(() => {
    const onHashChange = () => {
      const next = readRoute();
      setRoute(next);
      setVisited((previous) => ({ ...previous, [next.area]: true }));
      setIsSidebarOpen(false);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (next: Route) => {
    const hash = next.area === 'publications' ? `#/publications/${next.view}` : `#/projects/${next.area === 'learners' ? 'learners' : 'staff'}/${next.view}`;
    if (window.location.hash === hash) {
      setRoute(next);
      setIsSidebarOpen(false);
    } else {
      window.location.hash = hash;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        area={route.area}
        projectView={route.area === 'projects' ? route.view : 'overview'}
        publicationView={route.area === 'publications' ? route.view : 'all'}
        learnerView={route.area === 'learners' ? route.view : 'overview'}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onProjectSelect={(view) => navigate({ area: 'projects', view })}
        onLearnerSelect={(view) => navigate({ area: 'learners', view })}
        onPublicationSelect={(view) => navigate({ area: 'publications', view })}
      />
      <div className="main-content-area">
        <div className="combined-mobile-bar">
          <button type="button" onClick={() => setIsSidebarOpen(true)} aria-label="Mở menu"><Menu size={22} /></button>
          <span>{route.area === 'publications' ? 'Công bố khoa học' : route.area === 'learners' ? 'Đề tài người học' : 'Đề tài Cán bộ'}</span>
        </div>
        {visited.projects && (
          <div className="dashboard-pane projects-pane" hidden={route.area !== 'projects'}>
            <ProjectsDashboard view={route.area === 'projects' ? route.view : 'overview'} onNavigate={(view) => navigate({ area: 'projects', view })} onLogin={openLogin} />
          </div>
        )}
        {visited.publications && (
          <div className="dashboard-pane" hidden={route.area !== 'publications'}>
            <ErrorBoundary>
              <Suspense fallback={<div className="combined-loading">Đang mở dashboard công bố khoa học...</div>}>
                <PublicationsDashboard
                  mode={route.area === 'publications' ? route.view : 'all'}
                  onLogin={openLogin}
                  onSourceTypeChange={(source: 'all' | 'source1' | 'source2') => navigate({ area: 'publications', view: source })}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
        {visited.learners && (
          <div className="dashboard-pane projects-pane" hidden={route.area !== 'learners'}>
            <ErrorBoundary><Suspense fallback={<div className="combined-loading">Đang mở dashboard người học…</div>}>
              <LearnerDashboard view={route.area === 'learners' ? route.view : 'overview'} onLogin={openLogin} />
            </Suspense></ErrorBoundary>
          </div>
        )}
      </div>
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} />
    </div>
  );
}
