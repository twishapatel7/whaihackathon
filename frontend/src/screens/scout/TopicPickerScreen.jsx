import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchGapCategories } from '../../utils/api'
import { GAP_CATEGORIES as STATIC_FALLBACK } from '../../data/gapCategories'
import styles from './TopicPickerScreen.module.css'

const CATEGORY_ICONS = {
  pool: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M4 20C6 18 8 18 10 20C12 22 14 22 16 20C18 18 20 18 22 20C24 22 26 22 26 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M4 24C6 22 8 22 10 24C12 26 14 26 16 24C18 22 20 22 22 24C24 26 26 26 26 26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
      <circle cx="19" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M14 10L16 14H22L19 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 10L11 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  shuttle: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="7" width="24" height="14" rx="3" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M2 13H26" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 7V13M14 7V13M21 7V13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
      <circle cx="8" cy="23" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="20" cy="23" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M2 10H26" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
    </svg>
  ),
  'pet-policy': (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <ellipse cx="10" cy="7" rx="2.5" ry="3.5" stroke="currentColor" strokeWidth="1.6"/>
      <ellipse cx="18" cy="7" rx="2.5" ry="3.5" stroke="currentColor" strokeWidth="1.6"/>
      <ellipse cx="5" cy="13" rx="2" ry="3" stroke="currentColor" strokeWidth="1.6"/>
      <ellipse cx="23" cy="13" rx="2" ry="3" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M14 13C9 13 6 16 6 20C6 22.2 7.8 24 10 24H18C20.2 24 22 22.2 22 20C22 16 19 13 14 13Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  parking: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="3" width="22" height="22" rx="4" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M10 20V8H15.5C17.985 8 20 10.015 20 12.5C20 14.985 17.985 17 15.5 17H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

function TopicIcon({ cat }) {
  const fallback = CATEGORY_ICONS[cat.id]
  const raw = cat.icon
  if (raw != null && raw !== '') {
    if (typeof raw === 'string') {
      return <span className={styles.topicEmoji}>{raw}</span>
    }
    return <span className={styles.topicRowIconInner}>{raw}</span>
  }
  return <span className={styles.topicRowIconInner}>{fallback}</span>
}

export default function TopicPickerScreen() {
  const navigate = useNavigate()
  const { state = {} } = useLocation()
  const { reviewText = '', sessionId = '' } = state

  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    fetchGapCategories()
      .then(cats => setCategories(cats))
      .catch(() => setCategories(STATIC_FALLBACK))
      .finally(() => setLoading(false))
  }, [])

  function toggleCategory(cat) {
    setSelectedIds(prev =>
      prev.includes(cat.id)
        ? prev.filter(id => id !== cat.id)
        : [...prev, cat.id]
    )
  }

  function handleContinue() {
    if (selectedIds.length === 0) return
    const orderedCategories = selectedIds.map(id =>
      categories.find(c => c.id === id)
    )
    navigate('/review/text/question', {
      state: {
        mode: 'question',
        categories: orderedCategories,
        currentCategoryIndex: 0,
        completedCategories: [],
        previousAnswer: null,
        reviewText,
        sessionId,
      },
    })
  }

  return (
    <div className={styles.screen}>
      <div className={styles.statusBar} />

      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 17L8 11L14 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={styles.scoutBadge}>
          <span className={styles.scoutDot} />
          SCOUT
        </div>
        <div className={styles.headerRight} />
      </header>

      <div className={styles.scrollable}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>What can you tell us?</h2>
          <p className={styles.subtitle}>
            We're missing info on a few things. What did you experience?
          </p>
        </div>

        {loading ? (
          <div className={styles.gridLoading}>
            <div className={styles.loadingDots}><span /><span /><span /></div>
            <p className={styles.loadingText}>Finding gaps…</p>
          </div>
        ) : (
          <div className={styles.topicList}>
            {categories.map(cat => {
              const isSelected = selectedIds.includes(cat.id)
              const selectionOrder = selectedIds.indexOf(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.topicRow} ${isSelected ? styles.topicRowSelected : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  <span className={styles.topicRowIcon}>
                    <TopicIcon cat={cat} />
                  </span>
                  <span className={styles.topicRowText}>
                    <span className={styles.topicRowLabel}>{cat.label}</span>
                    <span
                      className={styles.topicRowMeta}
                      data-status={cat.statusColor}
                    >
                      {cat.gapReason}
                    </span>
                  </span>
                  {isSelected ? (
                    <span className={styles.topicRowBadge}>{selectionOrder + 1}</span>
                  ) : (
                    <span className={styles.topicRowPlaceholder} aria-hidden />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className={styles.rewardsBanner}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L9.8 5.4L14.5 5.9L11 9L12.1 13.5L8 11.1L3.9 13.5L5 9L1.5 5.9L6.2 5.4L8 1Z" fill="#FFD000" stroke="#FFD000" strokeWidth="0.5"/>
        </svg>
        <span className={styles.rewardsText}>+50 pts for each topic you help with</span>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.continueBtn}
          onClick={handleContinue}
          disabled={selectedIds.length === 0 || loading}
        >
          Continue
          {selectedIds.length > 0 && (
            <span className={styles.continueBadge}>{selectedIds.length}</span>
          )}
        </button>
        <button type="button" className={styles.skipBtn} onClick={() => navigate('/')}>
          Skip all topics
        </button>
      </div>
    </div>
  )
}
