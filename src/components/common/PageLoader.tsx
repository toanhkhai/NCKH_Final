export function PageLoader() {
  return (
    <div className="page-loader animate-in fade-in duration-300" role="status" aria-live="polite" aria-busy="true">
      <div className="relative flex items-center justify-center w-20 h-20" aria-hidden="true">
        <div className="w-20 h-20 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
        <img src="/logo/logo.png" alt="" className="w-10 h-10 object-contain absolute" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700 tracking-tight">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}
