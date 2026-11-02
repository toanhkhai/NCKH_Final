import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FilterState, Project, StandardUnit } from '../types/project';
import { loadAllDashboardData, type LoadedDashboardData } from '../services/dataLoader';
import { DEFAULT_PROJECT_FILTERS, filterProjects, projectAssignmentYear } from '../services/projectTable';

export type DashboardView =
  | 'overview'
  | 'units'
  | 'progress'
  | 'people'
  | 'finance'
  | 'projects'
  | 'data-quality';

export const INITIAL_FILTERS: FilterState = DEFAULT_PROJECT_FILTERS;

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
    if (state.isLoading) return;
    state.isLoading = true;
    state.error = null;
    notify();

    try {
      const res = await loadAllDashboardData();
      const failed = Object.entries(res.sheetStatus).filter(([, status]) => !status.loaded);
      if (failed.length === Object.keys(res.sheetStatus).length) throw new Error('Không đọc được nguồn nào; dữ liệu của lần đọc trước được giữ lại nếu có. ' + failed.map(([id, status]) => `${id}: ${status.error}`).join('; '));
      state.data = res;
      state.isLoading = false;
      state.error = failed.length ? failed.map(([id, status]) => `${id}: ${status.error}`).join('; ') : null;
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

    return filterProjects(state.data.projects, state.filters);
  }, [state.data?.projects, state.filters]);

  const availableYears = useMemo(() => {
    if (!state.data?.projects) return [];
    const set = new Set<number>();
    state.data.projects.forEach((p) => {
      const year = projectAssignmentYear(p);
      if (year) set.add(year);
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
