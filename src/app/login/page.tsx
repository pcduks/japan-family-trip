import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in · Six Across Japan" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const error = typeof sp.error === "string" ? sp.error : null;
  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <p className="eyebrow">20 Dec 2026 – 9 Jan 2027</p>
        <h1 className="font-display text-3xl font-extrabold">Six Across Japan</h1>
        <p className="mt-2 text-muted">
          Enter your email and we&apos;ll send you a sign-in link. Only the six invited travellers can sign in.
        </p>
      </div>
      <LoginForm next={next} initialError={error} />
    </main>
  );
}
