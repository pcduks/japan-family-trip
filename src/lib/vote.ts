import type { Route } from "./types";

export interface VoteRow {
  travellerId: string;
  routeId: string;
  rank: number;
}

/**
 * Majority vote: each person picks a favourite (rank 1) and may add a second
 * choice (rank 2), which only breaks ties. Returns routes best first.
 */
export function voteTally<R extends Pick<Route, "id">>(routes: R[], votes: VoteRow[], travellers: number) {
  const firsts = (id: string) => votes.filter((v) => v.routeId === id && v.rank === 1).length;
  const seconds = (id: string) => votes.filter((v) => v.routeId === id && v.rank === 2).length;
  const ranking = [...routes].sort((a, b) => firsts(b.id) - firsts(a.id) || seconds(b.id) - seconds(a.id));
  const voters = new Set(votes.filter((v) => v.rank === 1).map((v) => v.travellerId)).size;
  const leader = voters ? ranking[0] : null;
  return { ranking, leader, voters, firsts, seconds, majority: !!leader && firsts(leader.id) > travellers / 2 };
}
