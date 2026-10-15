/**
 * Generates a poster illustration for every project in content/projects.json that does not have one yet,
 * in the same vintage airline-poster style as the existing ones, and writes WebP files to public/illustrations.
 *
 *   GEMINI_API_KEY=... npm run illustrate            # only missing images
 *   GEMINI_API_KEY=... npm run illustrate -- --force # redo all
 *
 * The images are committed, so the site never calls Gemini at runtime.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const key = process.env.GEMINI_API_KEY
if (!key) throw new Error('Set GEMINI_API_KEY (see .env.example)')
const force = process.argv.includes('--force')

type Project = { repo: string; name: string; description: string; image?: string; prompt?: string }
const projects = JSON.parse(readFileSync(resolve(here, '../content/projects.json'), 'utf8')) as Project[]

const STYLE =
  'Vintage mid-century airline travel poster, flat screen-print illustration, bold simplified shapes, ' +
  'subtle paper grain, limited palette of midnight navy, warm amber, cream and coral. No text, no letters, no logos, no watermark. '

async function generate(prompt: string): Promise<Buffer> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: STYLE + prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:3' } },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data: string; mimeType: string } }[] } }[]
  }
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
  if (!part?.inlineData) throw new Error('Gemini returned no image; try rephrasing the prompt')
  return Buffer.from(part.inlineData.data, 'base64')
}

async function main() {
  for (const p of projects) {
    const slug = p.repo.split('/')[1]
    const target = resolve(here, '../public/illustrations', `${slug}.png`)
    const webp = target.replace(/\.png$/, '.webp')
    if (!force && (existsSync(webp) || existsSync(target))) continue
    const prompt = p.prompt ?? `A poster that captures this project: ${p.name}. ${p.description}`
    console.log(`illustrate: ${slug}`)
    writeFileSync(target, await generate(prompt))
    console.log(`  wrote ${target}. Convert to WebP (for example with "cwebp -q 82") and set "image" in projects.json.`)
  }
}

main()
