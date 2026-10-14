export default function ComingSoon({ titlu, text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-medium text-slate-700">{titlu}</p>
      <p className="mt-1 text-sm text-slate-500">{text || 'Această secțiune urmează să fie construită.'}</p>
    </div>
  )
}
