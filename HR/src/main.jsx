import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Legăturile către logo-ul și tema partajate trăiesc la rădăcina reală a
// site-ului (/assets/...), nu sub /HR/. Le injectăm aici, în JS, ca Vite
// să nu le „rescrie" greșit din cauza base:'/HR/' din vite.config.js.
function injectSharedAsset(rel, href) {
  const link = document.createElement('link')
  link.rel = rel
  link.href = href
  document.head.appendChild(link)
}
injectSharedAsset('icon', '/assets/logo-madrigal.png')
injectSharedAsset('stylesheet', '/assets/tema-shared.css')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
