export default function SiteHeader({ title, subtitle, right }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__left">
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
