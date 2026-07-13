import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, onBack, actions }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="safe-top sticky top-0 z-10 bg-brand text-white">
      <div className="flex items-center gap-2 px-3 py-3">
        {onBack !== undefined && (
          <button
            type="button"
            onClick={onBack ?? (() => navigate(-1))}
            aria-label="Zurück"
            className="min-h-11 min-w-11 flex items-center justify-center rounded-lg active:bg-white/20"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm text-white/80">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
    </header>
  )
}
