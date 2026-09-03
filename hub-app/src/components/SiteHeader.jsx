export default function SiteHeader({ title, subtitle, right }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__brand">
          <img
            src="/assets/logo-madrigal.png"
            alt="Madrigal"
            className="site-header__logo"
          />
          <div className="site-header__text">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
    </header>
  )
}
