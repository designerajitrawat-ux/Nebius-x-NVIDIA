import type { SampleInfo } from "./types";

/** Public repo. Replace OWNER before submission. */
export const GITHUB_URL = "https://github.com/designerajitrawat-ux/Nebius-x-NVIDIA";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860").replace(/\/+$/, "");

/** `/run/fixture` and `/r/fixture` always work without a backend (see lib/fixtures/). */
export const FIXTURE_ID = "fixture";

/** NEXT_PUBLIC_FIXTURES=1 also serves /health, /samples and POST /runs from fixtures. */
export const USE_FIXTURES = process.env.NEXT_PUBLIC_FIXTURES === "1";

/**
 * Shown while /health is still waking up, so the sample links are clickable immediately.
 * The ids must match the committed reports in api/samples/; /health replaces this list as soon as it answers.
 */
export const FALLBACK_SAMPLES: Pick<SampleInfo, "id" | "title">[] = [
  { id: "sample-signup", title: "Signup" },
  { id: "sample-checkout", title: "Checkout" },
  { id: "sample-booking", title: "Booking" },
];
