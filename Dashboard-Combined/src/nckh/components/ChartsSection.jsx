import React, { useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, Users, Award, BookOpen, CalendarDays } from 'lucide-react';

/**
 * ============================================================================
 * COMPONENT: ChartsSection (Refactored)
 * ============================================================================
 * 5 biểu đồ tự động thích ứng theo nguồn dữ liệu:
 *
 * ── NCKH TRONG NƯỚC (source1) ──────────────────────────────────────────────
 * 1. Bar Chart: Bài báo trong nước theo năm
 * 2. Donut: Phân bổ điểm HĐGS (0.25 / 0.5 / 0.75 / 1.0)
 * 3. Horizontal Bar: Top 10 Tạp chí trong nước đăng nhiều nhất
 * 4. Horizontal Bar: Top 10 Tác giả có nhiều bài trong nước nhất
 * 5. Grouped Bar: Bài báo trong nước theo Quý (Q1-Q4 mỗi năm)
 *
 * ── NCKH QUỐC TẾ (source2) ─────────────────────────────────────────────────
 * 1. Bar Chart: Bài báo quốc tế theo năm
 * 2. Donut: Phân bổ theo Phân hạng Q (Q1/Q2/Q3/Q4/Khác)
 * 3. Horizontal Bar: Top 10 Tạp chí quốc tế đăng nhiều nhất
 * 4. Horizontal Bar: Top 10 Tác giả có nhiều bài quốc tế nhất
 * 5. Grouped Bar: Bài báo quốc tế theo Quý (Q1-Q4 mỗi năm)
 *
 * ── TỔNG HỢP (combined) ────────────────────────────────────────────────────
 * 1. Stacked Bar: Bài báo theo năm (phân tách Trong nước / Quốc tế)
 * 2. Donut: Tỷ lệ Trong nước vs Quốc tế
 * 3. Horizontal Bar: Top 10 Tạp chí (tất cả nguồn)
 * 4. Horizontal Bar: Top 10 Tác giả (tất cả nguồn)
 * 5. Grouped Bar: Bài báo tổng hợp theo Quý
 * ============================================================================
 */

// ── Bảng màu ────────────────────────────────────────────────────────────────
const SCORE_COLORS = {
  '≥ 1.0 điểm': '#10B981',
  '0.75 điểm': '#3B82F6',
  '0.5 điểm': '#F59E0B',
  '0.25 điểm': '#94A3B8',
  'Khác/0đ': '#64748B',
};
const QRANK_COLORS = {
  'Q1': '#10B981',
  'Q2': '#3B82F6',
  'Q3': '#F59E0B',
  'Q4': '#94A3B8',
  'Khác': '#64748B',
};
const SOURCE_COLORS = {
  'Trong nước (HĐGS)': '#3B82F6',
  'Quốc tế (Scopus/ISI)': '#8B5CF6',
};
const QUARTER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
const TOP_JOURNAL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#EC4899', '#6366F1', '#84CC16', '#F97316'];
const TOP_AUTHOR_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#14B8A6', '#EC4899', '#6366F1', '#84CC16', '#F97316'];

// ── Tooltip styles ──────────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  borderColor: '#E2E8F0',
  borderRadius: '8px',
  color: '#0F172A',
  fontSize: '12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

// ── Helper: Trích quý từ ngày (chuỗi bất kỳ) ────────────────────────────────
function extractQuarter(record) {
  // Ưu tiên publishDate (full date), fallback publishYear
  const dateStr = String(record.publishDate || '');
  const yearStr = String(record.publishYear || '');

  let month = null;
  let year = null;

  // 1. Tìm năm 4 chữ số hợp lệ
  const yrMatch = (dateStr || yearStr).match(/\b(20\d{2}|19\d{2})\b/);
  if (yrMatch) {
    year = yrMatch[1];
  }

  if (!year || year === 'Chưa rõ' || year === 'Khác') {
    return { quarter: null, year: null };
  }

  // 2. Trích xuất tháng từ các format ngày

  // 2a. Format ISO: YYYY-MM-DD
  if (!month) {
    const isoMatch = dateStr.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (isoMatch) {
      month = parseInt(isoMatch[2], 10);
    }
  }

  // 2b. Format DD/MM/YYYY hoặc MM/DD/YYYY
  if (!month) {
    const dateParts = dateStr.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/);
    if (dateParts) {
      const p1 = parseInt(dateParts[1], 10);
      const p2 = parseInt(dateParts[2], 10);
      // Nếu p2 > 12 thì chắc chắn p2 là ngày, p1 là tháng (ví dụ 05/25/2024 -> MM/DD/YYYY)
      // Nếu không, ưu tiên DD/MM/YYYY của Việt Nam -> p2 là tháng
      if (p2 > 12 && p1 <= 12) {
        month = p1;
      } else if (p2 <= 12) {
        month = p2;
      }
    }
  }

  // 2c. Format MM/YYYY
  if (!month) {
    const mmYyMatch = dateStr.match(/\b(\d{1,2})[/.\-](\d{4})\b/);
    if (mmYyMatch) {
      month = parseInt(mmYyMatch[1], 10);
    }
  }

  // 2d. Tìm keyword "tháng X" hoặc "Tháng X"
  if (!month) {
    const thangMatch = dateStr.match(/[Tt]háng\s*(\d{1,2})/i);
    if (thangMatch) {
      month = parseInt(thangMatch[1], 10);
    }
  }

  // (Đã loại bỏ fallback sang timestamp vì timestamp là ngày NHẬP form, không phải ngày XUẤT BẢN.
  // Lấy timestamp sẽ làm số liệu quý bị sai).

  if (!month || month < 1 || month > 12) {
    return { quarter: null, year };
  }

  const q = Math.ceil(month / 3);
  return { quarter: `Q${q}`, year };
}

// ── Helper: Danh mục Scopus/ISI từ sheet quốc tế ─────────────────────────────
function extractCategory(record) {
  const cat = String(record.category || '').toLowerCase();
  if (cat.includes('scopus') && cat.includes('isi')) return 'Scopus & ISI';
  if (cat.includes('scopus') && cat.includes('web of science')) return 'Scopus & ISI';
  if (cat.includes('isi') || cat.includes('web of science')) return 'ISI/WoS';
  if (cat.includes('scopus')) return 'Scopus';
  if (cat.includes('khác') || cat) return cat.charAt(0).toUpperCase() + cat.slice(1) || 'Khác';
  return 'Khác';
}

// ── Không có dữ liệu placeholder ───────────────────────────────────────────
const EmptyChart = ({ message = 'Không có dữ liệu' }) => (
  <div className="h-full flex items-center justify-center text-xs text-slate-500">
    {message}
  </div>
);

// ── Custom donut center label ───────────────────────────────────────────────
const DonutCenterLabel = ({ total, label }) => (
  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
    <tspan x="50%" dy="-0.3em" fontSize="18" fontWeight="800" fill="#0F172A">
      {total}
    </tspan>
    <tspan x="50%" dy="1.4em" fontSize="10" fill="#94A3B8">
      {label}
    </tspan>
  </text>
);

export const ChartsSection = ({ records = [], activeTab = 'source1' }) => {
  const isSource1 = activeTab === 'source1';
  const isSource2 = activeTab === 'source2';
  const isCombined = activeTab === 'combined';

  // ════════════════════════════════════════════════════════════════════════════
  // BIỂU ĐỒ 1: Bài báo theo Năm
  // ════════════════════════════════════════════════════════════════════════════
  const yearData = useMemo(() => {
    const counts = {};
    records.forEach((r) => {
      const yr = String(r.publishYear || 'Chưa rõ').trim();
      const validYear = (yr.length === 4 && (yr.startsWith('20') || yr.startsWith('19'))) ? yr : null;
      if (!validYear) return; // Bỏ qua năm không hợp lệ
      if (!counts[validYear]) {
        counts[validYear] = { total: 0, domestic: 0, international: 0 };
      }
      counts[validYear].total++;
      if (r.sourceType === 'source2') {
        counts[validYear].international++;
      } else {
        counts[validYear].domestic++;
      }
    });

    return Object.keys(counts)
      .sort()
      .map((yr) => ({
        year: yr,
        count: counts[yr].total,
        domestic: counts[yr].domestic,
        international: counts[yr].international,
      }));
  }, [records]);

  // ════════════════════════════════════════════════════════════════════════════
  // BIỂU ĐỒ 2: Phân bổ chất lượng
  //   - Source1: Điểm HĐGS (0.25 / 0.5 / 0.75 / 1.0 / Khác)
  //   - Source2: Phân hạng Q (Q1 / Q2 / Q3 / Q4 / Khác)
  //   - Combined: Tỷ lệ Trong nước vs Quốc tế
  // ════════════════════════════════════════════════════════════════════════════
  const chart2Data = useMemo(() => {
    if (isSource2) {
      // ── Phân hạng Q ──
      const counts = { 'Q1': 0, 'Q2': 0, 'Q3': 0, 'Q4': 0, 'Khác': 0 };
      records.forEach((r) => {
        const q = String(r.qRank || '').toUpperCase().trim();
        if (q.includes('Q1')) counts['Q1']++;
        else if (q.includes('Q2')) counts['Q2']++;
        else if (q.includes('Q3')) counts['Q3']++;
        else if (q.includes('Q4')) counts['Q4']++;
        else counts['Khác']++;
      });
      return Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name: `Hạng ${name}`,
          value,
          percentage: records.length > 0 ? ((value / records.length) * 100).toFixed(1) : '0',
          color: QRANK_COLORS[name] || '#64748B',
        }));
    }

    if (isCombined) {
      // ── Tỷ lệ Trong nước vs Quốc tế ──
      const domestic = records.filter((r) => r.sourceType === 'source1').length;
      const international = records.filter((r) => r.sourceType === 'source2').length;
      return [
        { name: 'Trong nước (HĐGS)', value: domestic, percentage: records.length > 0 ? ((domestic / records.length) * 100).toFixed(1) : '0', color: SOURCE_COLORS['Trong nước (HĐGS)'] },
        { name: 'Quốc tế (Scopus/ISI)', value: international, percentage: records.length > 0 ? ((international / records.length) * 100).toFixed(1) : '0', color: SOURCE_COLORS['Quốc tế (Scopus/ISI)'] },
      ].filter((item) => item.value > 0);
    }

    // ── Điểm HĐGS (Source1 - Trong nước) ──
    const counts = {
      '≥ 1.0 điểm': 0,
      '0.75 điểm': 0,
      '0.5 điểm': 0,
      '0.25 điểm': 0,
      'Khác/0đ': 0,
    };
    records.forEach((r) => {
      const s = Number(r.score) || 0;
      if (s >= 1) counts['≥ 1.0 điểm']++;
      else if (s >= 0.75) counts['0.75 điểm']++;
      else if (s >= 0.5) counts['0.5 điểm']++;
      else if (s >= 0.25) counts['0.25 điểm']++;
      else counts['Khác/0đ']++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: records.length > 0 ? ((value / records.length) * 100).toFixed(1) : '0',
        color: SCORE_COLORS[name] || '#64748B',
      }));
  }, [records, isSource2, isCombined]);

  const chart2Title = isSource2
    ? 'Phân bổ Phân hạng Q (Scopus/ISI)'
    : isCombined
      ? 'Tỷ lệ Trong nước vs Quốc tế'
      : 'Phân bổ Điểm HĐGS trong nước';

  const chart2CenterLabel = isSource2 ? 'bài quốc tế' : isCombined ? 'tổng bài' : 'bài trong nước';

  // ════════════════════════════════════════════════════════════════════════════
  // BIỂU ĐỒ 3: Top 10 Tạp chí đăng nhiều nhất
  // ════════════════════════════════════════════════════════════════════════════
  const topJournalsData = useMemo(() => {
    const counts = {};
    records.forEach((r) => {
      const j = r.journal || 'Chưa phân loại';
      if (j === 'Chưa phân loại' || j === '—') return;
      counts[j] = (counts[j] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [records]);

  // ════════════════════════════════════════════════════════════════════════════
  // BIỂU ĐỒ 4: Top 10 Cán bộ trường có nhiều bài báo nhất
  // ════════════════════════════════════════════════════════════════════════════
  const topAuthorsData = useMemo(() => {
    const counts = {};
    records.forEach((r) => {
      let authorList = [];
      if (r.sourceType === 'source1') {
        // NCKH Trong nước: Dùng cột "Nhóm tác giả" (tập cha)
        authorList = Array.isArray(r.authors) && r.authors.length > 0 ? r.authors : [];
        if (authorList.length === 0) {
          const fallback = (r.mainAuthor && r.mainAuthor !== '—') ? r.mainAuthor : r.correspondingAuthor;
          if (fallback && fallback !== 'Chưa cập nhật') authorList = [fallback];
        }
      } else {
        // NCKH Quốc tế: CHỈ dùng cột "Tác giả là cán bộ trường" (tập con). 
        // Dù người nhập liệu quên không nhập cột này, cũng tuyệt đối không lấy cột Nhóm tác giả tiếng Anh bù vào.
        authorList = Array.isArray(r.ctumpAuthors) && r.ctumpAuthors.length > 0 ? r.ctumpAuthors : [];
      }

      if (authorList.length > 0) {
        authorList.forEach((name) => {
          const cleanName = String(name || '').trim();
          if (cleanName && cleanName.length > 2 && cleanName !== 'Chưa cập nhật' && !cleanName.includes('...')) {
            counts[cleanName] = (counts[cleanName] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [records]);

  // ════════════════════════════════════════════════════════════════════════════
  // BIỂU ĐỒ 5: Bài báo theo QUÝ (1 năm = 4 quý: Q1 T1-3, Q2 T4-6, Q3 T7-9, Q4 T10-12)
  // ════════════════════════════════════════════════════════════════════════════
  const quarterlyData = useMemo(() => {
    const yearQuarterMap = {};

    records.forEach((r) => {
      const { quarter, year } = extractQuarter(r);
      if (!year || !quarter) return;

      if (!yearQuarterMap[year]) {
        yearQuarterMap[year] = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
      }
      yearQuarterMap[year][quarter]++;
    });

    return Object.keys(yearQuarterMap)
      .sort()
      .map((yr) => ({
        year: yr,
        'Quý 1 (T1-T3)': yearQuarterMap[yr].Q1,
        'Quý 2 (T4-T6)': yearQuarterMap[yr].Q2,
        'Quý 3 (T7-T9)': yearQuarterMap[yr].Q3,
        'Quý 4 (T10-T12)': yearQuarterMap[yr].Q4,
        total: yearQuarterMap[yr].Q1 + yearQuarterMap[yr].Q2 + yearQuarterMap[yr].Q3 + yearQuarterMap[yr].Q4,
      }));
  }, [records]);

  // ── Tên hiển thị cho biểu đồ ──
  const sourceLabel = isSource2 ? 'quốc tế' : isSource1 ? 'trong nước' : 'tổng hợp';

  // ── Custom Tooltip cho Biểu đồ Năm ──
  const renderYearTooltip = useCallback(
    ({ active, payload, label }) => {
      if (!active || !payload || !payload.length) return null;
      const row = payload[0]?.payload || {};

      if (isCombined) {
        const intl = row.international || 0;
        const dom = row.domestic || 0;
        const total = row.count ?? intl + dom;

        return (
          <div style={tooltipStyle} className="p-2.5 border border-slate-200">
            <p className="font-semibold text-slate-800 mb-1">{label}</p>
            <div className="space-y-1 text-xs">
              <div style={{ color: '#8B5CF6' }}>Quốc tế : {intl} bài</div>
              <div style={{ color: '#3B82F6' }}>Trong nước : {dom} bài</div>
              <div className="border-t border-slate-100 pt-1 mt-1 font-semibold text-slate-800">
                Tổng cộng : {total} bài
              </div>
            </div>
          </div>
        );
      }

      const name = isSource2 ? 'Quốc tế' : isSource1 ? 'Trong nước' : 'Số bài';
      const color = isSource2 ? '#8B5CF6' : '#3B82F6';
      return (
        <div style={tooltipStyle} className="p-2.5 border border-slate-200">
          <p className="font-semibold text-slate-800 mb-1">{label}</p>
          <div className="text-xs font-medium" style={{ color }}>
            {name} : {row.count || 0} bài
          </div>
        </div>
      );
    },
    [isCombined, isSource1, isSource2]
  );

  return (
    <div className="space-y-6 mb-6">
      {/* ========================================================================= */}
      {/* HÀNG 1: 3 Biểu đồ chính (Year | Quality | Top Journals) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Biểu đồ 1: Bài báo theo Năm ─────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shadow-sm shadow-blue-500/50"></span>
            {isSource2 ? 'Bài báo quốc tế theo năm' : isSource1 ? 'Bài báo trong nước theo năm' : 'Bài báo công bố theo năm'}
          </h4>
          <div className="h-64 w-full">
            {yearData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.4} vertical={false} />
                  <XAxis dataKey="year" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(226, 232, 240, 0.6)' }}
                    content={renderYearTooltip}
                  />
                  {isCombined ? (
                    <>
                      <Legend formatter={(value) => <span className="text-[11px] text-slate-600">{value}</span>} />
                      <Bar dataKey="domestic" name="Trong nước (HĐGS)" fill="#3B82F6" stackId="yearStack" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="international" name="Quốc tế (Scopus/ISI)" fill="#8B5CF6" stackId="yearStack" radius={[4, 4, 0, 0]} />
                    </>
                  ) : (
                    <Bar dataKey="count" name="Số bài" fill={isSource2 ? '#8B5CF6' : '#3B82F6'} radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Biểu đồ 2: Phân bổ chất lượng ──────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            {chart2Title}
          </h4>
          <div className="h-64 w-full">
            {chart2Data.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chart2Data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {chart2Data.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color || '#64748B'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, item) => [`${val} bài (${item.payload.percentage}%)`, name]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                  />
                  {/* Center label */}
                  <DonutCenterLabel total={records.length} label={chart2CenterLabel} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Biểu đồ 3: Top 10 Tạp chí ──────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shadow-sm shadow-amber-500/50"></span>
            {isSource2 ? 'Top 10 Tạp chí quốc tế' : isSource1 ? 'Top 10 Tạp chí trong nước' : 'Top 10 Tạp chí đăng nhiều nhất'}
          </h4>
          <div className="h-64 w-full">
            {topJournalsData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topJournalsData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                  <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748B"
                    fontSize={10}
                    tickLine={false}
                    width={110}
                    tickFormatter={(val) => (val.length > 16 ? `${val.slice(0, 16)}...` : val)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(226, 232, 240, 0.6)' }}
                    formatter={(val, name, item) => [`${val} bài báo`, item.payload.name]}
                  />
                  <Bar dataKey="count" name="Số bài" radius={[0, 4, 4, 0]}>
                    {topJournalsData.map((_, index) => (
                      <Cell key={`cell-journal-${index}`} fill={TOP_JOURNAL_COLORS[index % TOP_JOURNAL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HÀNG 2: 2 Biểu đồ (Top Tác giả | Biểu đồ theo Quý) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Biểu đồ 4: Top 10 Tác giả ─────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 shadow-sm shadow-violet-500/50"></span>
            {isSource2 ? 'Top 10 Cán bộ trường NCKH quốc tế' : isSource1 ? 'Top 10 Cán bộ trường NCKH trong nước' : 'Top 10 Cán bộ trường có nhiều bài báo nhất'}
          </h4>

          <div className="h-72 w-full">
            {topAuthorsData.length === 0 ? (
              <EmptyChart message="Không có dữ liệu tác giả" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topAuthorsData} margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
                  <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    width={130}
                    tickFormatter={(val) => (val.length > 17 ? `${val.slice(0, 17)}...` : val)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(226, 232, 240, 0.6)' }}
                    formatter={(val, name, item) => [
                      `${val} công trình / bài báo`,
                      `Tác giả: ${item.payload.name}`,
                    ]}
                  />
                  <Bar dataKey="count" name="Số bài báo" radius={[0, 4, 4, 0]}>
                    {topAuthorsData.map((_, index) => (
                      <Cell key={`cell-author-${index}`} fill={TOP_AUTHOR_COLORS[index % TOP_AUTHOR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Biểu đồ 5: Phân bổ bài báo theo QUÝ ──────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 shadow-sm shadow-teal-500/50"></span>
            {isSource2 ? 'Bài báo quốc tế theo Quý' : isSource1 ? 'Bài báo trong nước theo Quý' : 'Bài báo tổng hợp theo Quý'}
          </h4>

          <div className="h-72 w-full">
            {quarterlyData.length === 0 ? (
              <EmptyChart message="Không đủ dữ liệu ngày tháng để phân quý" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.4} vertical={false} />
                  <XAxis dataKey="year" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val, name, item) => [
                      `${val} bài báo`,
                      name,
                    ]}
                    labelFormatter={(label) => `Năm ${label}`}
                  />
                  <Legend
                    formatter={(value) => <span className="text-[11px] text-slate-600">{value}</span>}
                    iconType="square"
                    iconSize={10}
                  />
                  <Bar dataKey="Quý 1 (T1-T3)" name="Quý 1 (T1-T3)" fill={QUARTER_COLORS[0]} stackId="quarter" />
                  <Bar dataKey="Quý 2 (T4-T6)" name="Quý 2 (T4-T6)" fill={QUARTER_COLORS[1]} stackId="quarter" />
                  <Bar dataKey="Quý 3 (T7-T9)" name="Quý 3 (T7-T9)" fill={QUARTER_COLORS[2]} stackId="quarter" />
                  <Bar dataKey="Quý 4 (T10-T12)" name="Quý 4 (T10-T12)" fill={QUARTER_COLORS[3]} stackId="quarter" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>


        </div>
      </div>
    </div>
  );
};
