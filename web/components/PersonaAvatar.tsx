"use client";

import { Blob, type Mood } from "@/components/landing/Blob";
import { personaLook } from "@/lib/personaLook";
import type { Persona } from "@/lib/types";

/**
 * A run persona drawn as its character. Pass the mood from `moodForConfusion` while they walk and
 * from `moodForOutcome` once they are done.
 */
export function PersonaAvatar({
  persona,
  index = 0,
  size = 44,
  mood = "calm",
  look,
}: {
  persona: Pick<Persona, "archetype" | "viewport" | "name">;
  index?: number;
  size?: number;
  mood?: Mood;
  look?: { x: number; y: number };
}) {
  const { hue, accessory } = personaLook(persona, index);
  return <Blob hue={hue} size={size} mood={mood} accessory={accessory} look={look} breathe={size >= 40} />;
}
