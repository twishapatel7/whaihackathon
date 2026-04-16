import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hotelMeta, reviewsSeed } from '../data/hotelReviewsMock'
import styles from './HotelReviewsPage.module.css'

const TRUNCATE_CHARS = 220

function formatTraveler(t) {
  if (!t) return ''
  const lower = t.toLowerCase()
  if (lower === 'solo') return 'Solo traveler'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export default function HotelReviewsPage() {
  const navigate = useNavigate()
  const [minRating, setMinRating] = useState('0')
  const [sortBy, setSortBy] = useState('newest')
  const [travelerFilter, setTravelerFilter] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [expanded, setExpanded] = useState(() => ({}))

  const filteredSorted = useMemo(() => {
    let list = [...reviewsSeed]

    const min = Number(minRating)
    if (min > 0) list = list.filter((r) => r.rating >= min)

    if (travelerFilter !== 'all') {
      list = list.filter(
        (r) => r.travelerType.toLowerCase() === travelerFilter.toLowerCase()
      )
    }

    const q = keyword.trim().toLowerCase()
    if (q) {
      list = list.filter((r) => {
        const hay = `${r.title} ${r.body} ${r.pros || ''} ${r.cons || ''}`.toLowerCase()
        return hay.includes(q)
      })
    }

    if (sortBy === 'newest') list.sort((a, b) => b.dateSort - a.dateSort)
    else if (sortBy === 'oldest') list.sort((a, b) => a.dateSort - b.dateSort)
    else if (sortBy === 'ratingHigh') list.sort((a, b) => b.rating - a.rating)
    else if (sortBy === 'ratingLow') list.sort((a, b) => a.rating - b.rating)

    return list
  }, [minRating, sortBy, travelerFilter, keyword])

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className={styles.page}>
      <div className={styles.statusBar} />
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          Back
        </button>
        <div className={styles.headerMain}>
          <h1 className={styles.hotelName}>Guest reviews</h1>
          <p className={styles.hotelSub}>{hotelMeta.name}</p>
        </div>
      </header>

      <div className={styles.scroll}>
        {/* Summary */}
        <section className={styles.summary} aria-label="Rating summary">
          <div className={styles.summaryTop}>
            <div className={styles.scoreBlock}>
              <span className={styles.scoreNum}>{hotelMeta.overall.toFixed(1)}</span>
              <span className={styles.scoreMax}>/ 5</span>
            </div>
            <span className={styles.reviewCount}>
              {hotelMeta.totalCount.toLocaleString()} verified reviews
            </span>
            <span className={styles.starsInline} aria-hidden>
              {'★'.repeat(Math.round(hotelMeta.overall))}
              {'☆'.repeat(5 - Math.round(hotelMeta.overall))}
            </span>
          </div>
          <div className={styles.breakdown}>
            {hotelMeta.breakdown.map((row) => (
              <div key={row.stars} className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>{row.stars} star</span>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Category scores */}
        <section className={styles.categories} aria-label="Category ratings">
          <p className={styles.sectionLabel}>Category ratings</p>
          <div className={styles.catGrid}>
            {hotelMeta.categories.map((cat) => (
              <div key={cat.key} className={styles.catRow}>
                <span className={styles.catName}>{cat.label}</span>
                <div className={styles.catBarTrack}>
                  <div
                    className={styles.catBarFill}
                    style={{ width: `${(cat.score / 5) * 100}%` }}
                  />
                </div>
                <span className={styles.catScore}>{cat.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Filters */}
        <section className={styles.filters} aria-label="Filter and sort reviews">
          <div className={styles.filterRow}>
            <select
              className={styles.select}
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              aria-label="Minimum rating"
            >
              <option value="0">All ratings</option>
              <option value="5">5 stars only</option>
              <option value="4">4+ stars</option>
              <option value="3">3+ stars</option>
              <option value="2">2+ stars</option>
              <option value="1">1+ stars</option>
            </select>
            <select
              className={styles.select}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort order"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="ratingHigh">Highest rating</option>
              <option value="ratingLow">Lowest rating</option>
            </select>
            <select
              className={styles.select}
              value={travelerFilter}
              onChange={(e) => setTravelerFilter(e.target.value)}
              aria-label="Traveler type"
            >
              <option value="all">All travelers</option>
              <option value="Family">Family</option>
              <option value="solo">Solo</option>
              <option value="Couple">Couple</option>
              <option value="Group">Group</option>
              <option value="Business">Business</option>
            </select>
          </div>
          <div className={styles.filterRow}>
            <input
              type="search"
              className={styles.input}
              placeholder="Search reviews (e.g. noise, breakfast, parking)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label="Search in reviews"
            />
          </div>
          <p className={styles.filterMeta}>
            Showing {filteredSorted.length} of {reviewsSeed.length} loaded reviews
          </p>
        </section>

        <div className={styles.listHeader}>Reviews</div>

        {filteredSorted.length === 0 ? (
          <p className={styles.emptyState}>No reviews match your filters.</p>
        ) : (
          filteredSorted.map((r) => (
            <article key={r.id} className={styles.reviewRow}>
              <div className={styles.rowMeta}>
                <strong>{r.rating}/5</strong>
                <span className={styles.metaDot} aria-hidden>
                  ·
                </span>
                <span>{formatTraveler(r.travelerType)}</span>
                <span className={styles.metaDot} aria-hidden>
                  ·
                </span>
                <span>{r.date}</span>
                <span className={styles.metaDot} aria-hidden>
                  ·
                </span>
                <span>{r.stay}</span>
                <span className={styles.metaDot} aria-hidden>
                  ·
                </span>
                <span>{r.room}</span>
              </div>
              <p className={styles.rowTitle}>{r.title}</p>
              <ReviewBody
                text={r.body}
                isExpanded={expanded[r.id]}
                onToggle={() => toggleExpand(r.id)}
              />
              {(r.pros || r.cons) && (
                <div className={styles.highlights}>
                  {r.pros && (
                    <p>
                      <span className={styles.hlLabel}>Pros: </span>
                      {r.pros}
                    </p>
                  )}
                  {r.cons && (
                    <p>
                      <span className={styles.hlLabel}>Cons: </span>
                      {r.cons}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))
        )}

        <div className={styles.bottomPad} />
      </div>
    </div>
  )
}

function ReviewBody({ text, isExpanded, onToggle }) {
  const needTruncate = text.length > TRUNCATE_CHARS
  const shown = needTruncate && !isExpanded ? `${text.slice(0, TRUNCATE_CHARS).trim()}…` : text

  return (
    <div className={styles.rowBody}>
      {shown}
      {needTruncate && (
        <button type="button" className={styles.readMoreBtn} onClick={onToggle}>
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
