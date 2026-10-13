/**
 * Supabase Auth settings that the app needs (README step 3), applied through
 * the Management API so no dashboard visit is needed:
 *   - sign-ups off (only pre-created travellers can sign in)
 *   - "Before user created" hook → trip.hook_before_user_created
 *   - 6-digit codes, and the app's URLs on the redirect allow list
 *
 *   SUPABASE_ACCESS_TOKEN=… SUPABASE_PROJECT_REF=… npx tsx scripts/configure-auth.ts [--url=https://app.example.com]
 */
import { loadEnv, need } from "./env";

loadEnv();
const token = need("SUPABASE_ACCESS_TOKEN");
const ref = need("SUPABASE_PROJECT_REF");
const base = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const extraUrls = process.argv.slice(2).filter((a) => a.startsWith("--url=")).map((a) => a.slice(6));

type Config = Record<string, unknown>;

async function get(): Promise<Config> {
  const r = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`GET auth config: ${r.status} ${await r.text()}`);
  return (await r.json()) as Config;
}

async function patch(body: Config): Promise<{ ok: boolean; status: number; text: string }> {
  const r = await fetch(base, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, status: r.status, text: await r.text() };
}

function mergeAllowList(current: unknown, add: string[]): string {
  const list = String(current ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const u of add) if (!list.includes(u)) list.push(u);
  return list.join(",");
}

async function main() {
  const before = await get();
  const show = (c: Config) =>
    Object.entries(c)
      .filter(([k]) => /disable_signup|hook_before_user_created|mailer_otp_length|uri_allow_list|site_url/.test(k))
      .map(([k, v]) => `  ${k} = ${JSON.stringify(v)}`)
      .join("\n");
  console.log("Before:\n" + show(before));

  const urls = ["http://localhost:3000/**", "https://japan-family-trip*.vercel.app/**", ...extraUrls];
  const wanted: Config = {
    disable_signup: true,
    mailer_otp_length: 6,
    uri_allow_list: mergeAllowList(before.uri_allow_list, urls),
    hook_before_user_created_enabled: true,
    hook_before_user_created_uri: "pg-functions://postgres/trip/hook_before_user_created",
  };
  let res = await patch(wanted);
  if (!res.ok) {
    console.warn(`! full PATCH failed (${res.status}): ${res.text.slice(0, 300)}; retrying without the hook fields`);
    const { hook_before_user_created_enabled: _a, hook_before_user_created_uri: _b, ...rest } = wanted;
    void _a;
    void _b;
    res = await patch(rest);
    if (!res.ok) throw new Error(`PATCH auth config: ${res.status} ${res.text}`);
    console.warn("! set the hook by hand: Auth → Hooks → Before User Created → trip.hook_before_user_created");
  }
  const after = await get();
  console.log("After:\n" + show(after));
  const okHook = after.hook_before_user_created_enabled === true && String(after.hook_before_user_created_uri ?? "").includes("trip/hook_before_user_created");
  console.log(`sign-ups off: ${after.disable_signup === true} · hook on trip schema: ${okHook} · otp length: ${after.mailer_otp_length}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
