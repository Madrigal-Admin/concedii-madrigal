import { useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { supabase } from '../../supabaseClient'

// Editor de text cu formatare de bază, folosit în toate secțiunile
// Ghidului angajatului care au nevoie de text formatat (Despre Madrigal,
// Informații utile, Ghid Resurse Umane). Mărime text, bold, italic,
// culoare, aliniere (inclusiv centrare), listă, link și imagine.
//
// Conținutul e salvat ca HTML (în coloana "continut_html" a tabelelor
// ghid_*) — randat cu dangerouslySetInnerHTML în componentele publice,
// cu clasa CSS "ghid-prose" (definită în index.css) ca să arate bine.
//
// Imaginile inserate din editor se încarcă în bucket-ul public
// "ghid-foto" și se introduc ca URL public direct în HTML — nu e nevoie
// de URL-uri semnate, pentru că bucket-ul e public (vezi migration_12).
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, false] }],
  ['bold', 'italic', 'underline'],
  [{ color: [] }, { background: [] }],
  [{ align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image'],
  ['clean'],
]

export default function RichTextEditor({ value, onChange, placeholder }) {
  const quillRef = useRef(null)

  async function handleImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const fisier = input.files?.[0]
      if (!fisier) return

      const editor = quillRef.current?.getEditor()
      const range = editor?.getSelection(true)

      const caleStorage = `${Date.now()}-${fisier.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from('ghid-foto')
        .upload(caleStorage, fisier, { upsert: false })

      if (uploadError) {
        alert('Nu am putut încărca imaginea: ' + uploadError.message)
        return
      }

      const { data } = supabase.storage.from('ghid-foto').getPublicUrl(caleStorage)
      if (editor && range) {
        editor.insertEmbed(range.index, 'image', data.publicUrl)
        editor.setSelection(range.index + 1)
      }
    }
    input.click()
  }

  const modules = {
    toolbar: {
      container: TOOLBAR_OPTIONS,
      handlers: {
        image: handleImage,
      },
    },
  }

  return (
    <div className="rich-text-editor bg-white rounded-lg border border-slate-300 overflow-hidden">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
      />
    </div>
  )
}
