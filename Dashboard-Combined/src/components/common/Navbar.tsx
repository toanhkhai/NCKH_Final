import React from 'react';
import { Menu } from 'lucide-react';
import { ProjectAccount } from './ProjectAccount';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onLogin?: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onLogin, title = 'HỆ THỐNG THỐNG KÊ KẾT QUẢ & HIỆU QUẢ ĐỀ TÀI KHCN' }) => {
  return (
    <header className="navbar-container glass-card">
      <div className="navbar-left">
        {onToggleSidebar && <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>}

        <div className="brand-heading">
          <div className="school-tag">TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ</div>
          <h1 className="system-title">
            {title}
          </h1>
        </div>
      </div>
      {onLogin && <ProjectAccount onLogin={onLogin} />}
    </header>
  );
};
