import { profile } from '../lib/content'

export default function Toolkit() {
  const t = profile.toolkit
  return (
    <section className="section toolkit" id="toolkit">
      <div className="section__head">
        <span className="section__num">04</span>
        <h2>Cargo manifest</h2>
        <p className="section__sub">What I bring on board.</p>
      </div>
      <div className="manifest">
        <Column title="Building" items={t.building} />
        <Column title="Leading" items={t.leading} />
        <Column title="Certified in" items={t.certifications} />
        <Column title="Languages" items={t.languages} />
      </div>
    </section>
  )
}

function Column({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="manifest__col">
      <h3>{title}</h3>
      <ul>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}
