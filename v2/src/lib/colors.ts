/** One colour per region, the same everywhere (timeline, map, badges). */
const REGION_COLORS: Record<string, string> = {
  tokyo: "#3b5bdb",
  kanazawa: "#2f9e44",
  shirakawago: "#868e96",
  takayama: "#e8590c",
  gero: "#d6336c",
  kyoto: "#7048e8",
  nara: "#f08c00",
  hakone: "#0ca678",
  kawaguchiko: "#0b7285",
  okuhida: "#1098ad",
  yudanaka: "#c2255c",
  okayama: "#5c940d",
  kinosaki: "#1864ab",
  hiroshima: "#e03131",
  ginzan: "#5f3dc4",
  shuzenji: "#099268",
  kusatsu: "#a61e4d",
  nikko: "#862e9c",
  kamakura: "#1971c2",
  "echigo-yuzawa": "#2b8a3e",
  hokkaido: "#495057",
  "north-tohoku": "#7950f2",
  koyasan: "#495057",
  kumano: "#495057",
  kyushu: "#495057",
  shikoku: "#495057",
  okinawa: "#495057",
  osaka: "#e8590c",
  matsumoto: "#5c7cfa",
  karuizawa: "#2b8a3e",
  "south-tohoku": "#1971c2",
  miyajima: "#c92a2a",
  shirahama: "#1c7ed6",
  nagano: "#5f3dc4",
  arima: "#a61e4d",
  matsue: "#364fc7",
  fukuoka: "#e67700",
  nagoya: "#2b8a3e",
  atami: "#0c8599",
  "ise-shima": "#9c36b5",
  morioka: "#c2255c",
  tsunagi: "#0b7285",
};

const FALLBACK = ["#4c6ef5", "#f76707", "#12b886", "#be4bdb", "#fab005", "#15aabf", "#fa5252", "#82c91e"];

export function regionColor(id: string): string {
  if (REGION_COLORS[id]) return REGION_COLORS[id];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

/** Person colours for initials and map pins. */
const PERSON = ["#3b5bdb", "#e8590c", "#2f9e44", "#d6336c", "#7048e8", "#0ca678", "#f08c00", "#1098ad"];
export function personColor(index: number): string {
  return PERSON[index % PERSON.length];
}

export function fitColor(status: string): string {
  switch (status) {
    case "in_plan":
      return "var(--ok)";
    case "candidate_fits":
      return "#2f9e44";
    case "option":
      return "#1971c2";
    case "candidate_maybe":
      return "#e67700";
    case "day_trip":
      return "#868e96";
    default:
      return "#adb5bd";
  }
}

export function fitLabel(status: string): string {
  switch (status) {
    case "in_plan":
      return "In the plan";
    case "candidate_fits":
      return "Fits";
    case "option":
      return "Option";
    case "candidate_maybe":
      return "Maybe";
    case "day_trip":
      return "Day trip";
    case "not_this_trip":
      return "Not this trip";
    default:
      return status;
  }
}
