import { useNavigate } from 'react-router-dom'
import styles from './OwnerDashboard.module.css'

export default function OwnerDashboard() {
  const navigate = useNavigate()

  return (
    <div className={styles.screen}>
      <div className={styles.statusBar} />

      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 17L8 11L14 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 className={styles.headerTitle}>My Rewards</h2>
        <div className={styles.headerRight} />
      </header>

      <div className={styles.content}>
        {/* Points hero */}
        <div className={styles.pointsHero}>
          <div className={styles.pointsOrb}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L16.8 9.3L24.5 9.9L18.9 14.8L20.7 22.3L14 18.4L7.3 22.3L9.1 14.8L3.5 9.9L11.2 9.3L14 2Z" fill="#FFD000" stroke="#FFD000" strokeWidth="0.8" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.pointsTotal}>200</div>
          <div className={styles.pointsLabel}>Expedia Rewards Points</div>
          <div className={styles.pointsValue}>≈ $2.00 travel value</div>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>1</span>
            <span className={styles.statLabel}>Reviews</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>2</span>
            <span className={styles.statLabel}>Questions</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>Gold</span>
            <span className={styles.statLabel}>Status</span>
          </div>
        </div>

        {/* Coming soon */}
        <div className={styles.comingSoonCard}>
          <div className={styles.comingSoonIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="12" width="22" height="13" rx="2" stroke="#8896B0" strokeWidth="1.6"/>
              <path d="M3 18H25M8 12V9C8 6.24 10.24 4 13 4H15C17.76 4 20 6.24 20 9V12" stroke="#8896B0" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="14" cy="18" r="2" fill="#8896B0"/>
            </svg>
          </div>
          <h3 className={styles.comingSoonTitle}>Dashboard Coming Soon</h3>
          <p className={styles.comingSoonDesc}>
            Full analytics, review history, and reward redemption launching soon.
          </p>
        </div>

        {/* CTA */}
        <button className={styles.ctaBtn} onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    </div>
  )
}
