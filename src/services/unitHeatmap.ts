import { STANDARD_UNITS } from '../config/units.ts';
import type { Project, StandardUnit } from '../types/project.ts';
import { projectAssignmentYear } from './projectTable.ts';

type HeatmapProject = Pick<Project, 'assigningUnit' | 'assignmentYear' | 'startYear'>;
export const HEATMAP_LOW = '#dbeafe';
export const HEATMAP_HIGH = '#1e40af';

export function buildUnitYearHeatmap(projects: HeatmapProject[], context: { years?: number[]; units?: StandardUnit[] } = {}) {
  const units = [...new Set([...(context.units ?? STANDARD_UNITS), ...projects.map((p) => p.assigningUnit)])];
  const knownYear = (project: HeatmapProject) => {
    const year = projectAssignmentYear(project);
    return year !== undefined && Number.isInteger(year) ? year : null;
  };
  const years: (number | null)[] = [...new Set([
    ...(context.years ?? []), ...projects.map(knownYear).filter((year): year is number => year !== null),
  ])].sort((a, b) => a - b);
  if (projects.some((p) => knownYear(p) === null)) years.push(null);
  const counts = new Map<string, number>();
  for (const project of projects) {
    const key = JSON.stringify([project.assigningUnit, knownYear(project)]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cells: [number, number, number][] = [];
  years.forEach((year, x) => units.forEach((unit, y) => cells.push([x, y, counts.get(JSON.stringify([unit, year])) ?? 0])));
  return { units, years, cells, total: projects.length, max: Math.max(0, ...cells.map((cell) => cell[2])) };
}

export function buildUnitYearBars(projects: HeatmapProject[]) {
  const matrix = buildUnitYearHeatmap(projects);
  const units = [...STANDARD_UNITS];
  const series = matrix.years.map((year, yearIndex) => {
    const cells = matrix.cells.filter(([x]) => x === yearIndex);
    return { year, values: units.map((unit) => cells[matrix.units.indexOf(unit)]?.[2] ?? 0) };
  });
  const otherUnits = matrix.units.filter((unit) => !units.includes(unit)).map((unit) => ({
    unit, count: matrix.cells.filter(([, index]) => matrix.units[index] === unit).reduce((sum, [, , count]) => sum + count, 0),
  })).filter(({ count }) => count > 0);
  const shownTotal = series.reduce((sum, entry) => sum + entry.values.reduce((count, value) => count + value, 0), 0);
  return { units, series, otherUnits, shownTotal, total: matrix.total };
}

export function heatmapTone(count: number, max: number) {
  if (count <= 0) return { background: '#f1f5f9', text: '#475569' };
  const ratio = max <= 1 ? 1 : Math.min(1, Math.max(0, (count - 1) / (max - 1)));
  const low = [219, 234, 254], high = [30, 64, 175];
  const rgb = low.map((channel, i) => Math.round(channel + (high[i] - channel) * ratio));
  const background = '#' + rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('');
  const linear = rgb.map((channel) => channel / 255 <= 0.04045 ? channel / 255 / 12.92 : ((channel / 255 + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return { background, text: luminance < 0.179 ? '#ffffff' : '#000000' };
}
