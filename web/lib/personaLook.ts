import type { Accessory, Mood } from "@/components/landing/Blob";
import type { Outcome, Persona } from "./types";

/**
 * How any persona from any run looks as a character. Real runs recruit new names every time, so the
 * colour and accessory come from the archetype (with the slot in the run as a fallback), and the face
 * comes from what is happening to them.
 */
export interface PersonaLook {
  hue: [string, string];
  accessory: Accessory;
}

const LOOKS: { match: RegExp; look: PersonaLook }[] = [
  { match: /first|new|novice|beginner/i, look: { hue: ["#ffb199", "#ff6a3d"], accessory: "sprout" } },
  { match: /hurry|power|busy|expert|impatient/i, look: { hue: ["#c4bbff", "#6d5cff"], accessory: "headband" } },
  { match: /mobile|phone/i, look: { hue: ["#9ee0ff", "#1e9bf0"], accessory: "headphones" } },
  { match: /older|senior|low digital|confidence|cautious/i, look: { hue: ["#8ff0cf", "#14b886"], accessory: "glasses" } },
  { match: /non-native|english|language|reader/i, look: { hue: ["#ffe08a", "#ffa412"], accessory: "bubble" } },
];

export function personaLook(persona: Pick<Persona, "archetype" | "viewport">, index = 0): PersonaLook {
  if (persona.viewport === "mobile") return LOOKS[2].look;
  const hit = LOOKS.find((l) => l.match.test(persona.archetype));
  return hit ? hit.look : LOOKS[index % LOOKS.length].look;
}

/** Face for a live step: the model's confusion score, 0 (calm) to 3 (lost). */
export function moodForConfusion(confusion: number | null | undefined): Mood {
  if (confusion == null) return "calm";
  if (confusion <= 0) return "calm";
  if (confusion === 1) return "curious";
  if (confusion === 2) return "confused";
  return "frustrated";
}

/** Face once the walk is over. */
export function moodForOutcome(outcome: Outcome | null | undefined): Mood {
  switch (outcome) {
    case "completed":
      return "happy";
    case "wrong_path":
      return "confused";
    case "out_of_steps":
      return "worried";
    case "gave_up":
    case "stuck":
      return "frustrated";
    case "error":
      return "worried";
    default:
      return "calm";
  }
}
