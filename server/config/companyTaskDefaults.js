const DEFAULT_COMPANY_TASK_LIBRARY_STATE = {
  tasks: [],
  revision: 0,
}

function buildDefaultCompanyTaskLibraryState() {
  return JSON.parse(JSON.stringify(DEFAULT_COMPANY_TASK_LIBRARY_STATE))
}

module.exports = {
  buildDefaultCompanyTaskLibraryState,
  DEFAULT_COMPANY_TASK_LIBRARY_STATE,
}
