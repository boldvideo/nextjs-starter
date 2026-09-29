import type { Metadata } from "next";
import { GymMemberPage } from "@/components/gym/gym-member-page";
import { gymMeta } from "@/lib/gym-meta";

export const metadata: Metadata = {
  ...gymMeta({
    title: "Your membership card",
    description: "Sign in to The GTM Gym, tell the coach about your business, and get answers built for you.",
    path: "/member",
  }),
  robots: { index: false },
};

export default function MemberPage() {
  return <GymMemberPage />;
}
