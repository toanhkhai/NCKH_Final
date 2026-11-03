import { useEffect, useState } from 'react';
import {
  BookOpen, Building2, ChevronDown, Clock, Coins, FileSearch,
  Globe2, GraduationCap, LayoutDashboard, LibraryBig, ShieldAlert, TableProperties, Users,
} from 'lucide-react';
import type { DashboardView } from '../../store/useDashboardStore';
import type { LearnerView } from '../../learners/data';

export type PublicationView = 'all' | 'source1' | 'source2' | 'lookup';

type SidebarProps = {
  area: 'projects' | 'learners' | 'publications';
  projectView: DashboardView;
  publicationView: PublicationView;
  learnerView: LearnerView;
  isOpen: boolean;
  onClose: () => void;
  onProjectSelect: (view: DashboardView) => void;
  onPublicationSelect: (view: PublicationView) => void;
  onLearnerSelect: (view: LearnerView) => void;
};

const projectItems = [
  { id: 'overview', label: 'Tổng quan điều hành', icon: LayoutDashboard },
  { id: 'units', label: 'Theo 9 đơn vị', icon: Building2 },
  { id: 'progress', label: 'Tiến độ & nghiệm thu', icon: Clock },
  { id: 'people', label: 'Nhân sự nghiên cứu', icon: Users },
  { id: 'finance', label: 'Kinh phí & hợp tác', icon: Coins },
  { id: 'projects', label: 'Danh mục đề tài', icon: TableProperties },
  { id: 'data-quality', label: 'Chất lượng dữ liệu', icon: ShieldAlert },
] as const;

const publicationItems = [
  { id: 'all', label: 'Tổng quan công bố', icon: LayoutDashboard },
  { id: 'source1', label: 'Bài báo trong nước', icon: LibraryBig },
  { id: 'source2', label: 'Bài báo quốc tế', icon: Globe2 },
  { id: 'lookup', label: 'Tra cứu bài báo', icon: FileSearch },
] as const;

const learnerItems = [
  { id: 'overview', label: 'Tổng quan người học', icon: LayoutDashboard },
  { id: 'projects', label: 'Danh mục đề tài', icon: TableProperties },
  { id: 'people', label: 'Người học & hướng dẫn', icon: Users },
  { id: 'progress', label: 'Tiến độ & nghiệm thu', icon: Clock },
  { id: 'outputs', label: 'Kinh phí & sản phẩm', icon: Coins },
  { id: 'quality', label: 'Chất lượng dữ liệu', icon: ShieldAlert },
] as const;

export function Sidebar({
  area, projectView, publicationView, learnerView, isOpen, onClose, onProjectSelect, onPublicationSelect, onLearnerSelect,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Record<'projects' | 'publications', boolean>>({
    projects: area !== 'publications',
    publications: area === 'publications',
  });
  const [subgroups, setSubgroups] = useState({ staff: area === 'projects', learners: area === 'learners' });

  useEffect(() => {
    setExpanded((previous) => ({ ...previous, [area === 'learners' ? 'projects' : area]: true }));
    if (area !== 'publications') setSubgroups((previous) => ({ ...previous, [area === 'learners' ? 'learners' : 'staff']: true }));
  }, [area]);

  const toggle = (group: 'projects' | 'publications') => {
    setExpanded((previous) => ({ ...previous, [group]: !previous[group] }));
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar-container ${isOpen ? 'open' : ''}`} aria-label="Điều hướng dashboard">
        <a
          href="/"
          className="sidebar-header sidebar-home-link"
          aria-label="Về trang chủ"
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onProjectSelect('overview');
            window.scrollTo(0, 0);
          }}
        >
          <div className="logo-box"><img src="/logo.png" alt="Logo CTUMP" className="school-logo-img" /></div>
          <div className="logo-text">
            <div className="school-abbr">CTUMP KHCN</div>
            <div className="phase-text">Dashboard hợp nhất</div>
          </div>
        </a>
        <div className="sidebar-nav-section">
          <nav className="nav-list" aria-label="Hai nhóm chức năng">
            <div className="combined-nav-group">
              <button
                type="button"
                className={`combined-nav-parent ${area !== 'publications' ? 'current' : ''}`}
                aria-expanded={expanded.projects}
                aria-controls="projects-nav"
                onClick={() => toggle('projects')}
              >
                <Building2 size={19} /><span>Đề tài KHCN</span><ChevronDown size={16} className={expanded.projects ? 'expanded' : ''} />
              </button>
              {expanded.projects && (
                <div id="projects-nav" className="combined-nav-children">
                  <button type="button" className={`combined-nav-subgroup ${area === 'projects' ? 'current' : ''}`} aria-expanded={subgroups.staff} aria-controls="staff-nav" onClick={() => setSubgroups((s) => ({ ...s, staff: !s.staff }))}>
                    <Users size={17} /><span>Đề tài Cán bộ</span><ChevronDown size={14} className={subgroups.staff ? 'expanded' : ''} />
                  </button>
                  {subgroups.staff && <div id="staff-nav" className="combined-nav-children combined-nav-level3">{projectItems.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`nav-item-btn ${area === 'projects' && projectView === id ? 'active' : ''}`}
                      aria-current={area === 'projects' && projectView === id ? 'page' : undefined}
                      onClick={() => onProjectSelect(id)}
                    >
                      <span className="nav-icon"><Icon size={17} /></span><span className="nav-label">{label}</span>
                    </button>
                  ))}</div>}
                  <button type="button" className={`combined-nav-subgroup ${area === 'learners' ? 'current' : ''}`} aria-expanded={subgroups.learners} aria-controls="learners-nav" onClick={() => setSubgroups((s) => ({ ...s, learners: !s.learners }))}>
                    <GraduationCap size={17} /><span>Đề tài người học</span><ChevronDown size={14} className={subgroups.learners ? 'expanded' : ''} />
                  </button>
                  {subgroups.learners && <div id="learners-nav" className="combined-nav-children combined-nav-level3">{learnerItems.map(({ id, label, icon: Icon }) => <button
                    key={id} type="button" className={`nav-item-btn ${area === 'learners' && learnerView === id ? 'active' : ''}`}
                    aria-current={area === 'learners' && learnerView === id ? 'page' : undefined} onClick={() => onLearnerSelect(id)}
                  ><span className="nav-icon"><Icon size={16} /></span><span className="nav-label">{label}</span></button>)}</div>}
                </div>
              )}
            </div>
            <div className="combined-nav-group">
              <button
                type="button"
                className={`combined-nav-parent ${area === 'publications' ? 'current' : ''}`}
                aria-expanded={expanded.publications}
                aria-controls="publications-nav"
                onClick={() => toggle('publications')}
              >
                <BookOpen size={19} /><span>Công bố khoa học</span><ChevronDown size={16} className={expanded.publications ? 'expanded' : ''} />
              </button>
              {expanded.publications && (
                <div id="publications-nav" className="combined-nav-children">
                  {publicationItems.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`nav-item-btn ${area === 'publications' && publicationView === id ? 'active' : ''}`}
                      aria-current={area === 'publications' && publicationView === id ? 'page' : undefined}
                      onClick={() => onPublicationSelect(id)}
                    >
                      <span className="nav-icon"><Icon size={17} /></span><span className="nav-label">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
