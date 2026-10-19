"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PHRASES: { ja: string; en: string; pt: string }[] = [
  { ja: "妊娠中です。\n生もの抜きで\nお願いします。", en: "I’m pregnant. Nothing raw, please.", pt: "Estou grávida. Nada cru, por favor." },
  { ja: "7人です。", en: "We are seven.", pt: "Somos sete." },
  { ja: "妊婦なので、\nお酒は飲めません。", en: "She’s pregnant: no alcohol, please.", pt: "Ela está grávida: sem álcool, por favor." },
  { ja: "よく焼きで\nお願いします。", en: "Well done, please.", pt: "Bem passado, por favor." },
  { ja: "生卵なしで\nお願いします。", en: "No raw egg, please.", pt: "Sem ovo cru, por favor." },
  { ja: "椅子の席は\nありますか？", en: "Do you have seats with chairs?", pt: "Tem mesa com cadeiras?" },
  { ja: "二つのテーブルに\n分かれても\n大丈夫です。", en: "We can sit at two tables.", pt: "Podemos sentar em duas mesas." },
  { ja: "ペドロの名前で\n予約しています。", en: "We have a booking under Pedro.", pt: "Temos reserva em nome de Pedro." },
  { ja: "麹の甘酒ですか？", en: "Is this kōji amazake, without alcohol?", pt: "É amazake de koji, sem álcool?" },
  { ja: "お会計を\nお願いします。", en: "The bill, please.", pt: "A conta, por favor." },
];

/** Turn the phone to the staff: one big line in Japanese, and the others a tap away. Works offline once loaded. */
export function ShowStaff() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const p = PHRASES[i];
  return (
    <main className="fixed inset-0 z-50 overflow-y-auto bg-card">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <button onClick={() => (history.length > 1 ? router.back() : router.push("/food"))} className="min-h-10 text-sm font-semibold">
          ✕ Close
        </button>
        <span className="eyebrow">Turn the phone to the staff</span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5" aria-live="polite">
        <p lang="ja" className="jp text-[2.6rem] leading-[1.35] font-bold whitespace-pre-line sm:text-[3rem]">
          {p.ja}
        </p>
        <div className="grid gap-1 border-t border-rule pt-3 text-[1.05rem] text-ink-2">
          <p>{p.en}</p>
          <p lang="pt-BR">{p.pt}</p>
        </div>
      </div>

      <div className="grid gap-2">
        <p className="eyebrow">More to show</p>
        <div className="grid grid-cols-2 gap-2">
          {PHRASES.map((x, j) =>
            j === i ? null : (
              <button key={x.ja} onClick={() => setI(j)} className="flex min-h-14 flex-col items-start gap-0.5 rounded-xl border-[1.5px] border-rule bg-bg px-3 py-2 text-left text-xs text-ink-2">
                <span lang="ja" className="jp text-[1.02rem] font-bold text-ink">
                  {x.ja.replace(/\n/g, "")}
                </span>
                {x.en}
              </button>
            ),
          )}
        </div>
      </div>
      </div>
    </main>
  );
}
