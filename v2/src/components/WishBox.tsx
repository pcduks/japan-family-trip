"use client";

import { useState } from "react";
import { useStore } from "./providers";
import { Avatar } from "./ui";

/** "Something missing?" One line, saved under the person's name. targetId is an area id or "trip". */
export function WishBox({ targetId, title = "Something missing?", hint }: { targetId: string; title?: string; hint?: string }) {
  const { snapshot, me, addComment } = useStore();
  const [text, setText] = useState("");
  const list = snapshot.comments.filter((c) => c.target_type === "wish" && c.target_id === targetId);
  return (
    <section className="card grid gap-2 p-4" aria-label={title}>
      <p>
        <b>{title}</b>{" "}
        <span className="text-sm text-ink-2">{hint ?? "A place you want to see, a thing you want to do, a worry. One line is enough; Pedro and Fernanda read them all."}</span>
      </p>
      {list.length ? (
        <ul className="grid gap-1.5">
          {list.map((c) => {
            const who = snapshot.travellers.find((t) => t.id === c.author_id);
            return (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                <Avatar traveller={c.author_id} travellers={snapshot.travellers} size={22} />
                <span>
                  <b>{who?.name ?? c.author_id}:</b> {c.body}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {me ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            addComment("wish", targetId, text);
            setText("");
          }}
        >
          <input className="min-w-0 flex-1" placeholder="I would like to…" value={text} onChange={(e) => setText(e.target.value)} aria-label={title} />
          <button className="btn btn-sm" disabled={!text.trim()}>
            Send
          </button>
        </form>
      ) : null}
    </section>
  );
}
