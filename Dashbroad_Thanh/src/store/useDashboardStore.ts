import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FilterState, Project, StandardUnit } from '../types/project';
import { loadAllDashboardData, type LoadedDashboardData } from '../services/dataLoader';

export type DashboardView =
  | 'overview'
  | 'units'
  | 'progress'
  | 'people'
  | 'finance'
  | 'projects'
  | 'data-quality';

export const INITIAL_FILTERS: FilterState = {
  level: 'ALL',
  year: 'ALL',
  unit: 'ALL',
  status: 'ALL',
  grade: 'ALL',
  searchQuery: '',
  onlyExtended: false,
  onlySponsored: false,
  onlyHasCollab: false,
  budgetRange: [0, 1000],
};

// Global Store State shared across all components
interface StoreState {
  data: LoadedDashboardData | null;
  isLoading: boolean;
  error: string | null;
  activeView: DashboardView;
  selectedProject: Project | null;
  filters: FilterState;
  theme: 'light' | 'dark';
}

const state: StoreState = {
  data: null,
  isLoading: false,
  error: null,
  activeView: 'overview',
  selectedProject: null,
  filters: INITIAL_FILTERS,
  theme: 'light',
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function useDashboard() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('dhydct_theme', 'light');
  }, []);

  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    state.theme = 'light';
    localStorage.setItem('dhydct_theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
    notify();
  }, []);

  const setActiveView = useCallback((view: DashboardView) => {
    state.activeView = view;
    notify();
  }, []);

  const setSelectedProject = useCallback((p: Project | null) => {
    state.selectedProject = p;
    notify();
  }, []);

  const updateFilters = useCallback((patch: Partial<FilterState>) => {
    state.filters = { ...state.filters, ...patch };
    notify();
  }, []);

  const resetFilters = useCallback(() => {
    state.filters = INITIAL_FILTERS;
    notify();
  }, []);

  const refreshData = useCallback(async () => {
    state.isLoading = true;
    state.error = null;
    notify();

    try {
      const res = await loadAllDashboardData();
      state.data = res;
      state.isLoading = false;
      state.error = null;
      notify();
    } catch (err: any) {
      state.isLoading = false;
      state.error = err?.message || 'Không thể tải dữ liệu từ Google Sheets';
      notify();
    }
  }, []);

  // Initial load once
  useEffect(() => {
    if (!state.data && !state.isLoading) {
      refreshData();
    }
  }, [refreshData]);

  // Filtered projects selector
  const filteredProjects = useMemo(() => {
    if (!state.data?.projects) return [];

    return state.data.projects.filter((p) => {
      if (state.filters.level !== 'ALL' && p.level !== state.filters.level) return false;
      if (state.filters.year !== 'ALL' && p.startYear !== state.filters.year) return false;

      if (state.filters.unit !== 'ALL') {
        const matchesAssigning = p.assigningUnit === state.filters.unit;
        const matchesMember = p.members.some((m) => m.unitGroup === state.filters.unit);
        if (!matchesAssigning && !matchesMember) return false;
      }

      if (state.filters.status !== 'ALL' && p.status !== state.filters.status) return false;
      if (state.filters.grade !== 'ALL' && p.grade !== state.filters.grade) return false;

      if (state.filters.onlyExtended && !p.isExtended) return false;
      if (state.filters.onlySponsored && !p.hasSponsor) return false;
      if (state.filters.onlyHasCollab && !p.hasEnterpriseCollab && !p.hasInternationalCollab) return false;

      if (state.filters.searchQuery.trim()) {
        const q = state.filters.searchQuery.toLowerCase().trim();
        const inTitle = p.title.toLowerCase().includes(q);
        const inPi =
          p.pi.name.toLowerCase().includes(q) ||
          (p.pi.staffId && p.pi.staffId.toLowerCase().includes(q));
        const inDecision = p.assignDecision?.toLowerCase().includes(q);
        const inCode = p.code?.toLowerCase().includes(q);
        const inMembers = p.members.some((m) => m.name.toLowerCase().includes(q));

        if (!inTitle && !inPi && !inDecision && !inCode && !inMembers) {
          return false;
        }
      }

      return true;
    });
  }, [state.data?.projects, state.filters]);

  const availableYears = useMemo(() => {
    if (!state.data?.projects) return [2021, 2022, 2023, 2024, 2025, 2026];
    const set = new Set<number>();
    state.data.projects.forEach((p) => {
      if (p.startYear) set.add(p.startYear);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [state.data?.projects]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    activeView: state.activeView,
    setActiveView,
    selectedProject: state.selectedProject,
    setSelectedProject,
    filters: state.filters,
    updateFilters,
    resetFilters,
    filteredProjects,
    availableYears,
    refreshData,
    theme: state.theme,
    setTheme,
  };
}
