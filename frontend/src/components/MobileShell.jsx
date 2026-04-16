import { Icon } from '@iconify/react'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './MobileShell.module.css'

export default function MobileShell({ children }) {
  return (
    <div className={styles.shell}>
      <div className={styles.device}>
        <div className={styles.content}>
          {children}
        </div>
        <BottomNav />
      </div>
    </div>
  )
}

function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  /** Icon names use the public Iconify API (https://iconify.design/docs/api/) — mdi set */
  const tabs = [
    { label: 'Home', path: '/', icon: 'mdi:home-outline' },
    { label: 'Search', path: null, icon: 'mdi:magnify' },
    { label: 'Trips', path: null, icon: 'mdi:bag-suitcase-outline' },
    { label: 'Inbox', path: null, icon: 'mdi:inbox-outline' },
    { label: 'Account', path: '/dashboard', icon: 'mdi:account-circle-outline' },
  ]

  return (
    <nav className={styles.bottomNav}>
      {tabs.map((tab) => {
        const active = tab.path !== null && (
          tab.path === '/' ? path === '/' : path.startsWith(tab.path)
        )
        return (
          <button
            key={tab.label}
            type="button"
            className={`${styles.navTab} ${active ? styles.navTabActive : ''}`}
            onClick={() => tab.path && navigate(tab.path)}
            aria-label={tab.label}
          >
            <span className={styles.navIcon} aria-hidden="true">
              <Icon icon={tab.icon} width={24} height={24} />
            </span>
            <span className={styles.navLabel}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
