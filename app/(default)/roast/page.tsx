import type { Metadata } from "next";
import { GymRoastCabinet } from "@/components/gym/gym-roast";
import { GymFooter } from "@/components/gym/gym-footer";
import { gymMeta } from "@/lib/gym-meta";

export const metadata: Metadata = gymMeta({
  title: "Roast my pitch",
  shareTitle: "Roast my pitch: The GTM Game",
  description:
    "Paste your cold email, DM or pitch. The Game Master scores it 0 to 100 against what FounderWell's coaches teach, shows the clips, and hands back a fixed version.",
  path: "/roast",
});

export default function RoastPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <GymRoastCabinet />
      <GymFooter />
    </div>
  );
}
