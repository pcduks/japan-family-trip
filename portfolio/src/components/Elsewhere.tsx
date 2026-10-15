import { profile, asset } from '../lib/content'

export default function Elsewhere() {
  return (
    <footer className="section contact" id="contact">
      <div className="section__head">
        <span className="section__num">05</span>
        <h2>Say olá</h2>
      </div>
      <p className="contact__lede">
        I'm always happy to talk about agentic systems that do real work, go-to-market in Asia, or where to eat in Tokyo in
        December. The fastest route is email.
      </p>
      <ul className="contact__links">
        {profile.links.map((l) => (
          <li key={l.href}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
        {__CV_AVAILABLE__ && (
          <li>
            <a href={asset(profile.cv.file)} download>
              {profile.cv.label}
            </a>
          </li>
        )}
      </ul>
      <p className="colophon">
        Built with React and three.js, with an unreasonable amount of care. Illustrations generated with Gemini, prompted
        by me. The land dots are Natural Earth data. Inspired by{' '}
        <a href="https://felixrieseberg.com/about-me/">Felix Rieseberg</a>'s belief that personal sites should still be
        fun.
      </p>
    </footer>
  )
}
