import { existsSync } from "node:fs";

/** Load .env.local then .env (Node 22 built-in), without overriding real env vars. */
export function loadEnv() {
  for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);
}

export function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Add it to .env.local (see .env.example).`);
    process.exit(1);
  }
  return v;
}
