import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './VoiceScreen.module.css'

// Next.js backend URL — set VITE_BACKEND_URL in .env.development
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '')

export default function VoiceScreen() {
  const navigate = useNavigate()
  const { state = {} } = useLocation()
  const hotelName = state?.hotel?.name || 'Grand Plaza Hotel'

  // idle | entering | calling | sent | error
  const [phase, setPhase] = useState('idle')
  const [phone, setPhone] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  function toE164(raw) {
    // Strip everything except digits and leading +
    let digits = raw.replace(/[^\d+]/g, '')
    // If it starts with + already, leave it alone
    if (digits.startsWith('+')) return digits
    // US/Canada: 10 digits → prepend +1
    if (digits.length === 10) return `+1${digits}`
    // 11 digits starting with 1 → prepend +
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
    // Otherwise return as-is and let Vapi validate
    return digits
  }

  async function handleCall() {
    const cleaned = toE164(phone.trim())
    if (!cleaned) return
    setPhase('calling')
    setErrorMsg('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/vapi/outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleaned, hotelName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setPhase('sent')
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setPhase('error')
    }
  }

  if (phase === 'sent') {
    return <SentScreen navigate={navigate} hotelName={hotelName} />
  }

  return (
    <div className={styles.screen}>
      <div className={styles.statusBar} />

      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 17L8 11L14 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 className={styles.headerTitle}>Voice Review</h2>
        <div className={styles.headerRight} />
      </header>

      {phase === 'idle' && <IdleView onStart={() => setPhase('entering')} />}
      {phase === 'entering' && (
        <EnteringView
          phone={phone}
          setPhone={setPhone}
          onSubmit={handleCall}
          onBack={() => setPhase('idle')}
          hotelName={hotelName}
        />
      )}
      {phase === 'calling' && <ConnectingView />}
      {phase === 'error' && <ErrorView msg={errorMsg} onRetry={() => setPhase('entering')} />}
    </div>
  )
}

// ─── Idle ────────────────────────────────────────────────────────────────────

function IdleView({ onStart }) {
  return (
    <div className={styles.idleContent}>
      <div className={styles.idleIllustration}>
        <div className={styles.idleOrb}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect x="13" y="4" width="10" height="18" rx="5" stroke="white" strokeWidth="2"/>
            <path d="M7 18C7 24.075 11.925 29 18 29C24.075 29 29 24.075 29 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M18 29V33M14 33H22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className={styles.idleRing1} />
        <div className={styles.idleRing2} />
      </div>

      <h2 className={styles.idleTitle}>Talk to our AI</h2>
      <p className={styles.idleSub}>
        We'll call you directly — answer 2 short questions about your stay. Takes about 2 minutes.
      </p>

      <div className={styles.idleFeatures}>
        <div className={styles.idleFeature}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="#8896B0" strokeWidth="1.4"/>
            <path d="M8 5V8.5L10 10" stroke="#8896B0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>~2 minutes</span>
        </div>
        <div className={styles.idleFeature}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.8 5.4L14.5 5.9L11 9L12.1 13.5L8 11.1L3.9 13.5L5 9L1.5 5.9L6.2 5.4L8 1Z" fill="#FFD000" strokeWidth="0.5" stroke="#FFD000"/>
          </svg>
          <span>Earn 100 pts</span>
        </div>
        <div className={styles.idleFeature}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="#8896B0" strokeWidth="1.4"/>
            <path d="M5 7V5C5 3.34 6.34 2 8 2C9.66 2 11 3.34 11 5V7" stroke="#8896B0" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="8" cy="11" r="1" fill="#8896B0"/>
          </svg>
          <span>Private & secure</span>
        </div>
      </div>

      <button className={styles.callBtn} onClick={onStart}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5.5 8.7C6.2 10.3 7.7 11.7 9.5 12.5L10.9 11.1C11.1 10.9 11.4 10.8 11.7 10.9C12.5 11.2 13.4 11.3 14.3 11.3C14.7 11.3 15 11.6 15 12V14.5C15 14.9 14.7 15.2 14.3 15.2C8.3 15.2 3.5 10.4 3.5 4.4C3.5 4 3.8 3.7 4.2 3.7H6.7C7.1 3.7 7.4 4 7.4 4.4C7.4 5.3 7.5 6.2 7.8 7C7.9 7.3 7.8 7.6 7.6 7.8L5.5 8.7Z" fill="white"/>
        </svg>
        Start Voice Review
      </button>
      <p className={styles.callDisclaimer}>By continuing, you consent to AI voice processing</p>
    </div>
  )
}

// ─── Phone number entry ───────────────────────────────────────────────────────

function EnteringView({ phone, setPhone, onSubmit, onBack, hotelName }) {
  return (
    <div className={styles.idleContent}>
      <div className={styles.idleIllustration}>
        <div className={styles.idleOrb}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M10 10.5C11.2 13 13.3 15.1 15.8 16.4L17.6 14.5C17.9 14.2 18.3 14.1 18.6 14.3C19.8 14.7 21.1 14.9 22.4 14.9C23 14.9 23.5 15.4 23.5 16V19.4C23.5 20 23 20.5 22.4 20.5C13.5 20.5 6.2 13.2 6.2 4.3C6.2 3.7 6.7 3.2 7.3 3.2H10.7C11.3 3.2 11.8 3.7 11.8 4.3C11.8 5.6 12 6.9 12.4 8.1C12.5 8.4 12.4 8.8 12.2 9.1L10 10.5Z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        <div className={styles.idleRing1} />
        <div className={styles.idleRing2} />
      </div>

      <h2 className={styles.idleTitle}>Enter your number</h2>
      <p className={styles.idleSub}>
        Our AI will call you at this number for a quick review of {hotelName}.
      </p>

      <div style={{ width: '100%', maxWidth: 320, marginBottom: 16 }}>
        <input
          type="tel"
          placeholder="10-digit US number or +1XXXXXXXXXX"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          autoFocus
          style={{
            width: '100%',
            padding: '13px 16px',
            fontSize: 18,
            borderRadius: 'var(--r-md)',
            border: '2px solid var(--border-2)',
            background: 'var(--surface)',
            color: 'var(--text-1)',
            outline: 'none',
            letterSpacing: '0.02em',
            textAlign: 'center',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <button
        className={styles.callBtn}
        onClick={onSubmit}
        disabled={phone.trim().length < 7}
        style={{ marginBottom: 10 }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5.5 8.7C6.2 10.3 7.7 11.7 9.5 12.5L10.9 11.1C11.1 10.9 11.4 10.8 11.7 10.9C12.5 11.2 13.4 11.3 14.3 11.3C14.7 11.3 15 11.6 15 12V14.5C15 14.9 14.7 15.2 14.3 15.2C8.3 15.2 3.5 10.4 3.5 4.4C3.5 4 3.8 3.7 4.2 3.7H6.7C7.1 3.7 7.4 4 7.4 4.4C7.4 5.3 7.5 6.2 7.8 7C7.9 7.3 7.8 7.6 7.6 7.8L5.5 8.7Z" fill="white"/>
        </svg>
        Call Me Now
      </button>

      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', color: 'var(--text-2)',
          fontSize: 14, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        ← Back
      </button>
    </div>
  )
}

// ─── Connecting spinner ───────────────────────────────────────────────────────

function ConnectingView() {
  return (
    <div className={styles.connectingContent}>
      <div className={styles.connectingOrb}>
        <div className={styles.connectingSpinner} />
        <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
          <rect x="13" y="4" width="10" height="18" rx="5" stroke="white" strokeWidth="2"/>
          <path d="M7 18C7 24.075 11.925 29 18 29C24.075 29 29 24.075 29 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <path d="M18 29V33M14 33H22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h3 className={styles.connectingTitle}>Connecting…</h3>
      <p className={styles.connectingSub}>Setting up your AI call</p>
    </div>
  )
}

// ─── Call placed ──────────────────────────────────────────────────────────────

function SentScreen({ navigate, hotelName }) {
  return (
    <div className={styles.doneScreen}>
      <div className={styles.statusBar} />
      <div className={styles.doneContent}>
        <div className={styles.doneIcon}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M9 18L15.5 24.5L27 12" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 className={styles.doneTitle}>Calling you now!</h2>
        <p className={styles.doneSub}>Pick up your phone — it's our AI calling about {hotelName}</p>

        <div className={styles.transcriptSummary}>
          <p className={styles.transcriptSummaryLabel}>How it works</p>
          <p className={styles.transcriptSummaryText}>
            Our AI will ask you 2–3 short questions about your stay. Answer naturally — the whole call takes about 2 minutes and your points are awarded automatically.
          </p>
        </div>

        <div style={{ width: '100%', marginBottom: 24 }}>
          <div style={{
            padding: '16px 24px', background: 'rgba(255,208,0,0.10)',
            border: '2px solid #FFD000', borderRadius: 16,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.4 8.3L21 8.9L16.2 13.1L17.8 19.5L12 16.3L6.2 19.5L7.8 13.1L3 8.9L9.6 8.3L12 2Z" fill="#FFD000" stroke="#FFD000" strokeWidth="0.6" strokeLinejoin="round"/>
            </svg>
            <div>
              <div className={styles.ptsCardLabel}>Points you'll earn</div>
              <div className={styles.ptsCardValue}>+100 pts</div>
            </div>
          </div>
        </div>

        <div className={styles.doneActions}>
          <button className={styles.primaryBtn} onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Error ────────────────────────────────────────────────────────────────────

function ErrorView({ msg, onRetry }) {
  return (
    <div className={styles.idleContent}>
      <div className={styles.idleIllustration}>
        <div className={styles.idleOrb} style={{ background: '#dc2626' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M11 11L25 25M25 11L11 25" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <h2 className={styles.idleTitle}>Call failed</h2>
      <p className={styles.idleSub}>{msg}</p>
      <button className={styles.callBtn} onClick={onRetry} style={{ marginTop: 8 }}>
        Try again
      </button>
    </div>
  )
}
