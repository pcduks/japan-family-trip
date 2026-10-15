/**
 * Turns a CV (PDF) into a draft of content/profile.json using Gemini.
 *
 *   GEMINI_API_KEY=... npm run import-cv -- public/cv/Pedro-Parra-CV.pdf
 *
 * It never overwrites profile.json. It writes content/profile.draft.json so you can diff, keep the
 * voice you like, and copy across what changed. Coordinates for each leg are looked up from a small
 * city table; anything unknown falls back to Singapore and is flagged in the console.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const key = process.env.GEMINI_API_KEY
const file = process.argv[2]
if (!key) throw new Error('Set GEMINI_API_KEY (see .env.example)')
if (!file) throw new Error('Usage: npm run import-cv -- path/to/cv.pdf')

const current = JSON.parse(readFileSync(resolve(here, '../content/profile.json'), 'utf8'))
const pdf = readFileSync(resolve(process.cwd(), file)).toString('base64')

const cities: Record<string, [number, number]> = {
  singapore: [1.3521, 103.8198],
  'são paulo': [-23.5505, -46.6333],
  'sao paulo': [-23.5505, -46.6333],
  tokyo: [35.6762, 139.6503],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  'kansas city': [39.0997, -94.5786],
  berkeley: [37.8716, -122.2727],
  amsterdam: [52.3676, 4.9041],
  london: [51.5072, -0.1276],
  'new york': [40.7128, -74.006],
  'san francisco': [37.7749, -122.4194],
  sydney: [-33.8688, 151.2093],
}

const schema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    role: { type: 'STRING' },
    tagline: { type: 'STRING', description: 'One or two sentences, first person, warm and a little playful.' },
    intro: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Two or three first-person paragraphs.' },
    legs: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          from: { type: 'STRING' },
          to: { type: 'STRING', description: 'Year, or "now".' },
          company: { type: 'STRING' },
          title: { type: 'STRING' },
          city: { type: 'STRING' },
          summary: { type: 'STRING' },
          highlights: { type: 'ARRAY', items: { type: 'STRING' } },
          tags: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['id', 'from', 'to', 'company', 'title', 'city', 'summary', 'highlights', 'tags'],
      },
    },
    toolkit: {
      type: 'OBJECT',
      properties: {
        building: { type: 'ARRAY', items: { type: 'STRING' } },
        leading: { type: 'ARRAY', items: { type: 'STRING' } },
        certifications: { type: 'ARRAY', items: { type: 'STRING' } },
        languages: { type: 'ARRAY', items: { type: 'STRING' } },
      },
    },
  },
  required: ['name', 'role', 'tagline', 'intro', 'legs', 'toolkit'],
}

const prompt = `You are turning a CV into the content of a personal website written in the first person.
Keep every fact, number and date exactly as in the CV; do not invent achievements. Rewrite the tone to be
conversational, confident and lightly self-deprecating, like a good "about me" page, not a résumé.
Order legs newest first. Use short ids (lowercase, hyphenated). Education counts as a leg too.
Do not include phone numbers or street addresses anywhere.`

async function main() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'application/pdf', data: pdf } }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4 },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  const draft = JSON.parse(text)

  const gates = 'ABCDEFGHJK'
  draft.legs = draft.legs.map((leg: Record<string, unknown>, i: number) => {
    const cityKey = String(leg.city ?? '').toLowerCase()
    const hit = Object.keys(cities).find((c) => cityKey.includes(c))
    if (!hit) console.warn(`import-cv: no coordinates for "${leg.city}", using Singapore`)
    const [lat, lon] = cities[hit ?? 'singapore']
    return { ...leg, lat, lon, gate: `${gates[i % gates.length]}${(i % 9) + 1}` }
  })

  const merged = { ...current, ...draft, links: current.links, cv: current.cv, github: current.github }
  const out = resolve(here, '../content/profile.draft.json')
  writeFileSync(out, JSON.stringify(merged, null, 2) + '\n')
  console.log(`import-cv: wrote ${out}. Review it, then replace content/profile.json when you are happy.`)
}

main()
