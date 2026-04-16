import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addPoints } from '../utils/points'
import { saveSubmission } from '../storage/submissions'
import styles from './TextReviewFlow.module.css'

const HOTEL = { name: 'Art Deco Hotel', location: 'Frisco, TX' }

export default function TextReviewFlow() {
  const navigate = useNavigate()
  const [reviewText, setReviewText] = useState('')

  function handleSubmit() {
    saveSubmission({
      type: 'full_review',
      timestamp: new Date().toISOString(),
      propertyName: 'Art Deco Hotel, Frisco TX',
      reviewText,
      pointsEarned: 100,
    })
    addPoints(100)
    navigate('/review/text/points', { state: { reviewText } })
  }

  return (
    <div className={styles.screen}>
      <div className={styles.statusBar} />

      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 17L8 11L14 5" stroke="#5B8EFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 className={styles.headerTitle}>Write a Review</h2>
        <div className={styles.headerRight} />
      </header>

      {/* Rewards banner */}
      <div className={styles.rewardsBanner}>
        <span className={styles.rewardsMedal}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1L11.1 6.1L16.5 6.6L12.5 10L13.8 15.3L9 12.5L4.2 15.3L5.5 10L1.5 6.6L6.9 6.1L9 1Z" fill="#FFD000" stroke="#FFD000" strokeWidth="0.8" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className={styles.rewardsText}>
          Earn <strong>100 pts</strong> just for submitting your review
        </span>
      </div>

      <div className={styles.scrollable}>
        {/* Hotel chip */}
        <div className={styles.hotelChip}>
          <span className={styles.hotelChipIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="7" width="16" height="11" rx="1.5" stroke="#8896B0" strokeWidth="1.5"/>
              <path d="M6 18V13H9V18M11 18V13H14V18" stroke="#8896B0" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M2 10L10 4L18 10" stroke="#8896B0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div className={styles.hotelChipInfo}>
            <span className={styles.hotelName}>{HOTEL.name}</span>
            <span className={styles.hotelLocation}>{HOTEL.location}</span>
          </div>
        </div>

        {/* Review input */}
        <div className={styles.inputSection}>
          <label className={styles.inputLabel} htmlFor="review">
            Share your experience
          </label>
          <textarea
            id="review"
            className={styles.textarea}
            placeholder="What made your stay memorable? How was the service, room, or amenities?"
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            rows={6}
            maxLength={600}
            autoFocus
          />
          <div className={styles.charCount}>{reviewText.length} / 600</div>
        </div>

        {/* Scout game teaser */}
        <div className={styles.scoutTeaser}>
          <div className={styles.scoutTeaserTop}>
            <div className={styles.scoutBadge}>
              <span className={styles.scoutDot} />
              SCOUT
            </div>
            <span className={styles.scoutPtsChip}>+50 pts per topic</span>
          </div>
          <h3 className={styles.scoutTeaserTitle}>Want to earn even more?</h3>
          <p className={styles.scoutTeaserDesc}>
            After submitting, play a quick game to fill gaps other travelers are wondering about — pool hours, shuttle, pet policy, and more.
          </p>
          <div className={styles.scoutTopicPills}>
            <span className={styles.topicPill}>Pool</span>
            <span className={styles.topicPill}>Shuttle</span>
            <span className={styles.topicPill}>Pet Policy</span>
            <span className={styles.topicPill}>Parking</span>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={reviewText.trim().length === 0}
        >
          Submit Review
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.75 9H14.25M14.25 9L9.75 4.5M14.25 9L9.75 13.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <p className={styles.footerNote}>Your review is shared publicly on Expedia</p>
      </div>
    </div>
  )
}
