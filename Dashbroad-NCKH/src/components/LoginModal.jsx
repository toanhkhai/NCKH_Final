import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { X, Key, AlertTriangle } from 'lucide-react';
import { GoogleConfigModal } from './GoogleConfigModal.jsx';

export function LoginModal({ isOpen, onClose }) {
  const { clientId, isConfigured, loginWithCredential } = useAuth();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [isLoadingGsi, setIsLoadingGsi] = useState(true);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    let checkTimer;

    const handleCredentialResponse = (response) => {
      setLoginError(null);
      if (response?.credential) {
        try {
          loginWithCredential(response.credential);
          onClose();
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

          // Làm trống DOM container một cách an toàn không qua React reconciliation
          while (googleButtonRef.current.firstChild) {
            googleButtonRef.current.removeChild(googleButtonRef.current.firstChild);
          }

          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 300,
            locale: 'vi',
          });

          setIsLoadingGsi(false);
        } catch (error) {
          console.error('Lỗi GIS:', error);
          setIsLoadingGsi(false);
        }
      }
    };

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
  }, [isOpen, clientId, isConfigured, loginWithCredential, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <img
              src="/logo/logo.png"
              alt="CTUMP"
              className="w-10 h-10 object-contain shrink-0"
            />
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                Đăng nhập hệ thống
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Đại học Y Dược Cần Thơ (CTUMP)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 sm:py-7">
          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{loginError}</div>
            </div>
          )}

          {isConfigured ? (
            <div className="flex flex-col items-center justify-center">
              {/* Spinner khi đang nạp Google GSI */}
              {isLoadingGsi && (
                <div className="text-xs text-slate-500 flex items-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải nút đăng nhập...</span>
                </div>
              )}

              {/* Container nút Google */}
              <div
                ref={googleButtonRef}
                className="min-h-[44px] flex items-center justify-center w-full"
              />
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2.5 text-xs">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Chưa cấu hình Google Client ID</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Để kích hoạt đăng nhập Google, vui lòng cấu hình OAuth Client ID trong file <code>.env</code>.
              </p>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-xs transition-colors cursor-pointer"
              >
                Cấu hình Google Client ID
              </button>
            </div>
          )}
        </div>
      </div>

      <GoogleConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} />
    </div>
  );
}
