/**
 * Fallback questions used when the API key is absent or the call fails.
 * These are intentional — specific and conversational, not generic.
 * Review them before a demo to make sure they suit your property.
 *
 * FALLBACKS (Screen 5 — first question per category):
 *   Pool       → "Was the pool open during your stay?"
 *                chips: Yes, every day | Closed part of the trip | Didn't try to use it
 *
 *   Shuttle    → "Did you use the hotel's airport shuttle?"
 *                chips: Yes, ran on time | Yes, but it was late | No, I didn't need it
 *
 *   Pet Policy → "Did you bring a pet or ask about the policy?"
 *                chips: Yes, very pet-friendly | Had unexpected fees | I just asked about it
 *
 *   Parking    → "Did you park at the hotel?"
 *                chips: Yes, easy to find | Yes, but it was pricey | No, I didn't drive
 *
 * FOLLOWUP_FALLBACKS (Screen 6 — conditional follow-up):
 *   Pool       → "How was the pool overall — hours, size, or cleanliness?"
 *                chips: Great, no complaints | Hours were too limited | Water wasn't clean
 *
 *   Shuttle    → "Did the shuttle run on a reliable schedule?"
 *                chips: Very reliable | Had to wait a while | Schedule wasn't posted
 *
 *   Pet Policy → "Were there any surprise fees or rules for pets?"
 *                chips: No surprises at all | Unexpected deposit required | Rules not communicated
 *
 *   Parking    → "Was the parking fee reasonable for the area?"
 *                chips: Very reasonable | A bit expensive | No parking fee
 */

const FALLBACKS = {
  Pool: {
    question: 'Was the pool open during your stay?',
    chips: ['Yes, every day', 'Closed part of the trip', "Didn't try to use it"],
  },
  Shuttle: {
    question: "Did you use the hotel's airport shuttle?",
    chips: ['Yes, ran on time', 'Yes, but it was late', "No, I didn't need it"],
  },
  'Pet Policy': {
    question: 'Did you bring a pet or ask about the policy?',
    chips: ['Yes, very pet-friendly', 'Had unexpected fees', 'I just asked about it'],
  },
  Parking: {
    question: 'Did you park at the hotel?',
    chips: ['Yes, easy to find', 'Yes, but it was pricey', "No, I didn't drive"],
  },
}

const FOLLOWUP_FALLBACKS = {
  Pool: {
    question: 'How was the pool overall — hours, size, or cleanliness?',
    chips: ['Great, no complaints', 'Hours were too limited', "Water wasn't clean"],
  },
  Shuttle: {
    question: 'Did the shuttle run on a reliable schedule?',
    chips: ['Very reliable', 'Had to wait a while', "Schedule wasn't posted"],
  },
  'Pet Policy': {
    question: 'Were there any surprise fees or rules for pets?',
    chips: ['No surprises at all', 'Unexpected deposit required', 'Rules not communicated'],
  },
  Parking: {
    question: 'Was the parking fee reasonable for the area?',
    chips: ['Very reasonable', 'A bit expensive', 'No parking fee'],
  },
}

/**
 * Calls GPT-4o-mini to generate one question + 3 short answer chips.
 *
 * @param {string} categoryLabel  - e.g. "Pool"
 * @param {string} gapReason      - e.g. "No recent data"
 * @param {string|null} previousAnswer - Screen 5 answer; when provided, generates a follow-up
 * @param {string} propertyName   - e.g. "Art Deco Hotel, Frisco TX"
 * @returns {Promise<{ question: string, chips: [string, string, string] }>}
 */
export async function generateQuestion(
  categoryLabel,
  gapReason,
  previousAnswer = null,
  propertyName = 'the hotel'
) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  const fallback = previousAnswer
    ? (FOLLOWUP_FALLBACKS[categoryLabel] ?? FOLLOWUP_FALLBACKS.Pool)
    : (FALLBACKS[categoryLabel] ?? FALLBACKS.Pool)

  if (!apiKey) return fallback

  const isFollowup = previousAnswer !== null

  const systemPrompt =
    'You are a post-stay review assistant for Expedia. ' +
    'Your job is to gather specific, gap-filling information from guests that helps future travelers make booking decisions. ' +
    'Always ask questions that are conversational, direct, and specific — never broad. ' +
    'Keep chip answers short (5 words or fewer). ' +
    'Return ONLY valid JSON. No explanation, no markdown, no extra text.'

  const userPrompt = isFollowup
    ? `A guest just checked out of "${propertyName}".
Topic: "${categoryLabel}".
They answered a previous question with: "${previousAnswer}".

Write ONE follow-up question that is genuinely conditional on their answer — not a generic second question, but one that digs into what they said. For example, if they said "Yes, I used it," ask something specific about the experience, not "Did you use it again?"

Return JSON: {"question": "...", "chips": ["...", "...", "..."]}`
    : `A guest just checked out of "${propertyName}".
Topic: "${categoryLabel}". Data gap reason: "${gapReason}".

Write ONE specific, conversational question that helps future travelers by filling this exact gap. Ask something precise — not "How was the ${categoryLabel}?" but something like "Was the pool heated?" or "Did the shuttle run to the airport?"

Return JSON: {"question": "...", "chips": ["...", "...", "..."]}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!res.ok) throw new Error(`OpenAI ${res.status}`)

    const data = await res.json()
    const parsed = JSON.parse(data.choices[0].message.content)

    if (
      typeof parsed.question === 'string' &&
      Array.isArray(parsed.chips) &&
      parsed.chips.length === 3 &&
      parsed.chips.every(c => typeof c === 'string')
    ) {
      return parsed
    }

    throw new Error('Unexpected response shape')
  } catch {
    return fallback
  }
}
