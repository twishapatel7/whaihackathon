import { useNavigate } from 'react-router-dom'
import StarRating from '../components/StarRating'
import styles from './PostCheckoutScreen.module.css'

const HOTEL = {
  name: 'The Westin Copley Place, Boston',
  stars: 4,
  dates: 'Apr 10 – Apr 13, 2025',
}

export default function PostCheckoutScreen() {
  const navigate = useNavigate()

  return (
    <div className={styles.screen}>
      {/* Status bar spacer */}
      <div className={styles.statusBar} />

      {/* Top nav */}
      <header className={styles.header}>
        <ExpediaLogo />
        <button className={styles.signInBtn}>Sign in</button>
      </header>

      {/* Hero area */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L10.163 5.279L15 5.972L11.5 9.323L12.326 14L8 11.779L3.674 14L4.5 9.323L1 5.972L5.837 5.279L8 1Z" fill="#FFD000" stroke="#FFD000" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
          Checkout Complete
        </div>
        <p className={styles.heroSub}>You've just checked out of</p>
        <h1 className={styles.hotelName}>{HOTEL.name}</h1>
        <div className={styles.hotelMeta}>
          <StarRating value={HOTEL.stars} readonly size="sm" />
          <span className={styles.metaDivider}>·</span>
          <span className={styles.dates}>{HOTEL.dates}</span>
        </div>

        {/* Confirmation number */}
        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>Booking</span>
          <span className={styles.confirmCode}>#EXP-2025-88214</span>
        </div>
      </section>

      {/* Illustration strip */}
      <div className={styles.illustrationStrip}>
        <div className={styles.illustrationInner}>
          <HotelIllustration />
        </div>
      </div>

      {/* Review card */}
      <div className={styles.cardWrap}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardIcon}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M4 18L4.5 14.5L13.5 5.5L17.5 9.5L8.5 18.5L5 19L4 18Z" fill="#5B8EFF" opacity="0.3"/>
                <path d="M13 6L17 10M4 18.5L4.5 15L14 5.5L17.5 9L8 18.5L4 18.5Z" stroke="#5B8EFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.cardText}>
              <h3 className={styles.cardTitle}>Share your experience</h3>
              <p className={styles.cardSub}>Help future travelers & earn rewards</p>
            </div>
            <div className={styles.pointsBadge}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L10.163 5.279L15 5.972L11.5 9.323L12.326 14L8 11.779L3.674 14L4.5 9.323L1 5.972L5.837 5.279L8 1Z" fill="#FFD000" stroke="#FFD000" strokeWidth="0.8" strokeLinejoin="round"/>
              </svg>
              <span className={styles.pointsText}>
                Earn up to<br />
                <strong>200 pts</strong>
              </span>
            </div>
          </div>

          <div className={styles.perksRow}>
            <div className={styles.perk}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L7.8 4.6L11 3L9 6L13 7L9 8L11 11L7.8 9.4L7 13L6.2 9.4L3 11L5 8L1 7L5 6L3 3L6.2 4.6L7 1Z" fill="#5B8EFF"/>
              </svg>
              <span>Quick 2-min review</span>
            </div>
            <div className={styles.perk}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#5B8EFF" strokeWidth="1.4"/>
                <path d="M5 7L6.5 8.5L9.5 5.5" stroke="#5B8EFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Redeem for travel</span>
            </div>
          </div>
        </div>

        <button
          className={styles.ctaButton}
          onClick={() => navigate('/review')}
        >
          Leave a Review
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.75 9H14.25M14.25 9L9.75 4.5M14.25 9L9.75 13.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button className={styles.skipButton} onClick={() => {}}>
          Maybe later
        </button>

        <button
          type="button"
          className={styles.guestReviewsLink}
          onClick={() => navigate('/hotel/reviews')}
        >
          See guest reviews
        </button>
      </div>

      <div className={styles.bottomPad} />

      <button
        className={styles.adminLink}
        onClick={() => navigate('/admin')}
      >
        Admin
      </button>
    </div>
  )
}

function ExpediaLogo() {
  return (
    <div className={styles.logo}>
      {/* Expedia yellow icon */}
      <div className={styles.logoIcon}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect width="22" height="22" rx="5" fill="#FFD000"/>
          <path d="M7 11L11 7L15 11M11 7V16" stroke="#0A0E1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className={styles.logoText}>expedia</span>
    </div>
  )
}

function HotelIllustration() {
  return (
    <svg width="430" height="120" viewBox="0 0 430 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyGrad" x1="215" y1="0" x2="215" y2="95" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7dd3fc" />
          <stop offset="0.45" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id="sunGlow" x1="360" y1="28" x2="400" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde047" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Day sky */}
      <rect width="430" height="120" fill="url(#skyGrad)" />
      <circle cx="388" cy="38" r="36" fill="url(#sunGlow)" />
      <circle cx="392" cy="34" r="14" fill="#facc15" />
      {/* Clouds */}
      <ellipse cx="72" cy="28" rx="28" ry="10" fill="#ffffff" opacity="0.85" />
      <ellipse cx="92" cy="26" rx="22" ry="9" fill="#ffffff" opacity="0.75" />
      <ellipse cx="248" cy="22" rx="24" ry="8" fill="#ffffff" opacity="0.7" />
      <ellipse cx="268" cy="20" rx="18" ry="7" fill="#ffffff" opacity="0.65" />
      {/* Side buildings — light stone */}
      <rect x="0" y="52" width="100" height="68" fill="#e2e8f0" rx="2" />
      <rect x="4" y="56" width="92" height="4" fill="#cbd5e1" rx="1" />
      {[0, 1, 2].map(row =>
        [0, 1, 2, 3].map(col => (
          <rect
            key={`L${row}-${col}`}
            x={10 + col * 22}
            y={62 + row * 18}
            width="14"
            height="10"
            fill={(row + col) % 3 === 0 ? '#fef9c3' : '#f1f5f9'}
            rx="1.5"
            opacity="0.95"
          />
        ))
      )}
      {/* Main hotel — warm daylight facade */}
      <rect x="100" y="22" width="230" height="98" fill="#cbd5e1" rx="3" />
      <rect x="104" y="18" width="222" height="8" fill="#94a3b8" rx="2" />
      <rect x="108" y="24" width="214" height="94" fill="#e2e8f0" rx="2" />
      {/* Windows — sky reflections + warm accents */}
      {[0, 1, 2, 3, 4].map(row =>
        [0, 1, 2, 3, 4, 5, 6, 7].map(col => (
          <rect
            key={`${row}-${col}`}
            x={120 + col * 26}
            y={28 + row * 16}
            width="16"
            height="10"
            fill={
              (row === 1 && col === 3) || (row === 3 && col === 5)
                ? '#fbbf24'
                : (row === 2 && col === 1) || (row === 0 && col === 6)
                  ? '#7dd3fc'
                  : '#bae6fd'
            }
            rx="1.5"
            opacity={row === 2 && col === 4 ? 0.35 : 0.92}
          />
        ))
      )}
      {/* Entrance */}
      <path d="M178 88 L252 88 L245 78 L185 78 Z" fill="#60a5fa" opacity="0.55" />
      <rect x="188" y="88" width="54" height="32" fill="#64748b" rx="3" />
      <rect x="194" y="95" width="18" height="25" fill="#475569" rx="2" />
      <rect x="218" y="95" width="18" height="25" fill="#475569" rx="2" />
      <circle cx="210" cy="108" r="2" fill="#38bdf8" />
      {/* Right building */}
      <rect x="330" y="42" width="100" height="78" fill="#e2e8f0" rx="2" />
      <rect x="334" y="46" width="92" height="4" fill="#cbd5e1" rx="1" />
      {[0, 1, 2, 3].map(row =>
        [0, 1, 2, 3].map(col => (
          <rect
            key={`R${row}-${col}`}
            x={338 + col * 22}
            y={52 + row * 16}
            width="14"
            height="10"
            fill={row === 1 && col === 2 ? '#fef08a' : '#dbeafe'}
            rx="1.5"
            opacity="0.95"
          />
        ))
      )}
      {/* Sidewalk */}
      <rect x="0" y="108" width="430" height="12" fill="#e2e8f0" />
      <line x1="0" y1="108" x2="430" y2="108" stroke="#cbd5e1" strokeWidth="1" />
      <circle cx="155" cy="114" r="2" fill="#cbd5e1" />
      <circle cx="275" cy="114" r="2" fill="#cbd5e1" />
      <circle cx="215" cy="115" r="1.5" fill="#94a3b8" />
    </svg>
  )
}
