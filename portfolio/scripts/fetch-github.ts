/**
 * Pulls the repository list for the GitHub user in content/profile.json and writes
 * src/generated/github.json, which the Builds section merges with content/projects.json.
 *
 * - Without GITHUB_TOKEN only public repositories are visible (that is all the public API returns).
 * - With a fine-grained token (read-only Metadata), private repositories are listed too, so you can
 *   decide per project whether a private repo gets a card. Nothing private is shown unless it also
 *   appears in content/projects.json.
 * - On any network error the previous generated file is kept, so offline builds keep working.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const profile = JSON.parse(readFileSync(resolve(here, '../content/profile.json'), 'utf8')) as {
  github: { user: string }
}
const out = resolve(here, '../src/generated/github.json')

type Repo = {
  full_name: string
  name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  stargazers_count: number
  topics?: string[]
  pushed_at: string
  private: boolean
  fork: boolean
  archived: boolean
}

async function main() {
  const token = process.env.GITHUB_TOKEN
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'pedro-parra-portfolio',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const url = token
    ? 'https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner'
    : `https://api.github.com/users/${profile.github.user}/repos?per_page=100&sort=pushed`

  try {
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const repos = (await res.json()) as Repo[]
    const slim = repos
      .filter((r) => !r.fork)
      .map((r) => ({
        repo: r.full_name,
        name: r.name,
        description: r.description,
        url: r.html_url,
        homepage: r.homepage || null,
        language: r.language,
        stars: r.stargazers_count,
        topics: r.topics ?? [],
        pushedAt: r.pushed_at,
        private: r.private,
        archived: r.archived,
      }))
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, JSON.stringify({ fetchedAt: new Date().toISOString(), repos: slim }, null, 2) + '\n')
    console.log(`github: wrote ${slim.length} repositories (${token ? 'authenticated' : 'public only'})`)
  } catch (err) {
    if (existsSync(out)) {
      console.warn(`github: fetch failed (${(err as Error).message}); keeping the previous ${out}`)
    } else {
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, JSON.stringify({ fetchedAt: null, repos: [] }, null, 2) + '\n')
      console.warn(`github: fetch failed (${(err as Error).message}); wrote an empty list`)
    }
  }
}

main()
