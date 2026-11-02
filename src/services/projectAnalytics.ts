import type { Member, Project } from '../types/project.ts';
import { projectAssignmentYear } from './projectTable.ts';

export type SourceFlag = keyof NonNullable<Project['sourceFlags']>;
const flagFields = {
  accepted: 'isAccepted', stopped: 'isStopped', extended: 'isExtended', liquidated: 'isLiquidated',
  sponsored: 'hasSponsor', enterprise: 'hasEnterpriseCollab', international: 'hasInternationalCollab',
} as const;
export const projectFlag = (project: Project, flag: SourceFlag): boolean | null =>
  project.sourceFlags ? project.sourceFlags[flag] : project[flagFields[flag]];
export const isAcceptedProject = (project: Project) => project.isAccepted && !project.isStopped;

export function flagCount(projects: Project[], flag: SourceFlag, expected = true): number | null {
  if (!projects.length) return 0;
  const known = projects.filter((project) => projectFlag(project, flag) !== null);
  return known.length ? known.filter((project) => projectFlag(project, flag) === expected).length : null;
}

export function budgetSummary(projects: Project[]) {
  const known = projects.filter((project) => project.budgetKnown);
  return { total: projects.length && !known.length ? null : known.reduce((sum, project) => sum + project.budget, 0), missing: projects.length - known.length };
}

export function yearSeries(projects: Project[]) {
  const year = (project: Project) => projectAssignmentYear(project) ?? null;
  const years: (number | null)[] = [...new Set(projects.map(year).filter((value): value is number => value !== null))].sort((a, b) => a - b);
  if (projects.some((project) => year(project) === null)) years.push(null);
  return {
    years,
    assigned: years.map((value) => projects.filter((project) => year(project) === value).length),
    accepted: years.map((value) => projects.filter((project) => year(project) === value && isAcceptedProject(project)).length),
    budgets: years.map((value) => budgetSummary(projects.filter((project) => year(project) === value)).total),
  };
}

export function acceptanceSeries(projects: Project[]) {
  const accepted = projects.filter(isAcceptedProject);
  const years = [...new Set(projects.flatMap((project) => [projectAssignmentYear(project), ...(isAcceptedProject(project) ? [project.acceptYear] : [])]).filter((year): year is number => Number.isInteger(year)))].sort((a, b) => a - b);
  return {
    years,
    assigned: years.map((year) => accepted.filter((project) => projectAssignmentYear(project) === year).length),
    accepted: years.map((year) => accepted.filter((project) => project.acceptYear === year).length),
    missingAcceptanceYear: accepted.filter((project) => !project.acceptYear).length,
  };
}

export function budgetTiers(projects: Project[]) {
  const ranges = [
    { label: 'Dưới 10 triệu', includes: (value: number) => value >= 0 && value < 10 },
    { label: '10 – dưới 20 triệu', includes: (value: number) => value >= 10 && value < 20 },
    { label: '20 – dưới 30 triệu', includes: (value: number) => value >= 20 && value < 30 },
    { label: 'Từ 30 triệu', includes: (value: number) => value >= 30 },
  ];
  const tiers = ranges.map(({ label, includes }) => ({ label, count: projects.filter((project) => project.budgetKnown && includes(project.budget)).length }));
  if (projects.some((project) => project.budgetKnown && project.budget < 0)) tiers.push({ label: 'Kinh phí âm (cần kiểm tra)', count: projects.filter((project) => project.budgetKnown && project.budget < 0).length });
  tiers.push({ label: 'Chưa cập nhật', count: projects.filter((project) => !project.budgetKnown).length });
  return tiers;
}

export function collaborationCount(projects: Project[]): number | null {
  if (!projects.length) return 0;
  const fields: SourceFlag[] = ['sponsored', 'enterprise', 'international'];
  const confirmed = projects.filter((project) => fields.some((field) => projectFlag(project, field) === true));
  return confirmed.length || projects.some((project) => fields.every((field) => projectFlag(project, field) === false)) ? confirmed.length : null;
}

export const personSearchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim().replace(/\s+/g, ' ');
export const researcherKey = (member: Member) => member.staffId ? `id:${member.staffId.trim()}` : `name:${personSearchText(member.name)}|${member.unitGroup}`;
export function researcherStats(projects: Project[]) {
  type Researcher = { key: string; name: string; staffId?: string; unit: string; totalLed: number; acceptedCount: number; totalParticipated: number; projects: Project[]; ledProjectIds: string[] };
  const people = new Map<string, Researcher>();
  for (const project of projects) {
    const seen = new Set<string>();
    for (const member of [project.pi, ...project.members]) {
      if (!member.name.trim() || personSearchText(member.name) === 'chua cap nhat') continue;
      const key = researcherKey(member);
      if (seen.has(key)) continue;
      seen.add(key);
      const person = people.get(key) ?? { key, name: member.name, staffId: member.staffId, unit: member.unitGroup, totalLed: 0, acceptedCount: 0, totalParticipated: 0, projects: [], ledProjectIds: [] };
      if (key === researcherKey(project.pi)) {
        person.totalLed++;
        person.ledProjectIds.push(project.id);
        if (isAcceptedProject(project)) person.acceptedCount++;
      }
      person.totalParticipated++;
      person.projects.push(project);
      people.set(key, person);
    }
  }
  return [...people.values()];
}
