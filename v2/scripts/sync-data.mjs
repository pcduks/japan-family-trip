// Copies the repo-root trip-data.json into src/data/ so the app can import it
// without reaching outside the project root. Runs before dev, build, test and seed.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "..", "trip-data.json");
const dest = path.join(here, "..", "src", "data", "trip-data.json");
mkdirSync(path.dirname(dest), { recursive: true });
copyFileSync(src, dest);

// The plan doc (docs/research/plan-doc/*.md) is rendered in the app as the report.
const docSrc = path.join(here, "..", "..", "docs", "research", "plan-doc");
const docs = {};
for (const f of readdirSync(docSrc).sort()) if (f.endsWith(".md")) docs[f] = readFileSync(path.join(docSrc, f), "utf8");
writeFileSync(path.join(here, "..", "src", "data", "plan-doc.json"), JSON.stringify(docs));
