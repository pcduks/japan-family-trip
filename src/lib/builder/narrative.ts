import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * Claude writes the words, never the facts. It gets the finished route as
 * structured data (bases, nights, the cards placed, each person's wishes) and
 * returns a Portuguese pitch plus "você ganha / abre mão" lines per person.
 * Every card it names must exist in the input; numbers, hours and prices in
 * prose are rejected, so nothing it says can contradict the catalog.
 */

export interface NarrativeInput {
  axis: string;
  bases: { name: string; nights: number; from: string; to: string }[];
  ny: { base: string; hospital_minutes: number };
  placed: { card_id: string; name_pt: string; date: string; who: "all" | "split" }[];
  people: { id: string; name: string; role: "her" | "parents" | "bros" | "pedro"; must: { card_id: string; name_pt: string; hit: boolean }[]; like_hit: string[]; like_missed: string[] }[];
  violations: string[];
}

export interface Narrative {
  pitch_pt: string;
  per_person: Record<string, { ganha: string[]; abre_mao: string[] }>;
  model: string;
  usage: { input: number; cached: number; output: number };
}

const Schema = z.object({
  pitch_pt: z.string().describe("2–3 frases em português do Brasil, calorosas e concretas, sem números, horários ou preços"),
  per_person: z.array(
    z.object({
      id: z.string(),
      ganha: z.array(z.string()).describe("até 3 nomes de experiências (name_pt exatos) que esta pessoa pediu e a rota entrega"),
      abre_mao: z.array(z.string()).describe("até 2 nomes de experiências (name_pt exatos) que esta pessoa pediu e a rota não entrega"),
    }),
  ),
});

const SYSTEM = `Você escreve para uma família brasileira de seis pessoas (três casais: o Pedro, que organiza, e a esposa dele, grávida; o irmão e a cunhada; e os pais) que vai ao Japão de 20 de dezembro a 9 de janeiro. Você recebe uma rota já montada por regras a partir dos desejos de cada um.

Regras, sem exceção:
- Escreva só o que está nos dados. Nunca invente lugares, horários, preços, distâncias ou datas. Não use números no texto.
- Cite experiências pelo name_pt exato que recebeu, sem traduzir nem abreviar.
- Tom: caloroso, direto, sem exageros, como um amigo que já foi. Use "vocês". Nada de "incrível", "imperdível", "mágico".
- Lugares ficam com o nome em inglês como vieram (Kanazawa, Kyoto).
- A grávida nunca é "o problema": fale de descanso e conforto como escolha da família.
- Em per_person, "ganha" lista o que a pessoa pediu e a rota entrega; "abre_mao" o que ela pediu e a rota não entrega. Vazio é permitido.`;

/** Model: Claude Opus 5.5 by default; set ANTHROPIC_MODEL to try another. */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export async function narrate(input: NarrativeInput, apiKey: string): Promise<Narrative> {
  const client = new Anthropic({ apiKey });
  const names = new Set(input.placed.map((p) => p.name_pt));
  for (const p of input.people) for (const m of p.must) names.add(m.name_pt);
  const ask = (note: string | null) =>
    client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "medium", format: zodOutputFormat(Schema) },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        { role: "user", content: `Rota (eixo: ${input.axis}):\n${JSON.stringify(input, null, 1)}${note ? `\n\nCorrija: ${note}` : ""}` },
      ],
    });

  let note: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await ask(note);
    const out = res.parsed_output;
    const problem = out ? check(out, names, input) : "resposta vazia";
    if (out && !problem) {
      return {
        pitch_pt: out.pitch_pt.trim(),
        per_person: Object.fromEntries(out.per_person.map((p) => [p.id, { ganha: p.ganha, abre_mao: p.abre_mao }])),
        model: res.model,
        usage: { input: res.usage.input_tokens, cached: res.usage.cache_read_input_tokens ?? 0, output: res.usage.output_tokens },
      };
    }
    note = problem;
  }
  throw new Error(`narrative rejected: ${note}`);
}

/** Why an answer is unusable, or null when it passes. */
function check(out: z.infer<typeof Schema>, names: Set<string>, input: NarrativeInput): string | null {
  if (/\d/.test(out.pitch_pt)) return "o texto não pode conter números";
  if (out.pitch_pt.length < 40) return "texto curto demais";
  const ids = new Set(input.people.map((p) => p.id));
  for (const p of out.per_person) {
    if (!ids.has(p.id)) return `id desconhecido: ${p.id}`;
    for (const n of [...p.ganha, ...p.abre_mao]) if (!names.has(n)) return `experiência inventada: "${n}"`;
  }
  return null;
}
