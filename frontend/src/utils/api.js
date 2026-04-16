const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
export const PROPERTY_ID = import.meta.env.VITE_PROPERTY_ID || ''

/**
 * Fetch the top-4 gap categories for the demo property from the backend.
 * Maps the backend shape → UI shape consumed by TopicPickerScreen.
 *
 * Backend returns: { id, topic, icon, urgency, gapLabel, question, answerOptions, score }
 * UI expects:      { id, label, icon, gapReason, statusColor }
 */
export async function fetchGapCategories() {
  const res = await fetch(`${API_BASE}/gaps/${PROPERTY_ID}`)
  if (!res.ok) throw new Error(`GET /gaps failed: ${res.status}`)
  const gaps = await res.json()
  return gaps.map(g => ({
    id:          g.id,
    label:       g.topic,
    icon:        g.icon,
    gapReason:   g.gapLabel ?? 'No recent data',
    statusColor: g.urgency === 'High' ? 'missing' : 'stale',
  }))
}

/**
 * Submit a completed review session (text review + optional game answers) to Supabase
 * via the backend. Called at two exit points:
 *   - User skips the game ("I'm done" on PointsAwardedScreen) → answers = []
 *   - User finishes the game (last QuestionScreen answer) → answers = [{...}, ...]
 *
 * @param {object} params
 * @param {string} params.sessionId      - UUID generated at start of review flow
 * @param {string} params.reviewText     - text from Screen 2
 * @param {Array}  params.completedCats  - completed game categories
 * @returns {Promise<{success: boolean, pointsEarned: number}>}
 */
export async function submitReview({ sessionId, reviewText, completedCats = [] }) {
  const answers = completedCats.flatMap(cat => {
    const rows = []
    if (cat.answer1 && cat.answer1 !== '(skipped)') {
      rows.push({ gapCategory: cat.id ?? cat.label, selectedOption: null, freeText: cat.answer1 })
    }
    if (cat.answer2 && cat.answer2 !== '(skipped)') {
      rows.push({ gapCategory: cat.id ?? cat.label, selectedOption: null, freeText: cat.answer2 })
    }
    return rows
  })

  const res = await fetch(`${API_BASE}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      propertyId: PROPERTY_ID,
      inputMode:  'text',
      reviewText: reviewText || null,
      answers,
    }),
  })
  if (!res.ok) throw new Error(`POST /answers failed: ${res.status}`)
  return res.json()
}
