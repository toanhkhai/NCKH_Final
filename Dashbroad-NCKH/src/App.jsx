import React, { useState, useMemo, useRef, useDeferredValue } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { useGoogleSheet } from './hooks/useGoogleSheet.js';
import { exportToCleanCSV, normalizeStr, isRecordAuthorMatch } from './utils/cleanData.js';
import { Header } from './components/Header.jsx';
import { KPICards } from './components/KPICards.jsx';
import { ChartsSection } from './components/ChartsSection.jsx';
import { DataTable } from './components/DataTable.jsx';
import { GlobalFilterBar } from './components/GlobalFilterBar.jsx';
import { PermissionManager } from './components/PermissionManager.jsx';
import { LoginModal } from './components/LoginModal.jsx';
import { AlertCircle, FileSpreadsheet, User } from 'lucide-react';
import { DEFAULT_SHEET1_URL, DEFAULT_SHEET2_URL } from './data/rawSheetData.js';

export default function App() {
  const { user, isGuest, isUser, isDelegated, isSuperAdmin, canViewFullData } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Tên tác giả đối soát được lấy trực tiếp và bất biến từ tài khoản Google đăng nhập
  const authorName = (user?.name || '').trim();

  const sheet1Url = DEFAULT_SHEET1_URL;
  const sheet2Url = DEFAULT_SHEET2_URL;

  const sheet1 = useGoogleSheet(sheet1Url, 'source1');
  const sheet2 = useGoogleSheet(sheet2Url, 'source2');

  const [filters, setFilters] = useState({
    search: '',
    year: '',
    score: 'all',
    journal: 'all',
    qRank: 'all',
    sourceType: 'all',
  });

  // Sử dụng useDeferredValue để việc lọc và vẽ lại biểu đồ không chặn luồng gõ phím của người dùng
  const deferredSearch = useDeferredValue(filters.search);

  const activeView = filters.sourceType === 'all' ? 'combined' : filters.sourceType;

  // Dữ liệu dùng cho Biểu đồ & KPI (luôn tính toán đầy đủ cho mọi chế độ xem)
  const activeRecords = useMemo(() => {
    if (activeView === 'source1') return sheet1.data;
    if (activeView === 'source2') return sheet2.data;
    return [...sheet1.data, ...sheet2.data];
  }, [activeView, sheet1.data, sheet2.data]);

  const availableYears = useMemo(() => {
    const set = new Set();
    activeRecords.forEach((r) => {
      const y = String(r.publishYear || '');
      if (y && y !== 'Chưa rõ' && y !== 'Khác' && (y.startsWith('20') || y.startsWith('19'))) {
        set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [activeRecords]);

  const availableScores = useMemo(() => {
    const set = new Set();
    activeRecords.forEach((r) => {
      if (r.score > 0) {
        set.add(r.score.toString());
      }
    });
    return Array.from(set).sort((a, b) => parseFloat(b) - parseFloat(a));
  }, [activeRecords]);

  const availableJournals = useMemo(() => {
    const map = new Map();
    activeRecords.forEach((r) => {
      const j = r.journal;
      if (j && j !== 'Chưa phân loại') {
        map.set(j, (map.get(j) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([j]) => j);
  }, [activeRecords]);

  // Bộ lọc dữ liệu chung (search, year, score, journal, qRank)
  // TỐI ƯU SIÊU TỐC: Dùng searchIndex chuẩn hóa trước, tính normQuery 1 lần duy nhất ngoài vòng lặp
  const filteredRecords = useMemo(() => {
    const rawSearch = (deferredSearch || '').trim();
    // Yêu cầu tối thiểu 2 ký tự để kích hoạt tìm kiếm (vừa loại bỏ lag vừa giải quyết triệt để vấn đề gõ 1 chữ cái)
    const hasSearch = rawSearch.length >= 2;
    const normQuery = hasSearch ? normalizeStr(rawSearch) : '';

    return activeRecords.filter((record) => {
      if (hasSearch && normQuery) {
        const recordIndex = record.searchIndex || '';
        if (!recordIndex.includes(normQuery)) {
          return false;
        }
      }

      if (filters.year && filters.year !== 'all') {
        const query = String(filters.year).trim();
        if (query) {
          const recYearStr = String(record.publishYear || '').trim();
          const recYearNum = parseInt(recYearStr, 10);

          const rangeMatch = query.match(/^(\d{4})\s*[-–—:]\s*(\d{4})$/);
          const gteMatch = query.match(/^(?:>=|>)\s*(\d{4})$/);
          const lteMatch = query.match(/^(?:<=|<)\s*(\d{4})$/);

          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            const min = Math.min(start, end);
            const max = Math.max(start, end);
            if (isNaN(recYearNum) || recYearNum < min || recYearNum > max) {
              return false;
            }
          } else if (gteMatch) {
            const threshold = parseInt(gteMatch[1], 10);
            const isStrict = query.startsWith('>');
            if (isNaN(recYearNum) || (isStrict ? recYearNum <= threshold : recYearNum < threshold)) {
              return false;
            }
          } else if (lteMatch) {
            const threshold = parseInt(lteMatch[1], 10);
            const isStrict = query.startsWith('<');
            if (isNaN(recYearNum) || (isStrict ? recYearNum >= threshold : recYearNum > threshold)) {
              return false;
            }
          } else {
            if (recYearStr !== query) return false;
          }
        }
      }

      if (filters.score !== 'all') {
        if (record.sourceType === 'source2' && Number(record.score) === 0) return false;
        const targetScore = parseFloat(filters.score);
        if (Math.abs(Number(record.score) - targetScore) > 0.01) return false;
      }

      if (filters.journal !== 'all') {
        if (record.journal !== filters.journal) return false;
      }

      if (filters.qRank !== 'all') {
        if (filters.qRank === 'Khác') {
          if (record.sourceType !== 'source2') return false;
          if (['Q1', 'Q2', 'Q3', 'Q4'].includes(record.qRank)) return false;
        } else {
          if (record.qRank !== filters.qRank) return false;
        }
      }

      if (filters.sourceType && filters.sourceType !== 'all') {
        if (record.sourceType !== filters.sourceType) return false;
      }

      return true;
    });
  }, [activeRecords, filters, deferredSearch]);

  // PHÂN QUYỀN DỮ LIỆU BẢNG TRA CỨU (DataTable):
  // - View 3 (Delegated & Super Admin): Hiển thị toàn bộ dữ liệu (Full data)
  // - View 2 (User - Gmail không nằm trong Whitelist):
  //   + Khi User search trên ô text tìm kiếm: Bảng hiển thị các kết quả liên quan
  //   + Khi xóa / không có từ khóa tìm kiếm: Bảng quay về trạng thái ban đầu
  //     (chỉ hiển thị bài của user nếu có, hoặc không hiển thị gì nếu không có công trình NCKH nào)
  const userFilteredRecords = useMemo(() => {
    if (canViewFullData) {
      return filteredRecords;
    }

    if (isUser) {
      const hasSearch = Boolean(deferredSearch && deferredSearch.trim().length >= 2);
      if (hasSearch) {
        // Khi user search trên ô text (tối thiểu 2 ký tự): hiển thị các kết quả liên quan
        return filteredRecords;
      }

      // Khi chưa tìm kiếm hoặc từ khóa < 2 ký tự: quay về trạng thái hiển thị bài của user
      if (authorName) {
        return filteredRecords.filter((record) => {
          return isRecordAuthorMatch(record, authorName);
        });
      }

      return [];
    }

    return [];
  }, [filteredRecords, canViewFullData, isUser, authorName, deferredSearch]);

  const currentLoading =
    activeView === 'source1'
      ? sheet1.loading
      : activeView === 'source2'
        ? sheet2.loading
        : sheet1.loading || sheet2.loading;

  const currentError =
    activeView === 'source1'
      ? sheet1.error
      : activeView === 'source2'
        ? sheet2.error
        : (sheet1.error && sheet2.error ? `${sheet1.error} | ${sheet2.error}` : null);

  const currentWarning =
    activeView === 'source1'
      ? sheet1.warning
      : activeView === 'source2'
        ? sheet2.warning
        : (sheet1.warning || sheet2.warning || (sheet1.error ? `Nguồn 1: ${sheet1.error}` : sheet2.error ? `Nguồn 2: ${sheet2.error}` : null));

  const currentLastUpdated =
    activeView === 'source1'
      ? sheet1.lastUpdated
      : activeView === 'source2'
        ? sheet2.lastUpdated
        : sheet1.lastUpdated || sheet2.lastUpdated;

  const handleExportCSV = () => {
    const tabName =
      activeView === 'source1'
        ? 'NgoaiTruong'
        : activeView === 'source2'
          ? 'MoRong_QuocTe'
          : 'TongHop';
    const filename = `CTUMP_Research_${tabName}_${new Date().toISOString().slice(0, 10)}.csv`;
    // Chỉ cho phép xuất tập dữ liệu mà user được quyền xem
    exportToCleanCSV(userFilteredRecords, filename);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      <Header
        activeTab={activeView}
        onTabChange={() => {}}
        recordCount={activeRecords.length}
        source1Count={sheet1.data.length}
        source2Count={sheet2.data.length}
        lastUpdated={currentLastUpdated}
        loading={currentLoading}
        error={currentError}
        onExportCSV={handleExportCSV}
        onOpenPermissionManager={() => setShowPermissionModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error notification */}
        {currentError && (
          <div className="mb-6 p-4 rounded-sm bg-red-50 border border-red-200 flex items-start gap-3.5 text-red-800 text-xs sm:text-sm shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-red-900">Không thể đọc dữ liệu từ Google Sheets:</div>
              <p className="mt-1 leading-relaxed">{currentError}</p>
              <div className="mt-3 flex items-center flex-wrap gap-2.5">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                >
                  <span>Tải lại trang</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {!currentError && currentWarning && (
          <div className="mb-6 p-3 rounded-sm bg-blue-50 border border-blue-200 flex items-center gap-3 text-blue-800 text-xs">
            <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="flex-1">{currentWarning}</p>
          </div>
        )}

        {/* Hiệu ứng đang tải dữ liệu khi khởi động trang (Level 2) */}
        {currentLoading && activeRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 sm:py-32 animate-in fade-in duration-300">
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="w-20 h-20 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
              <img
                src="/logo/logo.png"
                alt="Logo CTUMP"
                className="w-10 h-10 object-contain absolute"
              />
            </div>
            <div className="mt-5 text-center">
              <p className="text-sm font-semibold text-slate-700 tracking-tight">
                Đang tải dữ liệu...
              </p>
            </div>
          </div>
        )}

        {!currentLoading && !currentError && activeRecords.length === 0 && (
          <div className="text-center py-20 text-slate-500 text-xs">
            Bảng tính không có dữ liệu để hiển thị.
          </div>
        )}

        {activeRecords.length > 0 && (
          <>
            {/* Bộ lọc chung */}
            <GlobalFilterBar
              filters={filters}
              onFilterChange={setFilters}
              availableYears={availableYears}
              availableScores={availableScores}
              availableJournals={availableJournals}
              isSource2={activeView === 'source2'}
              isCombined={true}
            />

            {/* BIỂU ĐỒ & KPI (KPICards, ChartsSection): HIỂN THỊ ĐẦY ĐỦ CHO TẤT CẢ CÁC VIEW */}
            <KPICards
              records={filteredRecords}
              isSource2={activeView === 'source2'}
              activeTab={activeView}
              loading={currentLoading}
            />

            <ChartsSection records={filteredRecords} activeTab={activeView} />

            {/* BẢNG TRA CỨU (DataTable):
                - Chưa đăng nhập (Guest): Không hiển thị bảng và không hiện banner
                - View 2 (User): Chỉ hiển thị các dòng có email tác giả khớp với user đang login
                - View 3 (Delegated & Super Admin): Hiển thị toàn bộ dữ liệu (Full data)
            */}
            {!isGuest && (
              <div className="space-y-3">
                {/* Dòng thông báo nhỏ cho Chế độ User */}
                {isUser && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 px-1">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {filters.search?.trim().length >= 2 ? (
                      <span>
                        Kết quả tìm kiếm cho &ldquo;<strong>{filters.search.trim()}</strong>&rdquo;: tìm thấy <strong>{userFilteredRecords.length}</strong> bài báo
                      </span>
                    ) : filters.search?.trim().length === 1 ? (
                      <span className="text-amber-600 font-medium">
                        Vui lòng nhập tối thiểu 2 ký tự để tìm kiếm...
                      </span>
                    ) : (
                      <span>
                        Đang hiển thị <strong>{userFilteredRecords.length}</strong> bài báo của tác giả <strong>{user?.name || user?.email}</strong>
                      </span>
                    )}
                  </div>
                )}


                <DataTable
                  records={userFilteredRecords}
                  loading={currentLoading}
                />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-5 px-4 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-600">
          Trường Đại học Y Dược Cần Thơ - Phòng Khoa học và Công nghệ
        </p>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Permission Manager Modal (Super Admin) */}
      <PermissionManager
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
      />
    </div>
  );
}
