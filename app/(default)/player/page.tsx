import type { Metadata } from "next";
import { GymMemberPage } from "@/components/gym/gym-member-page";
import { gymMeta } from "@/lib/gym-meta";

export const metadata: Metadata = {
  ...gymMeta({
    title: "Your player card",
    description: "Press start to join The GTM Game: tell the game master about your business once, and every answer after that is built for you.",
    path: "/player",
  }),
  robots: { index: false },
};

export default function PlayerPage() {
  return <GymMemberPage />;
}
