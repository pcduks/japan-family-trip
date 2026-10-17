import { describe, expect, it } from "vitest";
import { areaInfo } from "./areas";
import { tripData } from "./data/file";
import { stayStory, versionGuide } from "./guide";
import { relayout } from "./versions";

const data = tripData();
const plan = data.versions.find((v) => v.id === "plan")!;
const BANNED = /research|report|methodolog|this app|fit four|you two|\brank|\bvote/i;

describe("each stop is told lovely part first", () => {
  it("every stop of the route has a hook and a note of 50 words or fewer", () => {
    plan.stays.forEach((_, i) => {
      const s = stayStory("plan", plan.stays, i);
      expect(s, plan.stays[i].region).not.toBeNull();
      expect(s!.note.split(/\s+/).length).toBeLessThanOrEqual(50);
      expect(`${s!.hook} ${s!.note}`).not.toMatch(BANNED);
    });
  });

  it("a stop with a different number of nights loses the note that argues for the old number", () => {
    const stays = plan.stays.map((s) => ({ ...s }));
    stays[1].nights += 1;
    stays[2].nights -= 1;
    const moved = relayout(stays, data.trip.start);
    expect(stayStory("plan", moved, 1)).toBeNull();
    expect(stayStory("plan", moved, 0)).not.toBeNull();
  });

  it("the story, what we looked for and the left-out verdicts are written in plain words", () => {
    const g = versionGuide("plan")!;
    const text = [...(g.story ?? []), ...(g.looked_for ?? []).flatMap((l) => [l.title, l.text])].join(" ");
    expect(text).not.toMatch(BANNED);
    expect(g.looked_for).toHaveLength(7);
    for (const id of g.left_out ?? []) {
      const v = areaInfo(id)?.verdict;
      expect(v, id).toBeDefined();
      expect(v!.headline.split(/\s+/).length, id).toBeLessThanOrEqual(10);
    }
  });
});
