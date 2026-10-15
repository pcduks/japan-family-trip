"use client";

import { useState } from "react";
import type { Comment } from "@/lib/types";
import { useStore } from "./providers";
import { Avatar } from "./ui";

export function Comments({ targetType, targetId }: { targetType: Comment["target_type"]; targetId: string }) {
  const { snapshot, addComment, me } = useStore();
  const [text, setText] = useState("");
  const list = snapshot.comments.filter((c) => c.target_type === targetType && c.target_id === targetId);
  return (
    <section className="grid gap-3" aria-label="Comments">
      <h2 className="text-[1.1rem]">Comments {list.length ? `(${list.length})` : ""}</h2>
      <ul className="grid gap-2">
        {list.map((c) => {
          const who = snapshot.travellers.find((t) => t.id === c.author_id);
          return (
            <li key={c.id} className="flex gap-2">
              <Avatar traveller={c.author_id} travellers={snapshot.travellers} size={26} />
              <div className="min-w-0">
                <p className="text-xs text-muted">
                  {who?.name ?? c.author_id} · {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {me ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addComment(targetType, targetId, text);
            setText("");
          }}
        >
          <input className="min-w-0 flex-1" placeholder="Add a comment… use @name to mention" value={text} onChange={(e) => setText(e.target.value)} aria-label="Comment" />
          <button className="btn btn-sm" disabled={!text.trim()}>
            Post
          </button>
        </form>
      ) : null}
    </section>
  );
}
