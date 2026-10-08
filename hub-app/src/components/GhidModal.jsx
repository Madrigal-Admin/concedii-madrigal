import { useEffect, useRef } from 'react'
import { X, ArrowLeft } from 'lucide-react'

// Structura (shell) comună pentru toate pop-up-urile din "Ghidul
// angajatului". Fiecare categorie (Despre, Echipa, Info, Documente)
// trimite doar titlul, tab-urile (opțional) și conținutul — restul
// (overlay, focus, Esc, click-în-afară, fullscreen pe mobil) e aici,
// o singură dată, ca toate pop-up-urile să se comporte identic.
//
// Props:
//   title        - titlul afișat sus, fix
//   icon         - componenta de iconiță (din lucide-react) afișată lângă titlu
//   tabs         - opțional: [{ key, label }] — dacă lipsește, nu arată tab-uri
//   activeTab    - key-ul tab-ului activ
//   onTabChange  - (key) => void
//   onClose      - () => void — apelat la X / săgeată înapoi / Esc / click în afară
//   children     - conținutul (scrollabil)
export default function GhidModal({ title, icon: Icon, tabs, activeTab, onTabChange, onClose, children }) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previouslyFocusedRef = useRef(null)

  // La montare: reținem ce era focalizat înainte (ca să revenim la
  // închidere), blocăm scroll-ul paginii din spate, și punem focusul pe
  // butonul de închidere.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      if (previouslyFocusedRef.current && previouslyFocusedRef.current.focus) {
        previouslyFocusedRef.current.focus()
      }
    }
  }, [])

  // Esc închide; Tab/Shift+Tab rămân "prinse" în interiorul pop-up-ului
  // (focus trap) — nu poți ajunge cu tastatura în pagina din spate.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleBackdropClick(e) {
    // Închidem doar dacă s-a dat click direct pe overlay, nu pe conținut.
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center sm:p-6"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white w-full h-full sm:h-[85vh] sm:max-w-3xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header fix — titlu, tab-uri, buton de închidere */}
        <div className="flex-shrink-0 border-b border-slate-200">
          <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 pb-2">
            {/* Un singur buton real — iconița se schimbă cu ecranul:
                săgeată înapoi pe mobil (fullscreen), X pe desktop. Un
                singur buton, ca focusul inițial și focus trap-ul să
                funcționeze identic pe orice mărime de ecran. */}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Închide"
              className="order-1 sm:order-2 -ml-2 sm:-ml-0 sm:-mr-2 w-11 h-11 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-ring transition flex-shrink-0"
            >
              <ArrowLeft size={20} className="sm:hidden" />
              <X size={20} className="hidden sm:block" />
            </button>

            <div className="order-2 sm:order-1 flex-1 flex items-center gap-3 min-w-0">
              {Icon && (
                <span className="hidden sm:flex w-10 h-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon size={19} />
                </span>
              )}
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate">
                {title}
              </h2>
            </div>
          </div>

          {tabs && tabs.length > 0 && (
            <div className="flex gap-1 px-2 sm:px-4 overflow-x-auto" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={activeTab === t.key}
                  onClick={() => onTabChange?.(t.key)}
                  className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    activeTab === t.key
                      ? 'border-accent text-accent'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conținut scrollabil */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
