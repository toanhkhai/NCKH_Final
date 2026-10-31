import React from 'react';
import { Menu } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  return (
    <header className="navbar-container glass-card">
      <div className="navbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="brand-heading">
          <div className="school-tag">TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ</div>
          <h1 className="system-title">
            HỆ THỐNG THỐNG KÊ KẾT QUẢ & HIỆU QUẢ ĐỀ TÀI KHCN
          </h1>
        </div>
      </div>
    </header>
  );
};
