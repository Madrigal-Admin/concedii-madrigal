import { ArrowLeft } from 'lucide-react'

export default function SiteHeader({ title, subtitle, right, onBack }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__left">
          {onBack && (
            <button type="button" onClick={onBack} className="hub-back" title="Înapoi la Hub">
              <ArrowLeft size={15} />
              Hub
            </button>
          )}
          <img
            src="/assets/logo-madrigal.png"
            alt="Madrigal"
            className="site-header__logo"
          />
        </div>
        <div className="site-header__center">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="site-header__right">{right}</div>
      </div>
    </header>
  )
}
