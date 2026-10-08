import { useEffect, useState } from 'react'
import GhidModal from './GhidModal'
import DespreMadrigal from './DespreMadrigal'
import InformatiiUtile from './InformatiiUtile'
import InformatiiResurseUmane from './InformatiiResurseUmane'
import EchipaLista from './EchipaLista'
import LinkuriUtile from './LinkuriUtile'
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

// Deschide un pop-up NOU — adaugă o intrare în istoric, ca butonul
// "Înapoi" să închidă pop-up-ul (nu să te scoată din Hub).
export function deschideGhid(categorie, tab) {
  const hash = tab ? `#ghid/${categorie}/${tab}` : `#ghid/${categorie}`
  window.history.pushState(null, '', hash)
  window.dispatchEvent(new Event('ghid-hash-changed'))
}

// Schimbă tab-ul DIN INTERIORUL unui pop-up deja deschis — înlocuiește
// intrarea curentă din istoric, nu adaugă una nouă. Dacă am adăuga una
// nouă la fiecare click pe tab, ai fi nevoit să apeși "Înapoi" (sau X)
// de mai multe ori ca să închizi pop-up-ul, câte un pas pentru fiecare
// tab vizitat — exact bug-ul raportat.
function schimbaTabGhid(categorie, tab) {
  const hash = tab ? `#ghid/${categorie}/${tab}` : `#ghid/${categorie}`
  window.history.replaceState(null, '', hash)
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
    schimbaTabGhid(categorie.key, tabKey)
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

function ConținutCategorie({ categorie, tab }) {
  if (categorie === 'despre') {
    return <DespreMadrigal />
  }

  if (categorie === 'info') {
    return <InformatiiUtile />
  }

  if (categorie === 'documente') {
    return <InformatiiResurseUmane />
  }

  if (categorie === 'echipa') {
    if (tab === 'linkuri') {
      return <LinkuriUtile />
    }
    return <EchipaLista />
  }

  return null
}
