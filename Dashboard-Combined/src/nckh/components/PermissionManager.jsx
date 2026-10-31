import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import initialWhitelist from '../data/whitelist.json';
import {
  X,
  Plus,
  Trash2,
  Save,
  Download,
  Copy,
  RotateCcw,
  Check,
  AlertCircle,
  Search,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export function PermissionManager({ isOpen, onClose }) {
  const { whitelist, updateWhitelist, resetWhitelistToDefault, isSuperAdmin, user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState(null);

  // Chuẩn hóa dữ liệu an toàn
  const safeWhitelist = useMemo(() => {
    return {
      superAdmin: whitelist?.superAdmin || initialWhitelist.superAdmin || 'chuyendoiso@ctump.edu.vn',
      delegatedEmails: Array.isArray(whitelist?.delegatedEmails) ? whitelist.delegatedEmails : [],
      lastUpdated: whitelist?.lastUpdated || '',
    };
  }, [whitelist]);

  const delegatedList = safeWhitelist.delegatedEmails;
  const currentSuperAdmin = safeWhitelist.superAdmin;

  // Lọc theo từ khóa tìm kiếm
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return delegatedList;
    const q = searchQuery.toLowerCase().trim();
    return delegatedList.filter((e) => typeof e === 'string' && e.toLowerCase().includes(q));
  }, [delegatedList, searchQuery]);

  const formattedDate = useMemo(() => {
    try {
      if (!safeWhitelist.lastUpdated) return 'Mặc định';
      const d = new Date(safeWhitelist.lastUpdated);
      return isNaN(d.getTime()) ? 'Mặc định' : d.toLocaleDateString('vi-VN');
    } catch {
      return 'Mặc định';
    }
  }, [safeWhitelist.lastUpdated]);

  if (!isOpen) {
    return null;
  }

  const handleAddEmail = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const emailToAdd = newEmail.trim().toLowerCase();

    if (!emailToAdd) {
      setErrorMsg('Vui lòng nhập địa chỉ email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToAdd)) {
      setErrorMsg('Địa chỉ email không đúng định dạng (VD: example@ctump.edu.vn).');
      return;
    }

    if (emailToAdd === currentSuperAdmin.toLowerCase()) {
      setErrorMsg('Email này hiện là tài khoản quản trị, không cần thêm vào danh sách ủy quyền.');
      return;
    }

    if (delegatedList.some((e) => typeof e === 'string' && e.toLowerCase() === emailToAdd)) {
      setErrorMsg('Email này đã tồn tại trong danh sách ủy quyền.');
      return;
    }

    const updatedList = [...delegatedList, emailToAdd];
    const updatedWhitelist = {
      ...safeWhitelist,
      delegatedEmails: updatedList,
    };

    updateWhitelist(updatedWhitelist);
    setNewEmail('');
    setSuccessMsg(`Đã thêm tài khoản: ${emailToAdd}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRemoveEmail = (emailToRemove) => {
    const updatedList = delegatedList.filter(
      (e) => typeof e === 'string' && e.toLowerCase() !== emailToRemove.toLowerCase()
    );
    const updatedWhitelist = {
      ...safeWhitelist,
      delegatedEmails: updatedList,
    };
    updateWhitelist(updatedWhitelist);
    setConfirmDeleteEmail(null);
    setSuccessMsg(`Đã xóa tài khoản: ${emailToRemove}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveToSource = async () => {
    setIsSaving(true);
    setErrorMsg('');
    try {
      await updateWhitelist(safeWhitelist);
      setSuccessMsg('Đã lưu dữ liệu phân quyền vào mã nguồn (whitelist.json).');
    } catch (err) {
      setErrorMsg('Lỗi khi lưu dữ liệu: ' + (err?.message || 'Không thể lưu'));
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  const handleExportJSON = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(safeWhitelist, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'whitelist.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      setErrorMsg('Lỗi xuất file: ' + err.message);
    }
  };

  const handleCopyJSON = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(safeWhitelist, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMsg('Không thể sao chép dữ liệu.');
    }
  };

  const handleResetToSource = () => {
    try {
      resetWhitelistToDefault();
      setSuccessMsg('Đã đồng bộ và tải lại danh sách từ file mã nguồn (whitelist.json).');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg('Không thể khôi phục dữ liệu: ' + (err?.message || 'Lỗi không xác định'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Thiết kế chuẩn hệ thống phần mềm thực tế */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Phân quyền tra cứu dữ liệu
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh sách tài khoản được phép xem toàn bộ danh mục công trình NCKH
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 flex-1">
          {/* Thông báo Alert */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Dòng hiển thị tài khoản quản trị */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Tài khoản quản trị:</span>
              <span className="font-semibold text-slate-800">{currentSuperAdmin}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Toàn quyền</span>
          </div>

          {/* Form thêm email */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Thêm email cán bộ được ủy quyền:
            </label>
            <form onSubmit={handleAddEmail} className="flex gap-2">
              <input
                type="email"
                placeholder="Nhập địa chỉ email cán bộ (ví dụ: giangvien@ctump.edu.vn)..."
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-800"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm</span>
              </button>
            </form>
          </div>

          {/* Bảng danh sách tài khoản ủy quyền */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Danh sách tài khoản ủy quyền ({delegatedList.length})
              </span>

              {/* Tìm kiếm nhanh */}
              {delegatedList.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 w-44 text-slate-700"
                  />
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3">Email tài khoản</th>
                    <th className="py-2.5 px-3 w-36 text-center">Quyền hạn</th>
                    <th className="py-2.5 px-3 w-20 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                        {searchQuery ? 'Không tìm thấy email phù hợp.' : 'Chưa có tài khoản nào trong danh sách ủy quyền.'}
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((email, idx) => (
                      <tr key={email} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          {email}
                          {email === user?.email && (
                            <span className="ml-2 text-[10px] text-blue-600 font-normal">
                              (Hiện tại)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                            Xem toàn bộ dữ liệu
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {confirmDeleteEmail === email ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleRemoveEmail(email)}
                                className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-medium hover:bg-red-700"
                              >
                                Xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteEmail(null)}
                                className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] hover:bg-slate-300"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteEmail(email)}
                              title="Xóa tài khoản này"
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>Lưu tại: <code>src/data/whitelist.json</code></span>
              <span>Cập nhật: {formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJSON}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép JSON'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Tải file</span>
            </button>

            <button
              type="button"
              onClick={handleResetToSource}
              title="Khôi phục và đồng bộ lại danh sách phân quyền từ file mã nguồn (whitelist.json)"
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Đồng bộ từ file</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition-colors"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleSaveToSource}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
