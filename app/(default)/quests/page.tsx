import type { Metadata } from "next";
import { GymQuestBoard } from "@/components/gym/gym-quest-board";
import { gymMeta } from "@/lib/gym-meta";

export const metadata: Metadata = {
  ...gymMeta({
    title: "Your quests",
    description: "The quests you saved in The GTM Game: count your reps, finish them, rank up.",
    path: "/quests",
  }),
  robots: { index: false },
};

export default function QuestsPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <GymQuestBoard />
    </div>
  );
}
