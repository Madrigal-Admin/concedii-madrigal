export default function ComingSoon({ title }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">Această secțiune vine într-o rundă următoare.</p>
    </div>
  )
}
