import { LogIn, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../../nckh/context/AuthContext.jsx';

export function ProjectAccount({ onLogin }: { onLogin: () => void }) {
  const { user, isGuest, logout } = useAuth() as unknown as {
    user: { name?: string; email?: string; picture?: string } | null;
    isGuest: boolean;
    logout: () => void;
  };

  if (isGuest) {
    return (
      <button type="button" className="project-login-btn header-login-btn" onClick={onLogin}>
        <LogIn size={16} /> <span>Đăng nhập</span>
      </button>
    );
  }

  return (
    <div className="project-account" aria-label="Tài khoản đang đăng nhập">
      {user?.picture ? (
        <img src={user.picture} alt="" referrerPolicy="no-referrer" className="project-account-avatar" />
      ) : (
        <span className="project-account-avatar project-account-avatar-fallback"><UserRound size={16} /></span>
      )}
      <span className="project-account-details">
        <strong>{user?.name || user?.email}</strong>
        <small>{user?.email}</small>
      </span>
      <button type="button" className="project-logout-btn" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất">
        <LogOut size={16} />
      </button>
    </div>
  );
}
