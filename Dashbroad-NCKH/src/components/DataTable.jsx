import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileText,
} from 'lucide-react';

export const DataTable = ({ records = [], loading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('publishDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Logic sắp xếp
  const sortedRecords = useMemo(() => {
    const list = [...records];
    
    // Helper parse ngày để sắp xếp chính xác
    const parseDate = (dString) => {
      if (!dString) return 0;
      const str = String(dString).trim();
      
      // Pattern: DD/MM/YYYY
      let match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
      if (match) {
         const day = parseInt(match[1], 10);
         const month = parseInt(match[2], 10) - 1;
         const year = parseInt(match[3], 10);
         return new Date(year, month, day).getTime();
      }
      
      // Pattern: YYYY-MM-DD
      match = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
      if (match) {
         const year = parseInt(match[1], 10);
         const month = parseInt(match[2], 10) - 1;
         const day = parseInt(match[3], 10);
         return new Date(year, month, day).getTime();
      }
      
      // Pattern: MM/YYYY
      match = str.match(/^(\d{1,2})[\/\-\.](\d{4})/);
      if (match) {
         const month = parseInt(match[1], 10) - 1;
         const year = parseInt(match[2], 10);
         return new Date(year, month, 1).getTime();
      }

      // Pattern: YYYY
      match = str.match(/^(\d{4})/);
      if (match) {
         return new Date(parseInt(match[1], 10), 0, 1).getTime();
      }

      // Fallback
      const t = new Date(str).getTime();
      return isNaN(t) ? 0 : t;
    };

    return list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'score') {
        // Hàm quy đổi điểm/hạng ra số để so sánh chính xác
        const getScoreValue = (record) => {
          if (record.sourceType === 'source2') {
             const rank = record.qRank || 'Khác';
             switch(rank) {
               case 'Q1': return 100;
               case 'Q2': return 90;
               case 'Q3': return 80;
               case 'Q4': return 70;
               default: return 60; // Khác (Quốc tế không phân hạng)
             }
          } else {
             // Điểm HĐGS thường từ 0 đến 2.5
             return Number(record.score) || 0;
          }
        };
        const valA = getScoreValue(a);
        const valB = getScoreValue(b);
        comparison = valA - valB;
      } else if (sortField === 'publishDate') {
        const timeA = parseDate(a.publishDate || a.publishYear);
        const timeB = parseDate(b.publishDate || b.publishYear);
        comparison = timeA - timeB;
      } else if (sortField === 'title') {
        comparison = String(a.title || '').localeCompare(String(b.title || ''));
      } else if (sortField === 'journal') {
        comparison = String(a.journal || '').localeCompare(String(b.journal || ''));
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [records, sortField, sortOrder]);

  // Đặt lại trang 1 nếu thay đổi dữ liệu (ví dụ: tìm kiếm, lọc)
  React.useEffect(() => {
    setCurrentPage(1);
  }, [records]);

  // Logic phân trang
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  // Xử lý đổi chiều sắp xếp
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Badge màu điểm HĐGS (Minimalist)
  const getScoreBadge = (score, display) => {
    const num = Number(score) || 0;
    const label = display || num.toString();
    return <span className="font-medium text-slate-700">{label || '0'} điểm</span>;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <div className="space-y-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded-md w-1/4"></div>
          <div className="h-10 bg-slate-100 rounded-md w-full"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-md w-full border border-slate-100"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-slate-800">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Bảng Tra cứu & Thẩm định Chi tiết
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Tổng cộng {records.length} bản ghi
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Hiển thị:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded-md px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>10 dòng</option>
            <option value={25}>25 dòng</option>
            <option value={50}>50 dòng</option>
            <option value={100}>100 dòng</option>
          </select>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm table-fixed">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-2 text-center w-[4%] truncate" title="STT">STT</th>
              <th className="py-3 px-3 w-[25%] truncate" title="Tên bài báo">
                Tên bài báo
              </th>
              <th className="py-3 px-3 w-[12%] truncate" title="Tác giả chính">Tác giả chính</th>
              <th className="py-3 px-3 w-[12%] truncate" title="Tác giả liên hệ">Tác giả liên hệ</th>
              <th className="py-3 px-3 w-[19%] truncate" title="Tạp chí / Kỷ yếu">
                Tạp chí / Kỷ yếu
              </th>
              <th
                onClick={() => handleSort('score')}
                className="py-3 px-2 cursor-pointer hover:bg-slate-100 transition-colors text-center w-[10%] truncate"
                title="Điểm / Hạng Q"
              >
                <div className="flex items-center justify-center gap-1.5 truncate">
                  <span className="truncate">Điểm / Hạng Q</span>
                  {sortField === 'score' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 shrink-0" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />}
                </div>
              </th>
              <th
                onClick={() => handleSort('publishDate')}
                className="py-3 px-2 cursor-pointer hover:bg-slate-100 transition-colors text-center w-[10%] truncate"
                title="Ngày xuất bản"
              >
                <div className="flex items-center justify-center gap-1.5 truncate">
                  <span className="truncate">Ngày xuất bản</span>
                  {sortField === 'publishDate' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 shrink-0" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />}
                </div>
              </th>
              <th className="py-3 px-2 text-center w-[8%] truncate" title="Hành động">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-slate-400" />
                    <p className="font-medium text-slate-600">Không có dữ liệu</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((item, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-2 text-center text-slate-500 truncate">
                      {globalIndex}
                    </td>

                    {/* Tên bài báo */}
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-900 text-sm line-clamp-2 break-words" title={item.title}>
                        {item.title}
                      </p>
                      <div className="flex items-center flex-wrap gap-1 mt-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                          {item.sourceType === 'source1' ? 'Trong nước' : 'Quốc tế'}
                        </span>
                        {item.qRank && (
                          <span className="text-xs text-slate-500 whitespace-nowrap">• {item.qRank}</span>
                        )}
                        {item.category && (
                          <span className="text-xs text-slate-500 whitespace-nowrap">• {item.category}</span>
                        )}
                      </div>
                    </td>

                    {/* Tác giả chính */}
                    <td className="py-3 px-3 text-slate-700 text-sm break-words" title={item.mainAuthor}>
                      {item.mainAuthor}
                    </td>

                    {/* Tác giả liên hệ */}
                    <td className="py-3 px-3 text-slate-700 text-sm break-words" title={item.correspondingAuthor || '—'}>
                      {item.correspondingAuthor || '—'}
                    </td>

                    {/* Tạp chí / Kỷ yếu */}
                    <td className="py-3 px-3">
                      <p className="line-clamp-2 text-slate-800 break-words" title={item.journal}>
                        {item.journal}
                      </p>
                      {item.issn && (
                        <span className="text-xs text-slate-500 block mt-0.5 truncate" title={`ISSN: ${item.issn}`}>
                          ISSN: {item.issn}
                        </span>
                      )}
                    </td>

                    {/* Điểm HĐGS hoặc Phân hạng Q */}
                    <td className="py-3 px-2 text-center text-slate-700 truncate">
                      {item.sourceType === 'source2' ? (
                        item.qRank ? (
                          <span>{item.qRank}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )
                      ) : (
                        getScoreBadge(item.score, item.scoreDisplay)
                      )}
                    </td>

                    {/* Ngày xuất bản */}
                    <td className="py-3 px-2 text-center text-slate-700 truncate" title={item.publishDate || (item.publishYear ? `Năm ${item.publishYear}` : '')}>
                      {item.publishDate || (item.publishYear ? `Năm ${item.publishYear}` : '—')}
                    </td>

                    {/* Nút Xem chi tiết */}
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="inline-flex items-center justify-center gap-1 text-slate-600 hover:text-blue-600 transition-colors w-full"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-medium truncate">Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
        <div className="text-sm text-slate-600">
          Hiển thị trang <span className="font-medium text-slate-900">{currentPage}</span> trên <span className="font-medium text-slate-900">{totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Trước
          </button>
          
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Tiếp
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Thẩm định Chi tiết Hồ sơ */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">
                Chi Tiết Hồ Sơ Bài Báo
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                title="Đóng modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto">
              <div className="mb-6">
                <p className="text-sm text-slate-500 mb-1">Tên bài báo</p>
                <h4 className="text-lg font-semibold text-slate-900 leading-snug">
                  {selectedRecord.title}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm mb-8">
                <div>
                  <span className="text-slate-500 block mb-1">Nguồn dữ liệu:</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecord.sourceType === 'source1' ? 'Trong nước (HĐGS)' : 'Quốc tế (Scopus/ISI)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Tác giả chính:</span>
                  <span className="font-medium text-slate-800">{selectedRecord.mainAuthor}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Tác giả liên hệ:</span>
                  <span className="font-medium text-slate-800">{selectedRecord.correspondingAuthor || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Điểm / Hạng Q:</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecord.sourceType === 'source2' 
                       ? (selectedRecord.qRank || 'Khác / Chưa rõ') 
                       : getScoreBadge(selectedRecord.score, selectedRecord.scoreDisplay)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Tạp chí / Kỷ yếu:</span>
                  <span className="font-medium text-slate-800">{selectedRecord.journal}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Ngày xuất bản:</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecord.publishDate || (selectedRecord.publishYear ? `Năm ${selectedRecord.publishYear}` : 'Chưa rõ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Tập, số, trang:</span>
                  <span className="font-medium text-slate-800">{selectedRecord.volumeIssuePage || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">ISSN:</span>
                  <span className="font-medium text-slate-800">{selectedRecord.issn || '—'}</span>
                </div>
                {selectedRecord.category && (
                  <div>
                    <span className="text-slate-500 block mb-1">Danh mục Tạp chí:</span>
                    <span className="font-medium text-slate-800">{selectedRecord.category}</span>
                  </div>
                )}
                {selectedRecord.impactFactor && (
                  <div>
                    <span className="text-slate-500 block mb-1">Impact Factor (IF):</span>
                    <span className="font-medium text-slate-800">{selectedRecord.impactFactor}</span>
                  </div>
                )}
                {selectedRecord.doi && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block mb-1">Mã DOI:</span>
                    <span className="font-medium text-slate-800 break-all">{selectedRecord.doi}</span>
                  </div>
                )}
              </div>

              {/* Danh sách đồng tác giả */}
              <div className="mb-6">
                <span className="text-sm text-slate-500 block mb-2">
                  Nhóm tác giả ({selectedRecord.authorCount} người):
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedRecord.authors && selectedRecord.authors.length > 0 ? (
                    selectedRecord.authors.map((auth, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-slate-100 text-sm text-slate-700"
                      >
                        {auth}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400 italic">Chưa cập nhật danh sách</span>
                  )}
                </div>
              </div>

              {/* Tất cả các cột từ Google Sheet gốc */}
              {selectedRecord.rawRecord && Object.keys(selectedRecord.rawRecord).length > 0 && (
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <div className="mb-4">
                    <span className="inline-block text-sm font-semibold text-white bg-emerald-500 px-3 py-1.5 rounded shadow-sm">
                      Dữ liệu thô từ Google Sheet (đã ẩn các trường trống):
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                    {Object.entries(selectedRecord.rawRecord)
                      .filter(([_, val]) => val !== null && val !== undefined && String(val).trim() !== '')
                      .map(([key, val], i) => (
                        <div key={i} className="flex flex-col bg-white p-2.5 rounded border border-slate-200">
                          <span className="text-xs text-slate-500 font-medium mb-0.5">{key}</span>
                          <span className="text-slate-800 break-words">{String(val)}</span>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto text-center sm:text-left">
                <span className="text-sm font-semibold text-slate-700">Email Tác giả:</span>
                {selectedRecord.email ? (
                  <a href={`mailto:${selectedRecord.email}`} className="text-sm font-bold text-blue-700 hover:text-blue-800 hover:underline px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-md transition-colors break-all">
                    {selectedRecord.email}
                  </a>
                ) : (
                  <span className="text-sm text-slate-500 italic px-3 py-1.5 bg-white border border-slate-200 rounded-md">Chưa có thông tin</span>
                )}
              </div>
              {selectedRecord.proofLinks && selectedRecord.proofLinks.length > 0 ? (
                <a
                  href={selectedRecord.proofLinks[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Mở Minh Chứng PDF
                </a>
              ) : (
                <span className="text-sm text-slate-400 italic">Không có minh chứng</span>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
