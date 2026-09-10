export function PublicHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__left">
          <img src="/assets/logo-madrigal.png" alt="Madrigal" className="site-header__logo" />
        </div>
        <div className="site-header__center">
          <h1>Corul Madrigal</h1>
          <p>Invitații &amp; evenimente</p>
        </div>
        <div className="site-header__right" />
      </div>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="site-footer">
      <p>
        Probleme sau întrebări?{' '}
        <a href="mailto:digitalizare@madrigal.ro">digitalizare@madrigal.ro</a>
      </p>
    </footer>
  )
}

export function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <PublicFooter />
    </div>
  )
}
