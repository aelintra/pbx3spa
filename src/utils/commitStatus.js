/** Dispatched after Save that marks globals.mycommit dirty so CommitButton refreshes. */
export const COMMIT_STATUS_REFRESH_EVENT = 'pbx3:commit-status-refresh'

export function refreshCommitStatusUi() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COMMIT_STATUS_REFRESH_EVENT))
  }
}
