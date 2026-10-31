import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Clock,
  Users,
  Coins,
  TableProperties,
  ShieldAlert,
} from 'lucide-react';
import { DashboardView, useDashboard } from '../../store/useDashboardStore';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeView, setActiveView } = useDashboard();

  const navItems: Array<{
    id: DashboardView;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'overview',
      label: 'Tổng quan Điều hành',
      icon: <LayoutDashboard size={19} />,
    },
    {
      id: 'units',
      label: 'Theo 9 Đơn vị',
      icon: <Building2 size={19} />,
    },
    {
      id: 'progress',
      label: 'Tiến độ & Nghiệm thu',
      icon: <Clock size={19} />,
    },
    {
      id: 'people',
      label: 'Nhân sự Nghiên cứu',
      icon: <Users size={19} />,
    },
    {
      id: 'finance',
      label: 'Kinh phí & Hợp tác',
      icon: <Coins size={19} />,
    },
    {
      id: 'projects',
      label: 'Danh mục Đề tài',
      icon: <TableProperties size={19} />,
    },
    {
      id: 'data-quality',
      label: 'Chất lượng Dữ liệu',
      icon: <ShieldAlert size={19} />,
    },
  ];

  const handleNavClick = (view: DashboardView) => {
    setActiveView(view);
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar-container ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-box">
            <img src="/logo.png" alt="Logo CTUMP" className="school-logo-img" />
          </div>
          <div className="logo-text">
            <div className="school-abbr">CTUMP KHCN</div>
            <div className="phase-text">Giai đoạn 2021 – 2030</div>
          </div>
        </div>

        <div className="sidebar-nav-section">
          <div className="nav-group-title">PHÂN TÍCH & TRỰC QUAN</div>
          <nav className="nav-list">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};
