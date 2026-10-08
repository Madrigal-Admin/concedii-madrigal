import { useEffect, useState } from 'react'
import GhidModal from './GhidModal'
import PlaceholderContinut from './PlaceholderContinut'
import { gasesteCategorie } from './categorii'

// Citește hash-ul curent și-l transformă în { categorie, tab }.
// Format: #ghid/<categorie>  sau  #ghid/<categorie>/<tab>
function citesteHash() {
  const hash = window.location.hash // ex: "#ghid/echipa/organigrama"
  if (!hash.startsWith('#ghid/')) return null

  const parti = hash.slice('#ghid/'.length).split('/')
  const [categorie, tab] = parti
  return { categorie, tab: tab || null }
}

// Navighează la un pop-up (sau la un tab anume dintr-un pop-up), scriind
// un hash propriu în adresă — fiecare pop-up are adresa lui, partajabilă,
// și butonul "Înapoi" al browserului/telefonului îl închide fără să te
// scoată din Hub.
export function deschideGhid(categorie, tab) {
  const hash = tab ? `#ghid/${categorie}/${tab}` : `#ghid/${categorie}`
  window.history.pushState(null, '', hash)
  window.dispatchEvent(new Event('ghid-hash-changed'))
}

function inchideGhid() {
  // Mergem înapoi în istoric dacă ultima intrare a fost chiar acest
  // pop-up (cazul normal), altfel doar golim hash-ul — evită să scoți
  // utilizatorul din Hub dacă a ajuns direct pe un link cu #ghid/...
  if (window.location.hash.startsWith('#ghid/')) {
    window.history.back()
  }
}

// Montat o singură dată, în Dashboard. Ascultă hash-ul și afișează
// pop-up-ul corect, cu tab-urile lui, peste orice e dedesubt.
export default function GhidRouter() {
  const [stare, setStare] = useState(citesteHash)

  useEffect(() => {
    function actualizeaza() {
      setStare(citesteHash())
    }
    window.addEventListener('popstate', actualizeaza)
    window.addEventListener('ghid-hash-changed', actualizeaza)
    return () => {
      window.removeEventListener('popstate', actualizeaza)
      window.removeEventListener('ghid-hash-changed', actualizeaza)
    }
  }, [])

  if (!stare) return null

  const categorie = gasesteCategorie(stare.categorie)
  if (!categorie) return null

  const tabActiv = stare.tab || categorie.tabs?.[0]?.key || null

  function handleTabChange(tabKey) {
    deschideGhid(categorie.key, tabKey)
  }

  return (
    <GhidModal
      title={categorie.label}
      icon={categorie.icon}
      tabs={categorie.tabs}
      activeTab={tabActiv}
      onTabChange={handleTabChange}
      onClose={inchideGhid}
    >
      <ConținutCategorie categorie={categorie.key} tab={tabActiv} />
    </GhidModal>
  )
}

// Pentru Etapa 1 arătăm, pentru fiecare categorie (și, la Echipa, pentru
// fiecare tab), un "placeholder" care confirmă că structura de date e
// pregătită — conținutul final vine la etapa lui, din ordinea stabilită.
function ConținutCategorie({ categorie, tab }) {
  if (categorie === 'despre') {
    return <PlaceholderContinut table="ghid_despre_blocuri" etapa="Etapa 5" />
  }

  if (categorie === 'info') {
    return <PlaceholderContinut table="ghid_intrebari" etapa="Etapa 5" />
  }

  if (categorie === 'documente') {
    return <PlaceholderContinut table="ghid_documente" etapa="Etapa 2" />
  }

  if (categorie === 'echipa') {
    if (tab === 'echipa') {
      return <PlaceholderContinut table="ghid_echipa_public" etapa="Etapa 3" />
    }
    if (tab === 'linkuri') {
      return <PlaceholderContinut table="ghid_linkuri_utile" etapa="Etapa 3" />
    }
    return <PlaceholderContinut table="departments" etapa="Etapa 4" />
  }

  return null
}
