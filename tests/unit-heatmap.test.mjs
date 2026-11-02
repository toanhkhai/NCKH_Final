import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUnitYearHeatmap, heatmapTone } from '../src/services/unitHeatmap.ts';
import { filterProjects, DEFAULT_PROJECT_FILTERS } from '../src/services/projectTable.ts';

const project = (unit, year, patch = {}) => ({ assigningUnit: unit, assignmentYear: year, startYear: year, members: [], ...patch });
const count = (model, unit, year) => model.cells.find(([x, y]) => model.units[y] === unit && model.years[x] === year)?.[2];

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
