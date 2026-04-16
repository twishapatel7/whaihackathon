import { useNavigate, useLocation } from 'react-router-dom'
import { submitReview } from '../../utils/api'
import styles from './PointsAwardedScreen.module.css'

export default function PointsAwardedScreen() {
  const navigate = useNavigate()
  const { state = {} } = useLocation()
  const { reviewText = '', sessionId = '' } = state

  function handlePlayScout() {
    navigate('/review/text/topics', { state: { reviewText, sessionId } })
  }

  async function handleDone() {
    // User is skipping the game — save the review now before leaving
    try {
      await submitReview({ sessionId, reviewText, completedCats: [] })
    } catch {
      // Fire-and-forget for demo; don't block navigation on a network error
    }
    navigate('/')
  }

  return (
    <div className={styles.screen}>
      <div className={styles.statusBar} />

      <div className={styles.content}>
        {/* Confirmation icon */}
        <div className={styles.iconWrap}>
          <div className={styles.iconCircle}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M9 18L15.5 24.5L27 12" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <h2 className={styles.title}>Review submitted!</h2>
        <p className={styles.sub}>Art Deco Hotel, Frisco TX</p>

        {/* Points earned card */}
        <div className={styles.ptsCard}>
          <div className={styles.ptsCardRow}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.4 8.3L21 8.9L16.2 13.1L17.8 19.5L12 16.3L6.2 19.5L7.8 13.1L3 8.9L9.6 8.3L12 2Z" fill="#FFD000" stroke="#FFD000" strokeWidth="0.6" strokeLinejoin="round"/>
            </svg>
            <div>
              <div className={styles.ptsCardLabel}>Points earned</div>
              <div className={styles.ptsCardValue}>+100 pts</div>
            </div>
          </div>
          <div className={styles.ptsCardNote}>Added to your Expedia Rewards balance</div>
        </div>

        {/* Scout CTA */}
        <div className={styles.scoutCard}>
          <div className={styles.scoutCardTop}>
            <span className={styles.scoutLabel}><span className={styles.scoutDot} />SCOUT</span>
            <span className={styles.scoutPtsPill}>Up to +175 more pts</span>
          </div>
          <h3 className={styles.scoutCardTitle}>You could be a Scout Pioneer</h3>
          <p className={styles.scoutCardDesc}>
            Answer 1–2 quick questions about things other travelers can't find info on. Takes under 60 seconds per topic.
          </p>
          <button className={styles.scoutBtn} onClick={handlePlayScout}>
            Play Scout Game
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 8H12.5M12.5 8L9 4.5M12.5 8L9 11.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <button className={styles.skipBtn} onClick={handleDone}>
          No thanks, I'm done
        </button>
      </div>
    </div>
  )
}
