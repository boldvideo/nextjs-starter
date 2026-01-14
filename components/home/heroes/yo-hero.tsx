"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HeroProps } from "../hero-slot";
import { getPortalConfig } from "@/lib/portal-config";

function shuffleAndSlice(arr: string[], count: number): string[] {
  if (arr.length <= count) return arr;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function YoHero({ settings }: HeroProps) {
  const router = useRouter();
  const config = getPortalConfig(settings);
  
  const [conversationStarters] = useState(() => {
    const starters = config.ai.conversationStarters.length > 0
      ? config.ai.conversationStarters
      : [
          "How do guests grow their newsletters?",
          "What advice do guests give about creating courses?",
          "How do designers figure out what to charge?",
        ];
    return shuffleAndSlice(starters, 3);
  });

  const handleStarterClick = (question: string) => {
    router.push(`/ask?q=${encodeURIComponent(question)}`);
  };

  return (
    <div className="py-8 md:py-12 mb-8 border-b border-border/50 -mx-6 px-6 md:-mx-10 md:px-10 lg:-mx-16 lg:px-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Hero Image */}
        <div className="lg:col-span-4 flex justify-center lg:justify-start">
          <Image
            src="/yo-podcast-hero-media.png"
            alt="Rob with Yo! Podcast and Bold logos"
            width={320}
            height={320}
            className="w-64 h-auto md:w-72 lg:w-80"
            priority
          />
        </div>

        {/* Middle: Text Content */}
        <div className="lg:col-span-5 space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            A new Yo! Podcast experience.
          </h1>
          
          <p className="text-base text-muted-foreground leading-relaxed">
            The Yo! Podcast spotlights incredible designers, developers, makers
            and entrepreneurs building their own future.
          </p>
          
          <p className="text-base text-muted-foreground leading-relaxed">
            Now powered by{" "}
            <Link 
              href="https://boldvideo.io" 
              className="underline hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bold Video
            </Link>
            , you can ask me to{" "}
            <button
              onClick={() => handleStarterClick("What insights do guests share about growing a business?")}
              className="underline hover:text-primary transition-colors cursor-pointer"
            >
              extract insights
            </button>
            {" "}from all guest interviews or simply{" "}
            <button
              onClick={() => handleStarterClick("Summarize the key takeaways from the latest episode")}
              className="underline hover:text-primary transition-colors cursor-pointer"
            >
              summarize the takeaways
            </button>
            {" "}from an episode.
          </p>
          
          <p className="text-base text-muted-foreground leading-relaxed">
            Please send feedback as you go, it&apos;s all very new and exciting!
          </p>
          
          <p className="text-base text-foreground">
            - Rob (
            <Link 
              href="https://twitter.com/robhope" 
              className="underline hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              @robhope
            </Link>
            )
          </p>
        </div>

        {/* Right: Conversation Starters */}
        <div className="lg:col-span-3 space-y-3">
          {/* Arrow image */}
          <div className="flex justify-center lg:justify-end">
            <Image
              src="/arrow-thing.png"
              alt="Kick off a question"
              width={280}
              height={80}
              className="w-48 lg:w-full max-w-[280px] h-auto"
            />
          </div>
          
          {/* Starter buttons */}
          <div className="flex flex-col gap-2 items-center">
            {conversationStarters.map((starter, index) => (
              <button
                key={index}
                onClick={() => handleStarterClick(starter)}
                className="text-left px-4 py-2 text-xs border border-border rounded-full hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
