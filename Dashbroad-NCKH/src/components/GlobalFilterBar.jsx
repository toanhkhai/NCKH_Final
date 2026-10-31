import React, { useMemo, useState } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

export const GlobalFilterBar = ({
  filters,
  onFilterChange,
  availableYears = [],
  availableScores = [],
  availableJournals = [],
  isSource2 = false,
  isCombined = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  // Đồng bộ nếu filters.search thay đổi từ bên ngoài (ví dụ reset)
  React.useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  // Debounce 200ms để người dùng gõ phím mượt mà 60fps, không bị đơ giao diện
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFilterChange((prev) => ({ ...prev, search: localSearch }));
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [localSearch, filters.search, onFilterChange]);

  const handleChange = (field, value) => {
    if (field === 'search') {
      setLocalSearch(value);
      // Nếu xóa trắng thì kích hoạt ngay lập tức không cần đợi debounce
      if (!value) {
        onFilterChange((prev) => ({ ...prev, search: '' }));
      }
    } else {
      onFilterChange((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    onFilterChange((prev) => ({ ...prev, search: '' }));
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      onFilterChange((prev) => ({ ...prev, search: localSearch }));
    }
  };

  return (
    <div className="bg-white border-y border-slate-200 py-3 px-4 mb-6 sticky top-[76px] z-30 shadow-sm">
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4">
        
        {/* Hàng 1: Search (và Nút Toggle trên Mobile) */}
        <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1">
          {/* Lọc nhanh (Icon Filter) - Ẩn trên mobile */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 font-bold text-xs uppercase tracking-wider shrink-0">
            <Filter className="w-4 h-4" />
            <span>Bộ Lọc:</span>
          </div>

          {/* Thanh Tìm kiếm */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Tìm theo tên bài báo, tác giả..."
              value={localSearch}
              onChange={(e) => handleChange('search', e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="block w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900 transition-colors"
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                title="Xóa tìm kiếm (quay về danh sách ban đầu)"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none rounded hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Nút Toggle mở rộng trên Mobile */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold shrink-0 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Lọc</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Các bộ lọc chi tiết (Bị ẩn trên Mobile nếu chưa nhấn Lọc) */}
        <div className={`flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 w-full sm:w-auto ${isExpanded ? 'flex' : 'hidden sm:flex'}`}>
          
          {/* Lọc theo Nguồn (chỉ hiện khi xem cả 2 nguồn) */}
          {isCombined && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 shrink-0">
                Nguồn:
              </label>
              <select
                value={filters.sourceType || 'all'}
                onChange={(e) => handleChange('sourceType', e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex-1 sm:flex-none w-full sm:w-auto"
              >
                <option value="all">Tất cả Nguồn</option>
                <option value="source1">Trong nước</option>
                <option value="source2">Quốc tế</option>
              </select>
            </div>
          )}

          {/* Lọc Năm */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 shrink-0">
              Năm XB:
            </label>
            <div className="relative flex items-center w-full sm:w-[105px]">
              <input
                type="text"
                autoComplete="off"
                placeholder="VD: 2026"
                value={filters.year === 'all' ? '' : filters.year}
                onChange={(e) => handleChange('year', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs py-2 pl-2.5 pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-slate-400"
              />
              {filters.year && filters.year !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleChange('year', '')}
                  title="Xóa lọc năm (hiển thị tất cả)"
                  className="absolute right-1 p-1 text-slate-400 hover:text-slate-600 focus:outline-none rounded hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lọc Tạp chí */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 shrink-0">
              Tạp chí ({availableJournals.length}):
            </label>
            <select
              value={filters.journal}
              onChange={(e) => handleChange('journal', e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex-1 sm:flex-none w-full sm:max-w-[150px] truncate"
            >
              <option value="all">Tất cả Tạp chí</option>
              {availableJournals.map((j) => (
                <option key={j} value={j}>{j.length > 30 ? `${j.substring(0, 30)}...` : j}</option>
              ))}
            </select>
          </div>

          {/* Lọc Điểm / Hạng Q (Gộp chung) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 shrink-0">
              Điểm / Hạng Q:
            </label>
            <select
              value={
                filters.score !== 'all' ? `score_${filters.score}` :
                filters.qRank !== 'all' ? `qrank_${filters.qRank}` :
                'all'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') {
                  onFilterChange(prev => ({ ...prev, score: 'all', qRank: 'all' }));
                } else if (val.startsWith('score_')) {
                  onFilterChange(prev => ({ ...prev, score: val.replace('score_', ''), qRank: 'all' }));
                } else if (val.startsWith('qrank_')) {
                  onFilterChange(prev => ({ ...prev, score: 'all', qRank: val.replace('qrank_', '') }));
                }
              }}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex-1 sm:flex-none w-full sm:w-auto"
            >
              <option value="all">Mọi phân loại</option>
              {(!isSource2 || isCombined) && (
                <optgroup label="Điểm HĐGS (Trong nước)">
                  {availableScores.map((s) => (
                    <option key={`score-${s}`} value={`score_${s}`}>{s} điểm</option>
                  ))}
                </optgroup>
              )}
              {(isSource2 || isCombined) && (
                <optgroup label="Phân Hạng (Quốc tế)">
                  <option value="qrank_Q1">Q1</option>
                  <option value="qrank_Q2">Q2</option>
                  <option value="qrank_Q3">Q3</option>
                  <option value="qrank_Q4">Q4</option>
                  <option value="qrank_Khác">Khác / Chưa rõ</option>
                </optgroup>
              )}
            </select>
          </div>

        </div>
      </div>
    </div>
  );
};
