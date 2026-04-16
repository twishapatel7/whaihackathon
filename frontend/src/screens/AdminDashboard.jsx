import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllSubmissions, clearAllSubmissions } from '../storage/submissions'
import styles from './AdminDashboard.module.css'

function formatTimestamp(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(',', ' ·')
}

function StatCard({ label, value, accent }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statValue} style={accent ? { color: accent } : {}}>
        {value}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

function GapCoverageBar({ category, count, max }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className={styles.coverageRow}>
      <span className={styles.coverageName}>{category}</span>
      <div className={styles.coverageBarTrack}>
        <div className={styles.coverageBarFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.coverageCount}>{count}</span>
    </div>
  )
}

function SubmissionCard({ entry }) {
  const [expanded, setExpanded] = useState(false)
  const isReview = entry.type === 'full_review'

  return (
    <div className={styles.subCard}>
      <div className={styles.subCardTop}>
        <span className={`${styles.typeBadge} ${isReview ? styles.badgeBlue : styles.badgeGreen}`}>
          {isReview ? 'Full Review' : 'Gap Answer'}
        </span>
        <span className={styles.subTimestamp}>{formatTimestamp(entry.timestamp)}</span>
        <span className={styles.subPoints}>+{entry.pointsEarned} pts</span>
      </div>

      {isReview ? (
        <div className={styles.subBody}>
          <p className={`${styles.reviewText} ${expanded ? styles.reviewTextExpanded : ''}`}>
            {entry.reviewText}
          </p>
          {entry.reviewText && entry.reviewText.length > 120 && (
            <button
              className={styles.showMoreBtn}
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      ) : (
        <div className={styles.subBody}>
          <div className={styles.gapMeta}>
            <span className={styles.gapCategory}>{entry.category}</span>
            {entry.isCustomAnswer && (
              <span className={styles.customBadge}>custom</span>
            )}
          </div>
          <p className={styles.gapQuestion}>{entry.question}</p>
          <p className={styles.gapAnswer}>"{entry.answer}"</p>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])

  const loadData = useCallback(() => {
    setSubmissions(getAllSubmissions())
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const onFocus = () => loadData()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadData])

  const totalCount = submissions.length
  const fullReviews = submissions.filter(s => s.type === 'full_review').length
  const gapAnswers = submissions.filter(s => s.type === 'gap_answer').length
  const totalPoints = submissions.reduce((sum, s) => sum + (s.pointsEarned ?? 0), 0)

  const coverageMap = {}
  submissions
    .filter(s => s.type === 'gap_answer')
    .forEach(s => {
      coverageMap[s.category] = (coverageMap[s.category] ?? 0) + 1
    })
  const coverageEntries = Object.entries(coverageMap).sort((a, b) => b[1] - a[1])
  const maxCount = coverageEntries[0]?.[1] ?? 1

  const sorted = [...submissions].reverse()

  function handleClear() {
    if (window.confirm('Clear all submission data? This cannot be undone.')) {
      clearAllSubmissions()
      setSubmissions([])
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.statusBar} />

      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 17L8 11L14 5" stroke="#0071C2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.headerTitle}>Scout Admin</h1>
        <div className={styles.headerRight} />
      </header>

      <div className={styles.scrollable}>
        <div className={styles.statsRow}>
          <StatCard label="Total" value={totalCount} />
          <StatCard label="Reviews" value={fullReviews} accent="#0071C2" />
          <StatCard label="Gap Answers" value={gapAnswers} accent="#2E8B57" />
          <StatCard label="Points" value={totalPoints} accent="#B8860B" />
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Gap Coverage</h2>
          {coverageEntries.length === 0 ? (
            <p className={styles.emptyNote}>No gap answers yet.</p>
          ) : (
            <div className={styles.coverageList}>
              {coverageEntries.map(([cat, count]) => (
                <GapCoverageBar key={cat} category={cat} count={count} max={maxCount} />
              ))}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Submissions</h2>
          {sorted.length === 0 ? (
            <p className={styles.emptyNote}>No submissions yet.</p>
          ) : (
            <div className={styles.subList}>
              {sorted.map((entry, i) => (
                <SubmissionCard key={i} entry={entry} />
              ))}
            </div>
          )}
        </section>

        <div className={styles.clearWrap}>
          <button className={styles.clearBtn} onClick={handleClear}>
            Clear all data
          </button>
        </div>

        <div className={styles.bottomPad} />
      </div>
    </div>
  )
}
