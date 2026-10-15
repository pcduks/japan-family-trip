import { projects, github, profile, asset, type Project } from '../lib/content'

export default function Builds() {
  const featured = new Set(projects.map((p) => p.repo))
  const more = github.repos.filter((r) => !featured.has(r.repo) && !r.archived)
  return (
    <section className="section builds" id="builds">
      <div className="section__head">
        <span className="section__num">03</span>
        <h2>Things I build</h2>
        <p className="section__sub">
          I have a weakness for building the thing instead of the spreadsheet about the thing. Most of it is for family and
          friends, some of it is for me, all of it is more elaborate than it needs to be.
        </p>
      </div>
      <ul className="tags">
        {projects.map((p) => (
          <li key={p.repo}>
            <LuggageTag project={p} />
          </li>
        ))}
      </ul>
      {more.length > 0 && (
        <div className="more">
          <h3>Also on GitHub</h3>
          <ul>
            {more.map((r) => (
              <li key={r.repo}>
                <a href={r.url}>{r.name}</a>
                {r.description && <span> — {r.description}</span>}
                {r.language && <span className="more__lang">{r.language}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="builds__foot">
        The full, unfiltered list lives on{' '}
        <a href={`https://github.com/${profile.github.user}`}>GitHub</a>.
      </p>
    </section>
  )
}

function LuggageTag({ project }: { project: Project }) {
  const repo = github.repos.find((r) => r.repo === project.repo)
  const isPublic = repo ? !repo.private : project.status !== 'Private'
  const href = isPublic ? `https://github.com/${project.repo}` : undefined
  return (
    <article className="tag">
      <div className="tag__hole" aria-hidden="true" />
      {project.image && (
        <div className="tag__art">
          <img src={asset(project.image)} alt="" loading="lazy" width={1200} height={896} />
        </div>
      )}
      <div className="tag__body">
        <div className="tag__meta">
          <span className="tag__code">{project.tag}</span>
          <span className="tag__status">{project.status}</span>
          <span className="tag__year">{project.year}</span>
        </div>
        <h3>{project.name}</h3>
        <p className="tag__kicker">{project.kicker}</p>
        <p>{project.description}</p>
        <ul className="chips">
          {project.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {href ? (
          <a className="tag__link" href={href}>
            View on GitHub <span aria-hidden="true">→</span>
          </a>
        ) : (
          <span className="tag__link tag__link--muted">Private repository</span>
        )}
      </div>
    </article>
  )
}
