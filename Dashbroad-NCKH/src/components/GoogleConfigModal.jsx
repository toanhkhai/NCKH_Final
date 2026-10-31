import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Key, ShieldCheck, Globe, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function GoogleConfigModal({ isOpen, onClose }) {
  const { clientId, updateClientId } = useAuth();
  const [tempId, setTempId] = useState(clientId || '');
  const [copiedKey, setCopiedKey] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = window.location.origin;

  const handleCopy = (text, keyName) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateClientId(tempId);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Hướng dẫn cấu hình Google Cloud Console
              </h2>
              <p className="text-xs text-slate-500">
                Thiết lập OAuth 2.0 Client ID để kích hoạt đăng nhập Gmail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-600">
          {/* Quick Input Section */}
          <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200">
            <label className="block text-xs font-bold text-blue-900 mb-1.5">
              Dán Google Client ID của bạn vào đây:
            </label>
            <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="xxxx-xxxxxxxx.apps.googleusercontent.com"
                value={tempId}
                onChange={(e) => setTempId(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã lưu!</span>
                  </>
                ) : (
                  <span>Lưu & Kích hoạt</span>
                )}
              </button>
            </form>
            <p className="text-[11px] text-blue-700 mt-2">
              (Hoặc bạn có thể thêm biến <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-blue-900">VITE_GOOGLE_CLIENT_ID</code> vào file <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-blue-900">.env</code> ở thư mục gốc của dự án).
            </p>
          </div>

          {/* Step by step guide */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Các bước thực hiện trên Google Cloud Console:
            </h3>

            {/* Bước 1 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Bước 1: Truy cập Google Cloud Console & Tạo Project
                </span>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  Mở Console <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-slate-600">
                Đăng nhập tài khoản Google &gt; Nhấn vào nút chọn dự án ở góc trên cùng &gt; Nhấn <strong>New Project</strong> (ví dụ đặt tên: <code className="font-mono text-slate-800">CTUMP-Dashboard</code>).
              </p>
            </div>

            {/* Bước 2 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <span className="font-bold text-slate-800 block">
                Bước 2: Cấu hình Màn hình chấp thuận OAuth (OAuth consent screen)
              </span>
              <p className="text-slate-600">
                Vào menu <strong>APIs & Services &gt; OAuth consent screen</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li>Chọn <strong>External</strong> (hoặc Internal nếu dùng Google Workspace trường tổ chức).</li>
                <li>Điền <strong>App name</strong> (ví dụ: <span className="font-medium text-slate-800">CTUMP Dashboard NCKH</span>).</li>
                <li>Điền <strong>User support email</strong> và <strong>Developer contact information</strong> (email của bạn).</li>
                <li>Bấm <strong>Save and Continue</strong> cho đến khi hoàn thành.</li>
                <li><em>Lưu ý:</em> Ở phần <strong>Test users</strong>, hãy thêm các địa chỉ Gmail bạn muốn dùng để đăng nhập thử nghiệm.</li>
              </ul>
            </div>

            {/* Bước 3 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <span className="font-bold text-slate-800 block">
                Bước 3: Tạo OAuth 2.0 Client ID (Quan trọng nhất)
              </span>
              <p className="text-slate-600">
                Vào menu <strong>APIs & Services &gt; Credentials &gt; Create Credentials &gt; OAuth client ID</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-1">
                <li><strong>Application type:</strong> Chọn <span className="font-semibold text-slate-800">Web application</span>.</li>
                <li><strong>Name:</strong> Nhập <span className="font-semibold text-slate-800">CTUMP Web Client</span>.</li>
                <li>
                  <div className="mt-1">
                    <strong>Authorized JavaScript origins (Nguồn gốc JavaScript được ủy quyền):</strong>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-blue-700 flex-1">
                        {currentOrigin}
                      </code>
                      <button
                        onClick={() => handleCopy(currentOrigin, 'origin1')}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        {copiedKey === 'origin1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'origin1' ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                    </div>
                    {currentOrigin !== 'http://localhost:3000' && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <code className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-blue-700 flex-1">
                          http://localhost:3000
                        </code>
                        <button
                          onClick={() => handleCopy('http://localhost:3000', 'origin2')}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          {copiedKey === 'origin2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          Sao chép
                        </button>
                      </div>
                    )}
                  </div>
                </li>
                <li>
                  <strong>Authorized redirect URIs (nếu có yêu cầu):</strong>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-blue-700 flex-1">
                      {currentOrigin}
                    </code>
                    <button
                      onClick={() => handleCopy(currentOrigin, 'redirect')}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'redirect' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      Sao chép
                    </button>
                  </div>
                </li>
              </ul>
              <p className="text-slate-600">
                Nhấn <strong>Create</strong>. Cửa sổ hiện ra sẽ hiển thị <strong>Client ID</strong> (kết thúc bằng <code className="font-mono text-slate-800">.apps.googleusercontent.com</code>).
              </p>
            </div>

            {/* Bước 4 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <span className="font-bold text-slate-800 block">
                Bước 4: Dán Client ID vào ứng dụng
              </span>
              <p className="text-slate-600 leading-relaxed">
                Sao chép chuỗi Client ID đó rồi dán vào ô trên đầu trang này và bấm <strong>Lưu</strong>, hoặc dán vào file <code className="font-mono text-slate-800">.env</code> trong project với cú pháp:
              </p>
              <div className="relative">
                <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-md overflow-x-auto">
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
                </pre>
                <button
                  onClick={() => handleCopy('VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com', 'envSnippet')}
                  className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1"
                >
                  {copiedKey === 'envSnippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
}
