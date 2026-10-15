import { redirect } from "next/navigation";

/** Editing now happens on the version page itself (drag, tap, +/−). */
export default async function EditRedirect({ params }: PageProps<"/versions/[id]/edit">) {
  const { id } = await params;
  redirect(`/versions/${id}#stops`);
}
