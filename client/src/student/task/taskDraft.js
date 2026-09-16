export async function taskDraftKey(token, identity) {
  const bytes = new TextEncoder().encode(JSON.stringify([token, identity]))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return `skillbridge.task.draft.${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`
}

export function readTaskDraft(storage, key, version) {
  try {
    const draft = JSON.parse(storage.getItem(key))
    if (draft?.version !== version || !Number.isFinite(draft.savedAt) || draft.savedAt > Date.now()
      || Date.now() - draft.savedAt > 7 * 24 * 60 * 60 * 1000) return null
    if (!['submissionLink', 'submissionContent', 'note'].every(field => typeof draft[field] === 'string')) return null
    return draft
  } catch { return null }
}
