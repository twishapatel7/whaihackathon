/**
 * Gap categories data source.
 *
 * This file is the single source of truth for which topic gaps are shown on the
 * Topic Picker screen. The UI reads this array and renders whatever comes back —
 * zero component changes needed when the data changes.
 *
 * TO REPLACE WITH A REAL DATA SOURCE:
 * Change the export below to an async function that fetches from your API or
 * Supabase query, then await it in TopicPickerScreen. Every returned object
 * must conform to this shape:
 *
 *   {
 *     id:          string   — stable unique key (used as React key)
 *     label:       string   — display name shown on the card, e.g. "Pool"
 *     gapReason:   string   — shown on the card badge AND passed verbatim to
 *                             the LLM prompt, e.g. "No recent data"
 *     statusColor: 'missing' | 'stale' | 'conflicting'
 *                           — controls badge color:
 *                             'missing'     → red   (no data at all)
 *                             'stale'       → orange (data exists but is old)
 *                             'conflicting' → orange (reviews contradict each other)
 *   }
 */
export const GAP_CATEGORIES = [
  {
    id: 'pool',
    label: 'Pool',
    gapReason: 'No recent data',
    statusColor: 'missing',
  },
  {
    id: 'shuttle',
    label: 'Shuttle',
    gapReason: '14 months old',
    statusColor: 'stale',
  },
  {
    id: 'pet-policy',
    label: 'Pet Policy',
    gapReason: 'Conflicting info',
    statusColor: 'conflicting',
  },
  {
    id: 'parking',
    label: 'Parking',
    gapReason: 'No recent data',
    statusColor: 'missing',
  },
]
