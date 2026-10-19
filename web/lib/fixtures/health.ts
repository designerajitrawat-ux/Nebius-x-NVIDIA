/** DEV / DEMO ONLY. Served when NEXT_PUBLIC_FIXTURES=1. */
import type { Health } from "../types";

export const fixtureHealth: Health = {
  ok: true,
  mode: "live",
  models: {
    fast: { id: "nvidia/Nemotron-3.5-Lightning", label: "Nemotron 3.5 Lightning" },
    vision: { id: "nvidia/nemotron-3-nano-omni", label: "Nemotron 3 Nano Omni" },
    agent: { id: "nvidia/nemotron-3-super-120b-a12b", label: "Nemotron 3 Super" },
    reason: { id: "nvidia/Nemotron-3-Ultra-550b-a55b", label: "Nemotron 3 Ultra" },
  },
  budget: { spent_usd: 8.8, soft_usd: 30, hard_usd: 40, remaining_usd: 31.2, state: "ok" },
  limits: { per_hour: 2, per_day: 5, max_personas: 5, max_steps: 12 },
  active_runs: 0,
  // All three point at the one fixture report.
  samples: [
    {
      id: "fixture",
      title: "Signup",
      url: "https://fernhill.example/",
      task: "Sign up and create your first project",
      headline: "3 of 5 users could not create a project.",
      completed: 2,
      total: 5,
    },
    {
      id: "fixture",
      title: "Checkout",
      url: "https://fernhill.example/",
      task: "Buy a gift card for a friend",
      headline: "4 of 5 users paid, but two were charged twice for shipping.",
      completed: 4,
      total: 5,
    },
    {
      id: "fixture",
      title: "Booking",
      url: "https://fernhill.example/",
      task: "Book a table for four on Friday at 8 pm",
      headline: "2 of 5 users booked the wrong day.",
      completed: 3,
      total: 5,
    },
  ],
};
