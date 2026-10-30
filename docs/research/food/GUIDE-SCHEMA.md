# Food guide data (for the app's "Guia de comida")

Pedro will be the family's food guide, using the app on his phone. Everything shown in the app is in **Portuguese (Brazil)**: warm, specific, written as a well-read friend talking. Japanese names stay in Japanese with romaji. The family reads this on the street, so be concise: short paragraphs, concrete things to order, prices in ¥.

Read `docs/research/food/BRIEF.md` for the source rules (Tabelog plus Japanese sources; no Google-star or tourist-blog evidence; never invent a number) and the family context (six people, one 29–32 weeks pregnant, parents, 20 Dec 2026 – 9 Jan 2027, the New Year shutdown).

The web-search budget is shared and runs out. Prefer WebFetch on known pages (ja.wikipedia.org, the city or prefecture's official tourism pages, shop sites, tabelog.com/en pages, award.tabelog.com lists, ekiben makers' sites, konbini official sites) and keep WebSearch for discovery. Long-established history can come from Japanese Wikipedia and official city or market sites. Prices, hours and New Year status must be verified or written as "a confirmar".

## City file: `data/food-guide/<slug>.json` (slug from `data/bases.json`)
```jsonc
{
  "slug": "kanazawa",
  "name": "Kanazawa",
  "tagline_pt": "Uma linha: o que esta cidade é para quem come.",
  "history_pt": ["2–4 parágrafos curtos: por que se come assim aqui (geografia, história, comércio, clãs, portos, religião)."],
  "winter_pt": "O que está na estação em dez–jan aqui (1–3 frases).",
  "meibutsu": [
    {
      "name_pt": "Caranguejo kōbako",
      "name_ja": "香箱ガニ",
      "romaji": "kōbako-gani",
      "what_pt": "O que é, como se come, por que é especial.",
      "where_pt": "Onde provar (nome de lugar que esteja em places/shops/areas, ou tipo de lugar).",
      "price_pt": "¥2.000–5.000",
      "must": true,
      "pregnancy": "ok | cuidado | evitar",
      "pregnancy_pt": "Só se pregnancy ≠ ok: o que evitar e o que pedir no lugar."
    }
  ],
  "areas": [
    {
      "name": "Ōmichō Market",
      "name_ja": "近江町市場",
      "kind": "mercado | bairro | rua | depachika | estação | yokochō",
      "story_pt": "História curta e a cara do lugar hoje.",
      "eat_pt": ["O que comer ali (itens concretos, com nome de banca quando verificado)."],
      "tips_pt": "Horário bom, como evitar fila, o que é armadilha de turista.",
      "dec_jan_pt": "Fechamentos e movimento no fim de ano (ou 'a confirmar').",
      "query": "Omicho Market Kanazawa"
    }
  ],
  "places": [
    {
      "name": "Otome Zushi",
      "name_ja": "乙女寿司",
      "area": "Kanazawa · Owarichō",
      "genre_pt": "Sushi",
      "price_pt": "Jantar ¥25–30k",
      "tabelog": { "score": 4.05, "reviews": 1234, "url": "https://tabelog.com/...", "awards": "Award Silver 2026" },
      "critics": [{ "who": "@migrationology", "note_pt": "…", "url": "https://…" }],
      "why_pt": "1–2 frases, voz de crítico, sem clichê.",
      "order_pt": "O que pedir.",
      "pregnancy_pt": "O que ela evita e o que pede no lugar.",
      "group_pt": "Cabe 6? Mesa, sala, balcão inteiro, 3+3.",
      "booking_pt": "Como e quando reservar.",
      "dec_jan_pt": "24/12 e Ano-Novo.",
      "query": "Otome Zushi Kanazawa"
    }
  ],
  "shops": [
    { "name": "…", "name_ja": "…", "what_pt": "…", "buy_pt": "o que comprar/levar", "price_pt": "…", "dec_jan_pt": "…", "query": "…" }
  ],
  "sources": ["URL", "…"]
}
```

## Topic file: `data/food-guide/topics/<topic>.json` (depachika, ekiben, konbini, etiquette…)
```jsonc
{
  "slug": "konbini",
  "title_pt": "Konbini",
  "intro_pt": ["1–3 parágrafos curtos."],
  "sections": [
    {
      "title_pt": "Café da manhã de konbini",
      "body_pt": "Texto curto.",
      "items": [
        { "name": "…", "name_ja": "…", "what_pt": "…", "where_pt": "loja/rede/estação", "price_pt": "¥…", "must": true, "pregnancy": "ok | cuidado | evitar", "tip_pt": "…" }
      ]
    }
  ],
  "sources": ["URL", "…"]
}
```

Rules: valid JSON (no comments in the real files), UTF-8, every string field may be omitted when unknown rather than guessed. `pregnancy` defaults to "ok" when omitted. Keep each city file under ~60 KB.
