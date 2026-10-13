// Copies the repo-root trip-data.json into src/data/ so the app can import it
// without reaching outside the project root. Runs before dev, build, test and seed.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "..", "trip-data.json");
const dest = path.join(here, "..", "src", "data", "trip-data.json");
mkdirSync(path.dirname(dest), { recursive: true });
copyFileSync(src, dest);
