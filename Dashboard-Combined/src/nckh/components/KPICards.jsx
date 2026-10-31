import React from 'react';

/**
 * ============================================================================
 * COMPONENT: KPICards
 * ============================================================================
 * Hiển thị các thẻ chỉ số KPI cốt lõi của nghiên cứu khoa học:
 * 1. Tổng số bài báo công bố (kèm phân bổ Trong nước / Quốc tế)
 * 2. Tạp chí & Kỷ yếu công bố (Số lượng kênh xuất bản uy tín độc lập)
 * 3. Tác giả liên hệ độc lập (Nguồn 1) hoặc Bài báo Q1/Q2 (Nguồn 2 / Tổng hợp)
 * 4. Tỷ lệ minh chứng Google Drive đã thẩm định
 * ============================================================================
 */
export const KPICards = ({ records = [], isSource2 = false, activeTab = 'source1', loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm "
          >
            <div className="h-4 bg-slate-200 rounded-sm w-2/3 mb-3"></div>
            <div className="h-8 bg-slate-100 rounded-sm w-1/2 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded-sm w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalArticles = records.length;

  // Lọc số bài Trong nước (source1) và Quốc tế (source2)
  const domesticCount = records.filter((r) => r.sourceType === 'source1').length;
  const intlCount = records.filter((r) => r.sourceType === 'source2').length;

  // Thống kê số lượng Tạp chí / Kỷ yếu công bố độc lập
  const uniqueJournals = new Set(
    records
      .map((r) => r.journal)
      .filter((j) => j && j !== 'Chưa phân loại' && j !== '—')
  ).size;

  const domesticJournals = new Set(
    records
      .filter((r) => r.sourceType === 'source1')
      .map((r) => r.journal)
      .filter((j) => j && j !== 'Chưa phân loại' && j !== '—')
  ).size;

  const intlJournals = new Set(
    records
      .filter((r) => r.sourceType === 'source2')
      .map((r) => r.journal)
      .filter((j) => j && j !== 'Chưa phân loại' && j !== '—')
  ).size;

  // Số lượng tác giả liên hệ độc lập
  const uniqueAuthors = new Set(
    records
      .map((r) => r.correspondingAuthor)
      .filter((a) => a && a !== 'Chưa cập nhật' && a !== '—')
  ).size;

  // Thống kê minh chứng Google Drive
  const proofCount = records.filter((r) => r.proofLinks && r.proofLinks.length > 0).length;
  const proofPercentage = totalArticles > 0 ? Math.round((proofCount / totalArticles) * 100) : 0;

  // Thống kê phân hạng Q1 & Q2 cho nguồn Mở rộng / Quốc tế
  const q1Count = records.filter((r) => r.qRank === 'Q1').length;
  const q2Count = records.filter((r) => r.qRank === 'Q2').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* KPI 1: Tổng số bài báo */}
      <div className="bg-white border-l-4 border-slate-200 border-l-blue-600 rounded-sm p-4 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Tổng số bài báo
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {totalArticles.toLocaleString('vi-VN')}
            </h3>
            <div className="text-[11px] text-slate-500 mt-2">
              {activeTab === 'combined' ? (
                <span>Trong nước: <strong className="text-slate-700">{domesticCount}</strong> | Quốc tế: <strong className="text-slate-700">{intlCount}</strong></span>
              ) : activeTab === 'source2' ? (
                <span>Quốc tế & Mở rộng (Scopus/ISI)</span>
              ) : (
                <span>Trong nước (Ngoài trường - HĐGS)</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* KPI 2: Tạp chí & Kỷ yếu */}
      <div className="bg-white border-l-4 border-slate-200 border-l-emerald-600 rounded-sm p-4 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Tổng số tạp chí đã đăng
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {uniqueJournals.toLocaleString('vi-VN')}
            </h3>
            <p className="text-[11px] text-slate-500 mt-2 truncate">
              {activeTab === 'combined'
                ? `Trong nước: ${domesticJournals} | Quốc tế: ${intlJournals}`
                : activeTab === 'source2'
                  ? 'Kênh công bố quốc tế (Scopus/ISI)'
                  : 'Tạp chí HĐGS Nhà nước công nhận'}
            </p>
          </div>

        </div>
      </div>

      {/* KPI 3: Tác giả liên hệ / Phân hạng Q */}
      <div className="bg-white border-l-4 border-slate-200 border-l-amber-500 rounded-sm p-4 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {activeTab === 'source2'
                ? 'Bài báo Q1 / Q2'
                : activeTab === 'combined'
                  ? 'Công trình Quốc tế'
                  : 'Tác giả liên hệ độc lập'}
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {activeTab === 'source2'
                ? `${q1Count + q2Count}`
                : activeTab === 'combined'
                  ? `${intlCount}`
                  : uniqueAuthors.toLocaleString('vi-VN')}
            </h3>
            <p className="text-[11px] text-slate-500 mt-2">
              {activeTab === 'source2'
                ? `Q1: ${q1Count} | Q2: ${q2Count} bài`
                : activeTab === 'combined'
                  ? `Q1/Q2: ${q1Count + q2Count} bài (${intlCount > 0 ? (((q1Count + q2Count) / intlCount) * 100).toFixed(1) : 0}% tổng)`
                  : 'Cán bộ / Tác giả chịu trách nhiệm'}
            </p>
          </div>

        </div>
      </div>

      {/* KPI 4: Thẩm định Minh chứng */}
      <div className="bg-white border-l-4 border-slate-200 border-l-cyan-600 rounded-sm p-4 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Minh chứng hồ sơ
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {proofCount.toLocaleString('vi-VN')}
            </h3>
            <p className="text-[11px] text-slate-500 mt-2">
              Tỷ lệ minh chứng Drive: <strong className="text-slate-700">{proofPercentage}%</strong>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

