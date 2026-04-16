import { useState } from 'react'
import styles from './StarRating.module.css'

export default function StarRating({ value = 0, onChange, size = 'md', readonly = false }) {
  const [hovered, setHovered] = useState(0)

  const active = hovered || value

  return (
    <div
      className={`${styles.stars} ${styles[size]} ${readonly ? styles.readonly : ''}`}
      onMouseLeave={() => !readonly && setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`${styles.star} ${active >= star ? styles.filled : styles.empty}`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          aria-label={`${star} star`}
          disabled={readonly}
        >
          ★
        </button>
      ))}
    </div>
  )
}
