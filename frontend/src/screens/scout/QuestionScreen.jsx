import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { generateQuestion } from '../../utils/openai'
import { addPoints } from '../../utils/points'
import { saveSubmission } from '../../storage/submissions'
import styles from './QuestionScreen.module.css'

const PROPERTY_NAME = 'Art Deco Hotel, Frisco TX'

export default function QuestionScreen() {
  const navigate = useNavigate()
  const { state = {} } = useLocation()
  const {
    mode = 'question',
    categories = [],
    currentCategoryIndex = 0,
    completedCategories = [],
    previousAnswer = null,
  } = state

  const category = categories[currentCategoryIndex] ?? {}
  const isFollowup = mode === 'followup'
  const isLastCategory = currentCategoryIndex + 1 >= categories.length

  const [questionData, setQuestionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedChip, setSelectedChip] = useState(null)
  const [showTextInput, setShowTextInput] = useState(false)
  const [ownAnswer, setOwnAnswer] = useState('')

  // Re-fetch whenever the category or question step changes.
  // category.label and isFollowup together uniquely identify what to ask.
  useEffect(() => {
    setLoading(true)
    setSelectedChip(null)
    setShowTextInput(false)
    setOwnAnswer('')
    generateQuestion(
      category.label,
      category.gapReason,
      isFollowup ? previousAnswer : null,
      PROPERTY_NAME
    ).then(data => {
      setQuestionData(data)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.label, isFollowup])

  const currentAnswer = showTextInput ? ownAnswer.trim() : (selectedChip ?? '')
  const canSubmit = currentAnswer.length > 0

  function advance(answer) {
    if (answer !== '(skipped)') {
      saveSubmission({
        type: 'gap_answer',
        timestamp: new Date().toISOString(),
        propertyName: 'Art Deco Hotel, Frisco TX',
        category: category.label,
        question: questionData?.question ?? '',
        answer,
        isCustomAnswer: showTextInput,
        pointsEarned: 50,
      })
    }

    if (!isFollowup) {
      // Screen 5 → Screen 6 (follow-up for the same category)
      navigate('/review/text/question', {
        state: {
          mode: 'followup',
          categories,
          currentCategoryIndex,
          completedCategories,
          previousAnswer: answer,
        },
      })
      return
    }

    // Follow-up complete — record this category's answers
    const newCompleted = [
      ...completedCategories,
      {
        label: category.label,
        icon: category.icon,
        answer1: previousAnswer,
        answer2: answer,
      },
    ]

    if (!isLastCategory) {
      // Move to first question of the next category
      navigate('/review/text/question', {
        state: {
          mode: 'question',
          categories,
          currentCategoryIndex: currentCategoryIndex + 1,
          completedCategories: newCompleted,
          previousAnswer: null,
        },
      })
    } else {
      // All categories done — award points and go to payoff
      const gamePts = newCompleted.length * 50 + (newCompleted.length > 1 ? 25 : 0)
      addPoints(gamePts)
      navigate('/review/text/payoff', {
        state: { completedCategories: newCompleted },
      })
    }
  }

  const submitLabel =
    isFollowup && isLastCategory ? 'Finish & See Results' : 'Submit Answer'

  return (
    <div className={styles.screen}>
      <div className={styles.statusBar} />

      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 17L8 11L14 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={styles.headerCenter}>
          <span className={styles.headerCategory}>
            {category.label}
          </span>
          <div className={styles.progressRow}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: isFollowup ? '100%' : '50%' }}
              />
            </div>
            <span className={styles.progressLabel}>
              {isFollowup ? '2' : '1'} of 2
            </span>
          </div>
        </div>
        <div className={styles.headerRight} />
      </header>

      <div className={styles.content}>
        {/* "You said" context chip — only on follow-up, only when they actually answered */}
        {isFollowup && previousAnswer && previousAnswer !== '(skipped)' && (
          <div className={styles.previousChip}>
            <span className={styles.previousLabel}>You said:</span>
            <span className={styles.previousText}>{previousAnswer}</span>
          </div>
        )}

        {/* Scout question bubble — shows loading state inline */}
        <div className={styles.bubbleWrap}>
          <span className={styles.bubbleLabel}><span className={styles.scoutDot} />SCOUT</span>
          <div className={styles.bubble}>
            {loading ? (
              <div className={styles.thinkingRow}>
                <div className={styles.loadingDots}>
                  <span /><span /><span />
                </div>
                <span className={styles.thinkingText}>Scout is thinking…</span>
              </div>
            ) : (
              <p className={styles.bubbleQuestion}>{questionData?.question}</p>
            )}
          </div>
        </div>

        {/* Answer area — hidden while loading */}
        {!loading && (
          !showTextInput ? (
            <>
              <div className={styles.chips}>
                {questionData?.chips.map((chip, i) => (
                  <button
                    key={i}
                    className={`${styles.chip} ${selectedChip === chip ? styles.chipSelected : ''}`}
                    onClick={() => setSelectedChip(prev => prev === chip ? null : chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className={styles.orDivider}>
                <div className={styles.orLine} />
                <span className={styles.orText}>or</span>
                <div className={styles.orLine} />
              </div>

              <button
                className={styles.ownWordsBtn}
                onClick={() => { setShowTextInput(true); setSelectedChip(null) }}
              >
                Describe in your own words
              </button>
            </>
          ) : (
            <div className={styles.ownWordsArea}>
              <textarea
                className={styles.textarea}
                placeholder="Type your answer here..."
                value={ownAnswer}
                onChange={e => setOwnAnswer(e.target.value)}
                rows={4}
                autoFocus
              />
              <button
                className={styles.ownWordsBack}
                onClick={() => { setShowTextInput(false); setOwnAnswer('') }}
              >
                ← Use quick answers instead
              </button>
            </div>
          )
        )}
      </div>

      <div className={styles.footer}>
        <button
          className={styles.submitBtn}
          onClick={() => advance(currentAnswer)}
          disabled={!canSubmit || loading}
        >
          {submitLabel}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8H12.5M12.5 8L9 4.5M12.5 8L9 11.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className={styles.skipBtn} onClick={() => advance('(skipped)')}>
          Skip this question
        </button>
      </div>
    </div>
  )
}
