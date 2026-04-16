import { useNavigate, useLocation } from 'react-router-dom'
import styles from './PayoffScreen.module.css'

const HOTEL_NAME = 'Art Deco Hotel, Frisco TX'

function getSummary({ label, answer1, answer2 }) {
  const answer = [answer1, answer2].find(a => a && a !== '(skipped)')
  if (!answer) return `${label}: info updated from your visit`
  return `${label}: "${answer}"`
}

export default function PayoffScreen() {
  const navigate = useNavigate()
  const { state = {} } = useLocation()
  const { completedCategories = [] } = state

  const count = completedCategories.length
  const categoryPts = count * 50
  const pioneerBonus = count > 1 ? 25 : 0
  const totalPts = categoryPts + pioneerBonus

  return (
    <div className={styles.screen}>
      <div className={styles.statusBar} />

      {/* Dark green hero section */}
      <div className={styles.heroSection}>
        <div className={styles.heroCircle}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M10 20L17 27L30 13"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className={styles.heroTitle}>You're a Scout Pioneer.</h1>
        <p className={styles.heroSub}>{HOTEL_NAME}</p>
      </div>

      <div className={styles.content}>
        <p className={styles.gapsFilled}>
          You filled <strong>{count}</strong> gap{count !== 1 ? 's' : ''}
        </p>

        {/* What Scout now knows */}
        <div className={styles.summaryBox}>
          <div className={styles.summaryLabel}>WHAT SCOUT NOW KNOWS</div>
          <div className={styles.summaryList}>
            {completedCategories.map((cat, i) => (
              <div key={i} className={styles.summaryRow}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" stroke="#5B8EFF" strokeWidth="1.2"/>
                  <path d="M4.5 7L6.2 8.7L9.5 5.3" stroke="#5B8EFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={styles.summaryText}>{getSummary(cat)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Points breakdown */}
        <div className={styles.ptsBox}>
          <div className={styles.ptsBoxTitle}>Points breakdown</div>
          <div className={styles.ptsRows}>
            {completedCategories.map((cat, i) => (
              <div key={i} className={styles.ptsRow}>
                <span className={styles.ptsRowLabel}>{cat.label}</span>
                <span className={styles.ptsRowVal}>+50 pts</span>
              </div>
            ))}
            {pioneerBonus > 0 && (
              <div className={`${styles.ptsRow} ${styles.ptsRowBonus}`}>
                <span className={styles.ptsRowLabel}>Pioneer bonus</span>
                <span className={styles.ptsRowVal}>+25 pts</span>
              </div>
            )}
          </div>
          <div className={styles.ptsDivider} />
          <div className={styles.ptsTotal}>
            <span className={styles.ptsTotalLabel}>Total earned</span>
            <span className={styles.ptsTotalVal}>+{totalPts} pts</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.reviewBtn} onClick={() => navigate('/review/text')}>
            Write your full review
          </button>
          <button className={styles.doneBtn} onClick={() => navigate('/')}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
