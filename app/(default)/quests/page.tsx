import type { Metadata } from "next";
import { GymQuestBoard } from "@/components/gym/gym-quest-board";
import { GymFooter } from "@/components/gym/gym-footer";
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
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <GymQuestBoard />
      <GymFooter />
    </div>
  );
}
