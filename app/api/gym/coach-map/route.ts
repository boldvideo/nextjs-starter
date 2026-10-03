import { getCoachMap } from "@/lib/gym-coach-map";

// Which coach leads each session, keyed by the ids citations carry (internal
// video UUID and Mux playback id). Static, refreshed hourly.
export const revalidate = 3600;

export async function GET() {
  return Response.json(await getCoachMap());
}
