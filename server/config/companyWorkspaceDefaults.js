const DEFAULT_COMPANY_WORKSPACE_STATE = {
  projects: [],
  selectedProjectId: '',
  statusFilter: 'All',
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function buildDefaultCompanyWorkspaceState() {
  return clone(DEFAULT_COMPANY_WORKSPACE_STATE)
}

module.exports = {
  buildDefaultCompanyWorkspaceState,
  DEFAULT_COMPANY_WORKSPACE_STATE,
}
