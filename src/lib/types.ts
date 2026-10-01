export type PlaceKind =
  | "city"
  | "daytrip"
  | "ryokan"
  | "stopover"
  | "village"
  | "temple"
  | "module"
  | "food";

export interface Place {
  /** Database uuid, or the slug when running from bundled data. */
  id: string;
  slug: string;
  name: string;
  /** Text Search query used to resolve the Google place. */
  query: string;
  lat: number | null;
  lng: number | null;
  region: string;
  kind: PlaceKind;
  blurb: string;
  winter: string;
  bump: string;
  googlePlaceId: string | null;
  /** Food list fields (kind = "food"). */
  category?: string | null;
  area?: string | null;
  note?: string | null;
  closedNote?: string | null;
  listRating?: string | null;
}

export interface Stay {
  id: string;
  place: string; // slug
  startDate: string; // YYYY-MM-DD
  nights: number;
  legNote: string | null;
  daytrips: string[]; // slugs
  via: string[]; // slugs, stops on the way in
}

export interface Route {
  id: string;
  code: string;
  name: string;
  title: string;
  color: string;
  exitAirport: string;
  isCandidate: boolean;
  stays: Stay[];
}

export interface Traveller {
  id: string;
  name: string;
  email?: string;
  role: "planner" | "member";
  /** Couple key for splitting costs, e.g. "pedro", "irmao", "pais". */
  couple?: string | null;
}

export interface Trip {
  name: string;
  start: string;
  end: string;
  nights: number;
  notes: string;
  places: Place[];
  routes: Route[];
  modules: string[]; // slugs of optional add-ons
  travellers: Traveller[];
}

export interface Vote {
  travellerId: string;
  routeId: string;
  rank: number;
}

export interface Heart {
  travellerId: string;
  placeId: string;
}

export interface MediaItem {
  id: string;
  placeId: string;
  type: "photo" | "video";
  sourceRef: string;
  pinned: boolean;
  sort: number;
  title?: string | null;
}

/** Normalised Place Details (Places API New) as served by /api/places/:slug. */
export interface GoogleAttribution {
  displayName: string;
  uri?: string;
  photoUri?: string;
}

export interface GooglePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions: GoogleAttribution[];
}

export interface GoogleReview {
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
  photos: GooglePhoto[];
  reviews: GoogleReview[];
}

export interface PlaceSheetData {
  slug: string;
  google: PlaceDetails | null;
  googleError?: string;
  videos: { id: string; title: string | null }[];
  /** Photo names the planner hid. */
  hiddenPhotos: string[];
}
