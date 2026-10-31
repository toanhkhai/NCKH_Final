import React, { useState } from 'react';
import { AlertCircle, LogOut, User, ShieldCheck, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { LoginModal } from './LoginModal.jsx';

export const Header = ({
  activeTab = 'source1',
  onTabChange,
  recordCount = 0,
  source1Count = 0,
  source2Count = 0,
  lastUpdated = null,
  loading = false,
  error = null,
  onOpenPermissionManager,
}) => {
  const { user, logout, isGuest, role, isSuperAdmin, isDelegated, isUser, whitelist } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
            {/* Logo & Portal Title */}
            <div className="flex items-center gap-3">
              <img
                src="/logo/logo.png"
                alt="Logo CTUMP"
                className="w-11 h-11 object-contain shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight uppercase">
                    Dashboard Nghiên Cứu Khoa Học - Trường Đại Học Y Dược Cần Thơ
                  </h1>
                  {error && (
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-red-100 text-red-600 border border-red-200 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Lỗi kết nối Sheet
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Hệ thống quản lý và trực quan hóa dữ liệu công bố khoa học
                </p>
              </div>
            </div>

            {/* User Profile & Actions (Cả 3 khối cùng chiều cao h-10, bo góc, viền đồng bộ) */}
            <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
              {/* If Guest (Not logged in) */}
              {isGuest ? (
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Đăng nhập hệ thống NCKH"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
              ) : (
                /* If Logged In: Cả 3 khối cùng chuẩn chiều cao h-10, bo góc rounded-lg, viền border-slate-200 */
                <div className="flex items-center gap-2">
                  {/* 1. Nút Phân Quyền: Nền trắng thanh lịch, viền xám, icon xanh y tế, badge số lượng */}
                  {isSuperAdmin && onOpenPermissionManager && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenPermissionManager();
                      }}
                      className="group h-10 px-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                      title="Quản lý danh sách tài khoản được ủy quyền tra cứu"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-600 group-hover:scale-105 transition-transform shrink-0" />
                      <span>Phân quyền</span>
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full text-[10px] font-semibold min-w-[18px]">
                        {whitelist?.delegatedEmails?.length || 0}
                      </span>
                    </button>
                  )}

                  {/* 2. Khối Thông Tin Tài Khoản: Chuẩn chiều cao h-10, cùng viền và bo góc */}
                  <div className="h-10 px-3 bg-white border border-slate-200 rounded-lg flex items-center gap-2.5 shadow-xs">
                    {user?.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold border border-slate-200 shrink-0">
                        {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                      </div>
                    )}

                    <div className="text-left hidden sm:flex flex-col justify-center">
                      <div className="text-xs font-semibold text-slate-800 leading-none flex items-center gap-1.5">
                        <span className="truncate max-w-[120px]">{user?.name}</span>
                        {/* Role Badges */}
                        {isSuperAdmin && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            Quản trị
                          </span>
                        )}
                        {isDelegated && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                            Manager
                          </span>
                        )}
                        {isUser && !isSuperAdmin && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded border border-slate-200">
                            User
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px] leading-none mt-1">
                        {user?.email}
                      </div>
                    </div>
                  </div>

                  {/* 3. Nút Đăng Xuất: Chuẩn chiều cao h-10, hover đỏ nhạt tinh tế */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmLogout(true)}
                    title="Đăng xuất khỏi hệ thống"
                    className="group h-10 px-3.5 bg-white hover:bg-rose-50/70 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors shrink-0" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Confirm Logout Modal */}
      {showConfirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900">Xác nhận đăng xuất</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản{' '}
              <strong className="text-slate-800">{user?.email}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmLogout(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmLogout(false);
                  logout();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
};
