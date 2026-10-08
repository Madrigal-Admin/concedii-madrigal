import { BookOpen, Users, HelpCircle, ClipboardList } from 'lucide-react'

// Metadata celor 4 categorii ale Ghidului angajatului — un singur loc de
// adevăr pentru: cheia din hash (#ghid/<key>), textul din panou, iconița,
// și (pentru Echipa) sub-tab-urile interne.
//
// Adăugarea unei categorii noi în viitor (ex: "Noutăți") înseamnă doar un
// rând nou aici + un fișier de conținut — panoul și router-ul se adaptează
// automat.
export const CATEGORII_GHID = [
  {
    key: 'despre',
    label: 'Despre Madrigal',
    icon: BookOpen,
  },
  {
    // Doar organigrama — tab-ul "Linkuri utile" a fost scos de aici,
    // conținutul lui s-a mutat în "Informații utile".
    key: 'echipa',
    label: 'Echipa Madrigal',
    icon: Users,
  },
  {
    key: 'info',
    label: 'Informații utile',
    icon: HelpCircle,
  },
  {
    // cheia internă rămâne "documente" (nefolosită în interfață, doar în
    // adresa #ghid/documente) ca să nu rupem eventuale legături deja
    // partajate — doar eticheta și conținutul s-au schimbat.
    key: 'documente',
    label: 'Ghid Resurse Umane',
    icon: ClipboardList,
  },
]

export function gasesteCategorie(key) {
  return CATEGORII_GHID.find((c) => c.key === key)
}
