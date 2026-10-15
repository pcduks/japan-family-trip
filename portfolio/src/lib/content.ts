import profileJson from '../../content/profile.json'
import projectsJson from '../../content/projects.json'
import githubJson from '../generated/github.json'

export type Leg = {
  id: string
  from: string
  to: string
  company: string
  title: string
  city: string
  lat: number
  lon: number
  gate: string
  summary: string
  highlights: string[]
  tags: string[]
}

export type Project = {
  repo: string
  name: string
  kicker: string
  description: string
  stack: string[]
  image?: string
  status: string
  year: string
  tag: string
}

export type Repo = {
  repo: string
  name: string
  description: string | null
  url: string
  homepage: string | null
  language: string | null
  stars: number
  topics: string[]
  pushedAt: string
  private: boolean
  archived: boolean
}

export type Profile = typeof profileJson & { legs: Leg[] }

export const profile = profileJson as Profile
export const projects = projectsJson as Project[]
export const github = githubJson as { fetchedAt: string | null; repos: Repo[] }

export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
