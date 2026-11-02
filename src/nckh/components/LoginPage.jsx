import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { GoogleConfigModal } from './GoogleConfigModal.jsx';
import { ShieldCheck, Sparkles, Key, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';

export function LoginPage() {
  const { clientId, isConfigured, loginWithCredential, loginAsGuest } = useAuth();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [isLoadingGsi, setIsLoadingGsi] = useState(true);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    let checkTimer;

    const handleCredentialResponse = (response) => {
      setLoginError(null);
      if (response?.credential) {
        try {
          loginWithCredential(response.credential);
        } catch (err) {
          setLoginError(err.message || 'Lỗi xử lý phản hồi từ Google');
        }
      } else {
        setLoginError('Không nhận được thông tin xác thực từ Google.');
      }
    };

    const setupGoogleButton = () => {
      if (!isConfigured) {
        setIsLoadingGsi(false);
        return;
      }

      if (window.google?.accounts?.id && googleButtonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Xóa nội dung cũ trước khi render
          googleButtonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,
            locale: 'vi',
          });

          setIsLoadingGsi(false);
        } catch (error) {
          console.error('Lỗi khởi tạo Google GIS:', error);
          setIsLoadingGsi(false);
        }
      }
    };

    // Kiểm tra và chờ thư viện GIS của Google sẵn sàng
    if (window.google?.accounts?.id) {
      setupGoogleButton();
    } else {
      let attempts = 0;
      checkTimer = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          setupGoogleButton();
          clearInterval(checkTimer);
        } else if (attempts > 20) {
          setIsLoadingGsi(false);
          clearInterval(checkTimer);
        }
      }, 250);
    }

    return () => {
      if (checkTimer) clearInterval(checkTimer);
    };
  }, [clientId, isConfigured, loginWithCredential]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Branding */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-white p-1 flex items-center justify-center shadow-md">
            <img
              src="/logo/logo.png"
              alt="Logo CTUMP"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
              Cổng dữ liệu khoa học
            </div>
            <div className="text-sm font-bold text-white tracking-tight uppercase">
              Đại học Y Dược Cần Thơ
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowConfigModal(true)}
          className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 hover:border-slate-500 transition-all bg-slate-800/60 backdrop-blur-sm"
        >
          <Key className="w-3.5 h-3.5 text-blue-400" />
          <span>Cấu hình Google Cloud</span>
        </button>
      </header>

      {/* Main Content Card */}
      <main className="w-full max-w-md mx-auto px-4 py-8 relative z-10 flex flex-col items-center justify-center">
        <div className="w-full bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-7 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle top decorative border line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-teal-400" />

          {/* Header in Card */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-700/60 border border-slate-600/60 p-2.5 mb-4 shadow-inner">
              <img
                src="/logo/logo.png"
                alt="Logo CTUMP"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">
              Đăng nhập hệ thống
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Truy cập Dashboard Nghiên cứu Khoa học bằng tài khoản Google / Gmail của bạn
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{loginError}</div>
            </div>
          )}

          {/* Google Sign In Container */}
          <div className="space-y-4">
            {isConfigured ? (
              <div className="flex flex-col items-center">
                {isLoadingGsi && (
                  <div className="text-xs text-slate-400 flex items-center gap-2 py-3">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span>Đang nạp nút Google Sign-In...</span>
                  </div>
                )}
                <div
                  ref={googleButtonRef}
                  className="min-h-[44px] flex items-center justify-center w-full"
                />
                <p className="text-[11px] text-slate-400 mt-3 text-center">
                  Hỗ trợ tài khoản Gmail cá nhân và Google Workspace trường học (<span className="text-slate-300 font-mono">@ctump.edu.vn</span>)
                </p>
              </div>
            ) : (
              /* Notice when Google Client ID has not been provided yet */
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-amber-300">
                      Chưa cấu hình Google Client ID
                    </h3>
                    <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                      Để sử dụng nút đăng nhập bằng Google, bạn cần tạo OAuth Client ID trên Google Cloud Console và thêm vào hệ thống.
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => setShowConfigModal(true)}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Xem hướng dẫn & Nhập Client ID</span>
                  </button>
                </div>
              </div>
            )}

            {/* Guest / Demo Option Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-slate-800 text-slate-400 text-[11px] font-medium">
                  hoặc
                </span>
              </div>
            </div>

            {/* Quick Demo Login Button */}
            <button
              onClick={() => loginAsGuest()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600/80 font-semibold text-xs flex items-center justify-center gap-2 transition-all group"
            >
              <UserCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Truy cập nhanh (Chế độ xem trước Demo)</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Security Features Info */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Google OAuth 2.0
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Bảo mật trực tiếp
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 relative z-10 border-t border-slate-800">
        <p>Trường Đại học Y Dược Cần Thơ — Phòng Khoa học và Công nghệ</p>
      </footer>

      {/* Google Cloud Configuration Modal */}
      <GoogleConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
}
