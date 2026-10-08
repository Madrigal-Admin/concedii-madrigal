// Afișează HTML salvat din RichTextEditor (vezi acel fișier). Conținutul
// e scris EXCLUSIV din Admin Hub (acces restricționat la is_hub_admin),
// deci e sigur să-l randăm direct.
export default function RichTextContent({ html, className = '' }) {
  if (!html) return null
  return (
    <div
      className={`ghid-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
