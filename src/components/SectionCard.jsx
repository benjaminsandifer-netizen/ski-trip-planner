export default function SectionCard({ title, emoji, children }) {
  return (
    <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/50">
      <h2 className="text-2xl font-bold text-sky-900 mb-4 flex items-center gap-2">
        {emoji && <span>{emoji}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}
