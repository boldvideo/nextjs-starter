import { redirect } from "next/navigation";

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const params = await searchParams;
  const query = params?.c;

  if (query) {
    redirect(`/ask?q=${encodeURIComponent(query)}`);
  }

  redirect("/ask");
}
