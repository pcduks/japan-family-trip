import { profile } from '../lib/content'

export default function About() {
  return (
    <section className="section about" id="about">
      <div className="section__head">
        <span className="section__num">01</span>
        <h2>About me</h2>
      </div>
      <div className="about__grid">
        <div className="about__text">
          {profile.intro.map((p, i) => (
            <p key={i} className={i === 0 ? 'lede' : ''}>
              {p}
            </p>
          ))}
        </div>
        <aside className="now">
          <h3>
            <span className="now__pulse" /> In flight
          </h3>
          <ul>
            {profile.now.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}
