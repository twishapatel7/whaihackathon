const STORAGE_KEY = 'scout_submissions'

export function getAllSubmissions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveSubmission(entry) {
  try {
    const existing = getAllSubmissions()
    existing.push(entry)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch (e) {
    console.error('Failed to save submission', e)
  }
}

export function clearAllSubmissions() {
  localStorage.removeItem(STORAGE_KEY)
}
