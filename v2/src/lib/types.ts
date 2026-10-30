/** Types for trip-data.json (schema v2) and the app's working model. */

export type Pace = "gentle" | "balanced" | "full";
export type Size = "main" | "short" | "evening" | "day_trip" | "meal";
export type Effort = "low" | "moderate" | "high";
export type Lodging = "hotel" | "rental" | "ryokan";
export type RegionStatus = "in_plan" | "option" | "candidate_fits" | "candidate_maybe" | "day_trip" | "not_this_trip";
export type VersionStatus = "plan" | "alternative" | "personal" | "legacy";
export type Role = "planner" | "member";
export type Severity = "error" | "warn" | "info";

export interface Provenance {
  source?: string | null;
  checked_at?: string | null;
  updated_by?: string | null;
  verified?: boolean | null;
}

export interface Traveller {
  id: string;
  name: string;
  role: Role;
  notes?: string | null;
  /** Only present server-side; never sent to the browser. */
  email?: string;
}

export interface PaceLevel {
  main_per_day: number;
  short_per_day: number;
  travel_day: string;
  rest_window?: string;
  rest_day_every: number | null;
  walking_km: string;
}

export interface PaceModel {
  rule: string;
  levels: Record<Pace, PaceLevel>;
  sizes: Record<Size, string>;
}

export interface Rule {
  id: string;
  severity: Severity;
  text: string;
}

export interface Calendar {
  new_year_closures: { start: string; end: string };
  peak_travel_days: string[];
  rules: Rule[];
  facts: { text: string; source: string | null }[];
}

export interface Deadline {
  id?: string;
  date: string;
  item: string;
  source?: string | null;
  done?: boolean;
  /** Food dates only (data/food-deadlines.json): how to book, and the food place it is for. */
  how?: string;
  place?: string;
}

export interface Region extends Provenance {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: RegionStatus;
  summary: string | null;
  fit: string | null;
  suggested_nights: Partial<Record<Pace, number | string>> | null;
  sources: string[];
  instagram_official: string | null;
  hashtags: string[];
  videos: string[];
}

export interface Closure {
  id?: string;
  start: string;
  end: string;
  note: string | null;
  source: string | null;
}

export interface PlaceLinks {
  source: string | null;
  map: string | null;
  photos: string | null;
  instagram: string | null;
  video: string | null;
}

export interface FoodDetails {
  type?: string | null;
  price_band?: string | null;
  recommended_by?: string | null;
  group_of_6?: string | null;
  pregnancy_note?: string | null;
}

export interface Place extends Provenance {
  id: string;
  region: string;
  name: string;
  kind: string;
  size: Size;
  why: string | null;
  hours: string | null;
  closures: Closure[];
  closed_weekdays: string[];
  effort_for_her: Effort;
  effort_note: string | null;
  status?: "avoid_for_her" | null;
  price: string | null;
  booking: string | null;
  links: PlaceLinks;
  food?: FoodDetails | null;
  google_place_id: string | null;
  lat?: number | null;
  lng?: number | null;
  created_from_drop_id?: string | null;
}

export interface Stay {
  id?: string;
  region: string;
  from: string;
  to: string;
  nights: number;
  lodging: Lodging | null;
  note: string | null;
}

export interface Version {
  id: string;
  name: string;
  pace: Pace;
  status: VersionStatus;
  /** "planners" for the seeded versions, otherwise a traveller id. */
  owner: string;
  stays: Stay[];
  travel_hours_est?: number | null;
  gains: string | null;
  gives_up: string | null;
  moves?: number | null;
  parent_version_id?: string | null;
  /** Personal versions can be kept private while drafting (open question 2). */
  shared?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LegacyRoute {
  id: string;
  name: string;
  status: "legacy";
  title: string;
  exit: string;
  stays: { place: string; nights: number }[];
  note: string;
}

export interface FoodListItem {
  n: string;
  area: string;
  cat: string;
  rating: string;
}

export interface TripData {
  schema_version: number;
  generated: string;
  trip: { name: string; start: string; end: string; nights: number; travellers: { id: string; name?: string; role: Role; notes?: string }[] };
  pace: PaceModel;
  calendar: Calendar;
  deadlines: Deadline[];
  regions: Region[];
  places: Place[];
  versions: Version[];
  legacy_routes: LegacyRoute[];
  tokyo_personal_food_list: FoodListItem[];
  related_docs: Record<string, string>;
}

/* ---------------------------------------------------------- shared state */

export type VoteKind = "pace" | "rank" | "mustdo";
export interface Vote {
  traveller_id: string;
  kind: VoteKind;
  value: unknown;
  updated_at?: string;
}
export interface PaceVote extends Vote {
  kind: "pace";
  value: { pace: Pace; note?: string | null };
}
export interface RankVote extends Vote {
  kind: "rank";
  value: { order: string[] };
}
/** Must / nice / skip per place. `places` is the must list, kept under its old name for older readers. */
export interface MustDoVote extends Vote {
  kind: "mustdo";
  value: { places: string[]; nice?: string[]; skip?: string[] };
}

export interface Suggestion {
  id: string;
  from_version_id: string | null;
  author_id: string;
  diff: SuggestionDiff;
  comment: string | null;
  status: "open" | "accepted" | "declined";
  decided_by?: string | null;
  decided_at?: string | null;
  created_at?: string;
}

export interface SuggestionDiff {
  /** The full proposed stays list. */
  stays: Stay[];
  /** The route as it was when the change started; accepting applies only what differs from it. */
  base?: Stay[];
  /** A whole other route, suggested as it is: accepting replaces the route. */
  whole?: boolean;
  pace?: Pace;
  /** Plain-language lines such as "Kanazawa 4 → 3 nights". */
  summary: string[];
  /** A planner's note when they decide. */
  decision_note?: string | null;
}

export interface Comment {
  id: string;
  author_id: string;
  target_type: "version" | "stay" | "day" | "place" | "drop" | "region" | "wish" | "walk" | "pin";
  target_id: string;
  body: string;
  created_at: string;
}

export interface Reaction {
  id: string;
  traveller_id: string;
  target_type: string;
  target_id: string;
  kind: "heart" | "not_for_us";
}

export interface PlanHistoryEntry {
  id: string;
  version_id: string;
  actor_id: string;
  change: { summary: string[]; before: Stay[]; after: Stay[]; suggestion_id?: string | null };
  at: string;
}

export type DaySlot = "early" | "morning" | "afternoon" | "evening" | "rest";
export type Crew = "everyone" | "early" | "easy";

export interface DayItem {
  id?: string;
  place_id: string | null;
  slot: DaySlot;
  crew: Crew;
  note?: string | null;
  sort?: number;
}

/** One day of a version's day plan (PRD §4.5). `kind` is Arrive, Explore, Move…, Easy, Free or Fly. */
export interface Day {
  id?: string;
  version_id: string;
  date: string;
  kind: string | null;
  title: string | null;
  items: DayItem[];
}

export interface Snapshot {
  trip: TripData["trip"];
  pace: PaceModel;
  calendar: Calendar;
  deadlines: Deadline[];
  regions: Region[];
  places: Place[];
  versions: Version[];
  legacy_routes: LegacyRoute[];
  travellers: Traveller[];
  votes: Vote[];
  suggestions: Suggestion[];
  comments: Comment[];
  reactions: Reaction[];
  history: PlanHistoryEntry[];
  days: Day[];
  food_list: FoodListItem[];
  related_docs: Record<string, string>;
  /** Tokyo on foot: the walk the family pinned to each Tokyo day (settings key "tokyo_walks"). */
  tokyo_pins: Record<string, number>;
  /** The family's tips (city pages): one place each, kept in drops and drop_places. */
  tips: Tip[];
  /** Where the data came from, so the UI can say so. */
  source: "supabase" | "file";
}

/* ------------------------------------------------------------ tips */

export type TipSource = "maps" | "instagram" | "text" | "screenshot" | "list";

/** A family tip: one place dropped by someone, found on Google, stored in drops/drop_places (PRD §6). */
export interface Tip {
  id: string;
  drop_id: string;
  author_id: string;
  /** The region id of the stop it belongs to. */
  city: string;
  name: string;
  cat: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  photo: string | null;
  maps_uri: string | null;
  type: string | null;
  address: string | null;
  source: TipSource;
  source_url: string | null;
  source_handle: string | null;
  /** A day the family put it on, if any. */
  planned_for: string | null;
  created_at: string;
}

/** What is stored in drop_places.extracted for a tip. */
export type TipExtracted = Omit<Tip, "id" | "drop_id" | "author_id" | "created_at">;

/* ---------------------------------------------------------- Google */

export interface GoogleAttribution {
  displayName: string;
  uri?: string;
  photoUri?: string;
}

export interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions: GoogleAttribution[];
}

export interface PlaceReview {
  rating: number;
  text: string;
  relativeTime: string;
  publishTime?: string;
  author: GoogleAttribution;
  googleMapsUri?: string;
}

export interface PlaceDetails {
  placeId: string;
  displayName: string;
  address?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  weekdayHours?: string[];
  openNow?: boolean;
  location?: { lat: number; lng: number };
  website?: string;
  /** 0 (free) to 4 (very expensive), when Google says. */
  priceLevel?: number;
  /** Google's one-line editorial summary. */
  summary?: string;
  photos: PlacePhoto[];
  reviews: PlaceReview[];
  fetchedAt: string;
}
