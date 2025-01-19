export default function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-start text-2xl font-bold capitalize">{q}</p>
      <p className="text-start">{a}</p>
    </div>
  );
}
