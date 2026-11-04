import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUnitYearHeatmap, buildUnitYearBars, heatmapTone } from '../src/services/unitHeatmap.ts';
import { filterProjects, DEFAULT_PROJECT_FILTERS } from '../src/services/projectTable.ts';

const project = (unit, year, patch = {}) => ({ assigningUnit: unit, assignmentYear: year, startYear: year, members: [], ...patch });
const count = (model, unit, year) => model.cells.find(([x, y]) => model.units[y] === unit && model.years[x] === year)?.[2];

test('unit bars preserve nine columns, dynamic assignment years and every record outside the nine units', () => {
  const records = [
    project('Khoa Y', 2026, { startYear: 2024 }), project('Khoa Y', undefined), project('Khoa Dược', 2034),
    project('Chưa xác định đơn vị', 2026), project('Đơn vị ngoài trường', 2034),
  ];
  const result = buildUnitYearBars(records);
  assert.equal(result.units.length, 9);
  assert.deepEqual(result.series.map(({ year }) => year), [2026, 2034, null]);
  assert.equal(result.series[0].values[result.units.indexOf('Khoa Y')], 1);
  assert.equal(result.series[1].values[result.units.indexOf('Khoa Dược')], 1);
  assert.equal(result.series[2].values[result.units.indexOf('Khoa Y')], 1);
  assert.ok(result.series.every(({ values }) => values.length === 9));
  assert.equal(result.shownTotal, 3);
  assert.equal(result.shownTotal + result.otherUnits.reduce((sum, { count }) => sum + count, 0), records.length);
  assert.deepEqual(result.otherUnits, [{ unit: 'Chưa xác định đơn vị', count: 1 }, { unit: 'Đơn vị ngoài trường', count: 1 }]);
  const filtered = buildUnitYearBars(filterProjects(records, { ...DEFAULT_PROJECT_FILTERS, unit: 'Khoa Y', year: 2026 }));
  assert.equal(filtered.total, 1);
  assert.equal(filtered.shownTotal, 1);
  assert.deepEqual(filtered.otherUnits, []);
});

test('every project contributes once to its host unit and assignment year', () => {
  const projects = [project('Khoa Y', 2025), project('Khoa Y', 2025), project('Khoa Dược', 2026)];
  const result = buildUnitYearHeatmap(projects);
  assert.equal(result.cells.reduce((sum, [, , value]) => sum + value, 0), projects.length);
  assert.equal(count(result, 'Khoa Y', 2025), 2);
  assert.equal(count(result, 'Khoa Dược', 2026), 1);
  assert.equal(count(result, 'Khoa Y', 2026), 0);
  assert.equal(result.total, 3);
});

test('assignment year drives heatmap and year filters even when start year differs', () => {
  const p = project('Khoa Y', 2026, { startYear: 2024 });
  const filtered = filterProjects([p], { ...DEFAULT_PROJECT_FILTERS, year: 2026 });
  const result = buildUnitYearHeatmap(filtered, { years: [2026], units: ['Khoa Y'] });
  assert.deepEqual(result.years, [2026]);
  assert.deepEqual(result.units, ['Khoa Y']);
  assert.deepEqual(result.cells, [[0, 0, 1]]);
});

test('years and color maximum expand beyond previous hardcoded limits', () => {
  const result = buildUnitYearHeatmap(Array.from({ length: 85 }, () => project('Khoa Y', 2027)), { years: [2026] });
  assert.deepEqual(result.years, [2026, 2027]);
  assert.equal(result.max, 85);
  assert.equal(count(result, 'Khoa Y', 2026), 0);
  assert.equal(count(result, 'Khoa Y', 2027), 85);
  assert.notEqual(heatmapTone(60, result.max).background, heatmapTone(85, result.max).background);
});

test('unknown years and additional host units remain represented instead of disappearing', () => {
  const result = buildUnitYearHeatmap([project('Đơn vị ngoài trường', undefined), project('Khoa Y', undefined, { startYear: 2025 })]);
  assert.deepEqual(result.years, [2025, null]);
  assert.equal(count(result, 'Đơn vị ngoài trường', null), 1);
  assert.equal(count(result, 'Khoa Y', 2025), 1);
  assert.equal(result.cells.reduce((sum, [, , value]) => sum + value, 0), 2);
});

test('empty filtered results and single-count scales stay valid', () => {
  const empty = buildUnitYearHeatmap([], { years: [2026], units: ['Khoa Y'] });
  assert.deepEqual(empty.cells, [[0, 0, 0]]);
  assert.equal(empty.max, 0);
  assert.equal(empty.total, 0);
  assert.notEqual(heatmapTone(0, 1).background, heatmapTone(1, 1).background);
  assert.deepEqual(heatmapTone(1, 1), { background: '#1e40af', text: '#ffffff' });
});
