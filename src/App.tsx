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
import { resolveRouteLocation, routePath, type Area, type Route } from './routing';

const PublicationsDashboard = lazy(() => import('./nckh/App.jsx'));
const LearnerDashboard = lazy(() => import('./learners/LearnerDashboard'));

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
        <div role="alert" className="data-load-alert">
          <AlertCircle size={18} />
          <span>{data ? 'Một phần dữ liệu chưa tải được.' : 'Không thể tải dữ liệu.'}</span>
          <button type="button" className="btn-secondary" onClick={refreshData} disabled={isLoading}>Thử lại</button>
        </div>
      )}
      {isLoading && !data && (
        <div className="empty-state-box glass-card animate-fade-in" role="status">
          <div className="empty-icon-wrapper"><RefreshCw size={36} className="spin-icon" /></div>
          <h3 className="empty-title">Đang tải dữ liệu…</h3>
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
  const [route, setRoute] = useState<Route>(() => resolveRouteLocation(window.location).route);
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
    const onLocationChange = () => {
      const { route: next, replaceUrl } = resolveRouteLocation(window.location);
      if (replaceUrl) window.history.replaceState(window.history.state, '', replaceUrl);
      setRoute(next);
      setVisited((previous) => ({ ...previous, [next.area]: true }));
      setIsSidebarOpen(false);
    };
    onLocationChange();
    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, []);

  const navigate = (next: Route) => {
    const path = routePath(next) + window.location.search;
    if (window.location.pathname + window.location.search + window.location.hash !== path) window.history.pushState(null, '', path);
    setRoute(next);
    setVisited((previous) => ({ ...previous, [next.area]: true }));
    setIsSidebarOpen(false);
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
