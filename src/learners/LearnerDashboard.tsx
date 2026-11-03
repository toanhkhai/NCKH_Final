import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import Papa from 'papaparse';
import { Download, X } from 'lucide-react';
import { Navbar } from '../components/common/Navbar';
import { getLearnerTotals, getLearnerSupervisors, getLearnerGroupSizes, loadLearnerData, searchText, countLearnerFlags, sumKnown, learnerChartGroups, type LearnerData, type LearnerProject, type LearnerView } from './data';
import './learners.css';

const titles: Record<LearnerView, string> = {
  overview: 'Tổng quan đề tài người học', projects: 'Danh mục đề tài người học', people: 'Người học & cán bộ hướng dẫn',
  progress: 'Tiến độ & nghiệm thu', outputs: 'Kinh phí & sản phẩm nghiên cứu', quality: 'Chất lượng dữ liệu',
};
const fmt = (n: number | null) => n === null ? 'Chưa cập nhật' : n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const group = (items: string[]) => Object.entries(items.reduce<Record<string, number>>((out, value) => {
  const key = value || 'Chưa cập nhật'; out[key] = (out[key] || 0) + 1; return out;
}, {})).sort((a, b) => b[1] - a[1]);

function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <div className="learner-metric glass-card"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}
function Bars({ title, values, showAll = false, note, labelWidth = 140, minHeight = 260, wrapLabels = false }: {
  title: string; values: [string, number][]; showAll?: boolean; note?: string; labelWidth?: number; minHeight?: number; wrapLabels?: boolean;
}) {
  const plotted = learnerChartGroups(values, showAll);
  return <section className="glass-card learner-card"><h3>{title}</h3>{note && <p className="learner-note">{note}</p>}{values.length ? <ReactECharts style={{ height: Math.max(minHeight, plotted.length * (wrapLabels ? 40 : 36)) }} option={{
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 10, right: 35, top: 20, bottom: 20, containLabel: true },
    xAxis: { type: 'value', minInterval: 1 }, yAxis: { type: 'category', data: plotted.map(([label]) => label).reverse(), axisLabel: { width: labelWidth, overflow: wrapLabels ? 'break' : 'truncate', lineHeight: 16 } },
    series: [{ type: 'bar', data: plotted.map(([, value]) => value).reverse(), itemStyle: { color: '#0284c7', borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right' } }],
  }} /> : <p className="learner-note">Không có dữ liệu phù hợp bộ lọc.</p>}</section>;
}

function Detail({ project, onClose }: { project: LearnerProject; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const modal = dialog.current; modal?.showModal(); return () => modal?.close(); }, []);
  return <dialog className="learner-dialog" ref={dialog} onCancel={onClose}>
    <header><h2>{project.code || 'Chi tiết đề tài'}</h2><button type="button" onClick={onClose} aria-label="Đóng chi tiết"><X size={20} /></button></header>
    <p className="learner-detail-title">{project.title}</p>
    <dl>{Object.entries(project.raw).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{/^https?:\/\//i.test(value) ? <a href={value} target="_blank" rel="noreferrer">Mở minh chứng</a> : value || 'Chưa cập nhật'}</dd></div>)}</dl>
  </dialog>;
}

export default function LearnerDashboard({ view, onLogin }: { view: LearnerView; onLogin: () => void }) {
  const [data, setData] = useState<LearnerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ year: '', unit: '', className: '', cohort: '', status: '', search: '' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LearnerProject | null>(null);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true; setLoading(true); setError('');
    try { setData(await loadLearnerData()); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); inFlight.current = false; }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { setPage(1); }, [filters, data]);
  const all = data?.projects ?? [];
  const filtered = useMemo(() => all.filter((p) => {
    const text = searchText(filters.search);
    return (!filters.year || p.year === filters.year) && (!filters.unit || p.unit === filters.unit)
      && (!filters.className || p.className === filters.className) && (!filters.cohort || p.cohort === filters.cohort)
      && (!filters.status || p.status === filters.status)
      && (!text || searchText([p.title, p.code, p.leader, p.studentId, ...p.supervisors.map((s) => s.name), ...p.members.map((m) => m.name)].join(' ')).includes(text));
  }), [all, filters]);
  const options = (field: 'year' | 'unit' | 'className' | 'cohort' | 'status') => [...new Set([
    ...all.map((p) => p[field]).filter(Boolean),
    ...(field === 'year' ? (data?.summary ?? []).map((row) => row.period).filter((period) => /^\d{4}$/.test(period)) : []),
  ])].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  const change = (field: keyof typeof filters, value: string) => setFilters((old) => ({ ...old, [field]: value }));
  const accepted = countLearnerFlags(filtered, 'accepted') === null ? null : filtered.filter((p) => p.status === 'Đã nghiệm thu').length;
  const overdue = filtered.length && filtered.every((p) => p.status === 'Chưa đủ dữ liệu tiến độ') ? null : filtered.filter((p) => p.status === 'Quá hạn dự kiến').length;
  const totals = data ? getLearnerTotals(data, filters.year) : null;
  const supervisors = useMemo(() => getLearnerSupervisors(filtered), [filtered]);
  const groupSizes = useMemo(() => getLearnerGroupSizes(filtered), [filtered]);
  const topSupervisors: [string, number][] = supervisors.slice(0, 10).map((supervisor) => [supervisor.name, supervisor.count]);

  const exportCsv = () => {
    const rows = filtered.map((p) => ({ 'Năm nhóm nguồn': p.year, 'Trạng thái phân tích': p.status, ...p.raw }));
    const blob = new Blob(['\uFEFF' + Papa.unparse(rows, { escapeFormulae: true })], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `De_tai_nguoi_hoc_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const renderTable = (projects: LearnerProject[]) => <div className="learner-table-wrap"><table className="learner-table"><thead><tr>
    <th>Đề tài / Mã số</th><th>Chủ nhiệm</th><th>Lớp / Khóa</th><th>Đơn vị</th><th>Năm giao</th><th>Trạng thái</th><th>Kinh phí (tr.đ)</th>
  </tr></thead><tbody>{projects.map((p) => <tr key={p.id}>
    <td><button type="button" className="learner-title-link" onClick={() => setSelected(p)}>{p.title}</button><small>{p.code || 'Chưa có mã số'}</small></td>
    <td>{p.leader || 'Chưa cập nhật'}<small>{p.studentId || 'Chưa có MSSV/MSHV'}</small></td>
    <td>{p.className || '—'} / {p.cohort || '—'}</td><td>{p.unit}</td><td>{p.year}</td><td>{p.status}</td><td>{fmt(p.budget)}</td>
  </tr>)}</tbody></table>{projects.length === 0 && <p className="learner-note">Không có hồ sơ phù hợp bộ lọc.</p>}</div>;

  return <main className="view-container learner-dashboard">
    <Navbar onLogin={onLogin} title="ĐỀ TÀI NGƯỜI HỌC" />
    <div className="learner-heading"><div><p>Đề tài KHCN / Đề tài người học</p><h2>{titles[view]}</h2></div></div>
    {(error || data?.errors.length) ? <div role="alert" className="data-load-alert"><span>{data ? 'Một phần dữ liệu chưa tải được.' : 'Không thể tải dữ liệu.'}</span><button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>Thử lại</button></div> : null}
    {loading && !data && <p className="learner-empty" role="status">Đang tải dữ liệu…</p>}
    {data && <>
      {view === 'overview' && totals && <>
        <div className="learner-metrics learner-totals" title="Thống kê theo năm giao">
          <Metric label="Tổng số đề tài" value={fmt(totals.official)} note={totals.period || undefined} />
          <Metric label="Đã có hồ sơ chi tiết" value={fmt(totals.detailed)} />
          <Metric label="Chưa có hồ sơ chi tiết" value={fmt(totals.missing)} />
        </div>
      </>}
      <div className="learner-filters glass-card">
        <label className="learner-search">Tìm kiếm<input placeholder="Tên đề tài, mã số, người học, cán bộ hướng dẫn…" value={filters.search} onChange={(e) => change('search', e.target.value)} /></label>
        {([['year', 'Năm giao'], ['unit', 'Đơn vị quản lý'], ['className', 'Lớp'], ['cohort', 'Khóa'], ['status', 'Trạng thái']] as const).map(([field, label]) => <label key={field}>{label}<select aria-label={label} value={filters[field]} onChange={(e) => change(field, e.target.value)}><option value="">Tất cả</option>{options(field).map((v) => <option key={v}>{v}</option>)}</select></label>)}
        <button type="button" className="btn-secondary" onClick={() => setFilters({ year: '', unit: '', className: '', cohort: '', status: '', search: '' })}>Đặt lại</button>
        <span className="learner-filter-count">{filtered.length} / {all.length} hồ sơ chi tiết</span>
      </div>
      {data.projects !== null && <>
        {view === 'overview' && <>
          <div className="learner-metrics">
            <Metric label="Hồ sơ theo bộ lọc" value={filtered.length} />
            <Metric label="Đã nghiệm thu" value={fmt(accepted)} />
            <Metric label="Kinh phí (triệu đồng)" value={fmt(sumKnown(filtered.map((p) => p.budget)))} />
            <Metric label="Bài báo" value={fmt(sumKnown(filtered.map((p) => p.publications)))} />
          </div>
          <div className="learner-grid"><Bars title="Đề tài theo đơn vị quản lý" values={group(filtered.map((p) => p.unit))} /><Bars title="Đề tài theo năm giao" showAll values={group(filtered.map((p) => p.year)).sort((a, b) => a[0].localeCompare(b[0]))} /></div>
        </>}
        {view === 'projects' && <section className="glass-card learner-card">
          <div className="learner-heading"><h3>{filtered.length} hồ sơ chi tiết theo bộ lọc</h3><button type="button" className="btn-secondary" disabled={!filtered.length} onClick={exportCsv}><Download size={15} /> Xuất CSV theo bộ lọc</button></div>
          {renderTable(filtered.slice((page - 1) * 20, page * 20))}
          <div className="learner-pagination"><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page} / {Math.max(1, Math.ceil(filtered.length / 20))}</span><button className="btn-secondary" disabled={page * 20 >= filtered.length} onClick={() => setPage(page + 1)}>Sau</button></div>
        </section>}
        {view === 'people' && <>
          <div className="learner-metrics"><Metric label="Lượt chủ nhiệm" value={filtered.filter((p) => p.leader).length} /><Metric label="Lượt thành viên" value={filtered.reduce((n, p) => n + p.members.length, 0)} /><Metric label="Cán bộ hướng dẫn" value={supervisors.length} /><Metric label="Chủ nhiệm có MSSV/MSHV" value={filtered.filter((p) => p.studentId).length} /></div>
          <div className="learner-grid">
            <Bars title="Quy mô nhóm người học" values={groupSizes} showAll minHeight={400} labelWidth={170} note="Số đề tài theo quy mô nhóm đã khai báo, gồm chủ nhiệm và thành viên người học." />
            <Bars title="10 cán bộ hướng dẫn nhiều đề tài nhất" values={topSupervisors} showAll minHeight={400} labelWidth={190} wrapLabels note="Phân bố số đề tài theo cán bộ hướng dẫn trong phạm vi bộ lọc. Mỗi cán bộ được tính một lần trong một đề tài." />
          </div>
          <section className="glass-card learner-card"><h3>Phân công hướng dẫn</h3><div className="learner-table-wrap"><table className="learner-table"><thead><tr><th>Cán bộ hướng dẫn</th><th>Đơn vị</th><th>Số đề tài</th></tr></thead><tbody>{supervisors.map((s) => <tr key={s.key}><td>{s.name}</td><td>{s.unit || 'Chưa cập nhật'}</td><td>{s.count}</td></tr>)}</tbody></table></div></section>
        </>}
        {view === 'progress' && <>
          <div className="learner-metrics"><Metric label="Đã nghiệm thu" value={fmt(accepted)} /><Metric label="Đề tài có gia hạn" value={fmt(countLearnerFlags(filtered, 'extended'))} /><Metric label="Đã hủy" value={fmt(countLearnerFlags(filtered, 'cancelled'))} /><Metric label="Quá hạn dự kiến" value={fmt(overdue)} /></div>
          <div className="learner-grid"><Bars title="Trạng thái tiến độ" values={group(filtered.map((p) => p.status))} /><Bars title="Xếp loại các đề tài đã nghiệm thu" values={group(filtered.filter((p) => p.status === 'Đã nghiệm thu').map((p) => p.grade))} /></div>
          <section className="glass-card learner-card"><h3>Hồ sơ cần theo dõi</h3>{renderTable(filtered.filter((p) => p.status === 'Chưa đủ dữ liệu tiến độ' || p.status === 'Quá hạn dự kiến').slice(0, 20))}</section>
        </>}
        {view === 'outputs' && <>
          <div className="learner-metrics"><Metric label="Kinh phí (triệu đồng)" value={fmt(sumKnown(filtered.map((p) => p.budget)))} /><Metric label="Đã thanh lý" value={fmt(countLearnerFlags(filtered, 'liquidated'))} /><Metric label="Tổng bài báo" value={fmt(sumKnown(filtered.map((p) => p.publications)))} /><Metric label="Bài báo quốc tế uy tín" value={fmt(sumKnown(filtered.map((p) => p.internationalPublications)))} /></div>
          <section className="glass-card learner-card"><h3>Tài trợ & hợp tác</h3><div className="learner-table-wrap"><table className="learner-table"><thead><tr><th>Hình thức</th><th>Có</th><th>Không</th><th>Chưa cập nhật</th></tr></thead><tbody>{([['sponsored', 'Đơn vị tài trợ'], ['enterprise', 'Doanh nghiệp / CSYT'], ['international', 'Hợp tác quốc tế']] as const).map(([key, label]) => <tr key={key}><td>{label}</td><td>{filtered.filter((p) => p[key] === true).length}</td><td>{filtered.filter((p) => p[key] === false).length}</td><td>{filtered.filter((p) => p[key] === null).length}</td></tr>)}</tbody></table></div></section>
          <section className="glass-card learner-card"><h3>Hồ sơ có kinh phí hoặc sản phẩm</h3>{renderTable(filtered.filter((p) => p.budget !== null || p.publications !== null).slice(0, 20))}</section>
        </>}
        {view === 'quality' && <>
          <div className="learner-metrics"><Metric label="Hồ sơ cần bổ sung" value={filtered.filter((p) => p.issues.length).length} /><Metric label="Hồ sơ chưa có tên đề tài" value={data.blankRows} /><Metric label="Tổng số đề tài trong danh mục" value={fmt(data.declaredDetailTotal)} /><Metric label="Hồ sơ đã có tên đề tài" value={all.length} /></div>
          <Bars title="Các trường cần bổ sung / kiểm tra" values={group(filtered.flatMap((p) => p.issues))} />
          <section className="glass-card learner-card"><h3>Hồ sơ cần hoàn thiện</h3><div className="learner-table-wrap"><table className="learner-table"><thead><tr><th>Đề tài</th><th>Cảnh báo</th></tr></thead><tbody>{filtered.filter((p) => p.issues.length).slice(0, 50).map((p) => <tr key={p.id}><td><button type="button" className="learner-title-link" onClick={() => setSelected(p)}>{p.code || p.title}</button></td><td>{p.issues.join('; ')}</td></tr>)}</tbody></table></div><p className="learner-note">Hiển thị tối đa 50 hồ sơ; dùng bộ lọc để thu hẹp.</p></section>
        </>}
      </>}
      {(view === 'overview' || view === 'quality' || data.projects === null) && <section className="glass-card learner-card">
        <h3 title="Thống kê theo năm giao">Tổng hợp theo kỳ</h3>
        {data.summary ? <div className="learner-table-wrap"><table className="learner-table"><thead><tr><th>Kỳ</th><th>Tổng chính thức</th><th>Đã có chi tiết</th><th>Chưa có chi tiết</th><th>NT theo năm giao</th><th>NT theo năm thống kê</th><th>Gia hạn</th><th>Kinh phí (tr.đ)</th><th>Thanh lý</th></tr></thead><tbody>{data.summary.filter((s) => !filters.year || s.period === filters.year).map((s) => {
          const coverage = getLearnerTotals(data, s.period);
          return <tr key={s.period}><td>{s.period}</td><td>{fmt(coverage.official)}</td><td>{fmt(coverage.detailed)}</td><td className={coverage.missing || coverage.excess ? 'learner-discrepancy' : ''}>{coverage.excess ? `Vượt ${fmt(coverage.excess)}` : fmt(coverage.missing)}</td><td>{fmt(s.acceptedByAssigned)}</td><td>{fmt(s.acceptedByStats)}</td><td>{fmt(s.extended)}</td><td>{fmt(s.budget)}</td><td>{fmt(s.liquidated)}</td></tr>;
        })}</tbody></table></div> : <p>Chưa có dữ liệu thống kê.</p>}
      </section>}
    </>}
    {selected && <Detail project={selected} onClose={() => setSelected(null)} />}
  </main>;
}
