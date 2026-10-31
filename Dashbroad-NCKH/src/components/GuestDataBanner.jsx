import React from 'react';
import { Lock, LogIn, UserCheck, ShieldCheck } from 'lucide-react';

export function GuestDataBanner({ onOpenLogin }) {
  return (
    <div className="my-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs text-center">
      <div className="max-w-lg mx-auto space-y-3.5">
        {/* Icon Lock */}
        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
          <Lock className="w-5 h-5" />
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Yêu cầu đăng nhập để tra cứu chi tiết công trình
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed max-w-lg mx-auto">
            Theo quy chế bảo mật dữ liệu nghiên cứu khoa học của Trường Đại học Y Dược Cần Thơ, bảng danh sách chi tiết các công trình chỉ phục vụ cán bộ, giảng viên và người được phân quyền.
          </p>
        </div>

        {/* Roles Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
          <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Cán bộ / Giảng viên CTUMP</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Đăng nhập bằng tài khoản email <code className="text-slate-700 bg-white px-1 py-0.5 rounded border border-slate-200 text-[11px]">@ctump.edu.vn</code> để tra cứu các bài báo do chính mình là tác giả.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Cán bộ được ủy quyền</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Các tài khoản nằm trong danh sách phân quyền có thể xem và tải toàn bộ danh mục công trình khoa học của trường.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onOpenLogin}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập bằng tài khoản Google</span>
          </button>
          <div className="text-[11px] text-slate-400 mt-2">
            Hệ thống xác thực một lần qua Google Identity Services (OAuth 2.0)
          </div>
        </div>
      </div>
    </div>
  );
}

