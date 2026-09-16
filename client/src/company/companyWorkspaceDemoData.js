export function buildDefaultCompanyWorkspaceState() {
  return {
    projects: [],
    selectedProjectId: '',
    statusFilter: 'All',
  }
}

export function mergeCompanyWorkspaceState(state = {}) {
  const defaults = buildDefaultCompanyWorkspaceState()

  return {
    projects: Array.isArray(state.projects) ? state.projects : defaults.projects,
    selectedProjectId: typeof state.selectedProjectId === 'string' ? state.selectedProjectId : defaults.selectedProjectId,
    statusFilter: typeof state.statusFilter === 'string' ? state.statusFilter : defaults.statusFilter,
  }
}
