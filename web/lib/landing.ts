/**
 * Content for the landing page. Quotes, issues and numbers come from real FiveUsers runs on the
 * three sample sites (api/samples and the live runs of 20 Oct 2026), not from a copywriter.
 */

export interface CastMember {
  id: string;
  name: string;
  age: number;
  archetype: string;
  tests: string;
  /** A line this kind of persona actually said during our runs. */
  line: string;
  device: "laptop" | "phone";
  /** Two-stop colour for the character. */
  hue: [string, string];
  /** The face they make most often in our runs. */
  mood: "curious" | "confused" | "worried" | "frustrated";
  /** One small thing that says who they are. */
  accessory: "sprout" | "headband" | "headphones" | "glasses" | "bubble";
}

export const CAST: CastMember[] = [
  {
    id: "amina",
    name: "Amina",
    age: 26,
    archetype: "First-timer",
    tests: "Is it obvious where to start?",
    line: "Accept cookies to clear the banner and proceed.",
    device: "laptop",
    hue: ["#ffb199", "#ff6a3d"],
    mood: "confused",
    accessory: "sprout",
  },
  {
    id: "diego",
    name: "Diego",
    age: 34,
    archetype: "Power user in a hurry",
    tests: "How many clicks until value?",
    line: "Annoying that I have to pick a plan before I can even start.",
    device: "laptop",
    hue: ["#c4bbff", "#6d5cff"],
    mood: "frustrated",
    accessory: "headband",
  },
  {
    id: "kwame",
    name: "Kwame",
    age: 29,
    archetype: "Mobile only",
    tests: "Does it work under a thumb?",
    line: "That empty button might be a menu toggle.",
    device: "phone",
    hue: ["#9ee0ff", "#1e9bf0"],
    mood: "curious",
    accessory: "headphones",
  },
  {
    id: "margaret",
    name: "Margaret",
    age: 68,
    archetype: "Low digital confidence",
    tests: "Does it feel safe and clear?",
    line: "I'm not comfortable entering my card details on a trial sign-up page.",
    device: "laptop",
    hue: ["#8ff0cf", "#14b886"],
    mood: "worried",
    accessory: "glasses",
  },
  {
    id: "sunita",
    name: "Sunita",
    age: 42,
    archetype: "Non-native English reader",
    tests: "Is the wording plain enough?",
    line: "I notice a message saying my card has expired. That is confusing.",
    device: "laptop",
    hue: ["#ffe08a", "#ffa412"],
    mood: "confused",
    accessory: "bubble",
  },
];

/**
 * One beat of the hero animation: who moves where on the sample pricing page, and what they think.
 * The lines are shortened from what personas said on this page in our runs.
 */
export interface HeroBeat {
  who: string;
  /** The face they pull at this moment (the run measures confusion on every step). */
  mood: "calm" | "curious" | "confused" | "worried" | "frustrated";
  /** Target on the screenshot, 0..1 of its width and height. */
  x: number;
  y: number;
  say: string;
  pin?: { n: number; label: string; tone: "critical" | "major" | "minor" };
}

export const HERO_BEATS: HeroBeat[] = [
  { who: "amina", mood: "confused", x: 0.08, y: 0.9, say: "Accept cookies to clear the banner first.", pin: { n: 1, label: "Cookie bar covers the page", tone: "minor" } },
  { who: "diego", mood: "frustrated", x: 0.45, y: 0.46, say: "I have to pick a plan before I can even start?", pin: { n: 2, label: "Pricing wall before signup", tone: "critical" } },
  { who: "sunita", mood: "confused", x: 0.6, y: 0.27, say: "Reading this twice to be sure what it means." },
  { who: "margaret", mood: "worried", x: 0.16, y: 0.67, say: "I'm not comfortable giving my card for a trial.", pin: { n: 3, label: "Card asked for a free trial", tone: "major" } },
  { who: "kwame", mood: "curious", x: 0.82, y: 0.86, say: "Maybe more options appear if I scroll down." },
];

/** Where each persona waits between beats: on the window's edges, so the page itself stays readable. */
export const HERO_REST: Record<string, { x: number; y: number }> = {
  amina: { x: -0.02, y: 0.42 },
  diego: { x: 0.24, y: 1.02 },
  kwame: { x: 1.02, y: 0.5 },
  margaret: { x: 0.5, y: 1.04 },
  sunita: { x: 0.98, y: 0.1 },
};

export interface ShowcaseIssue {
  flow: "Signup" | "Checkout" | "Booking";
  severity: "critical" | "major" | "minor";
  title: string;
  why: string;
  quote: string;
  quoteBy: string;
  fixType: "copy" | "css" | "flow";
  fixSummary: string;
  before: string;
  after: string;
}

/** The lead issue of each committed sample report, as Nemotron 3 Ultra wrote it. */
export const SHOWCASE: { lead: ShowcaseIssue & { image: string; pin: { x: number; y: number } }; more: ShowcaseIssue[] } = {
  lead: {
    flow: "Signup",
    severity: "major",
    title: "Payment details required before account creation despite a 14-day free trial",
    why: "The signup form demands card details before the account exists, even though the page promises no charge until the trial ends. Margaret and Sunita both had to type test card numbers to get through, which adds friction and distrust.",
    quote: "I'm not comfortable entering my card details on a trial sign-up page.",
    quoteBy: "Margaret, 68",
    fixType: "flow",
    fixSummary: "Drop payment from signup; ask for it when the trial ends or the user upgrades.",
    before: "Signup asks for card number, expiry and CVC before the account is created.",
    after: "Signup asks for name, email, password and workspace. Payment waits for the trial banner or the upgrade flow.",
    image: "/landing/signup-issue.jpg",
    pin: { x: 0.6992, y: 0.8725 },
  },
  more: [
    {
      flow: "Checkout",
      severity: "critical",
      title: "Colour swatches have no labels and no selected state",
      why: "Nobody could confirm they had picked blue. Every swatch is an unlabeled button and nothing changes when you choose one, so people clicked again and again.",
      quote: "I'm unsure which color is blue and don't want to guess and make a mistake.",
      quoteBy: "Margaret, 68",
      fixType: "css",
      fixSummary: "Name each swatch and show the chosen one clearly.",
      before: ".swatch { }",
      after: ".swatch::after { content: attr(data-color); }\n.swatch[aria-pressed=\"true\"] { outline: 3px solid #0066cc; }",
    },
    {
      flow: "Booking",
      severity: "critical",
      title: "Saturday's time slots never appear after picking Saturday",
      why: "After choosing Saturday 24, the grid still said 'Available times · Tuesday 20 October'. Scrolling didn't help, so Kofi gave up.",
      quote: "Maybe more dates appear if I scroll down.",
      quoteBy: "Kofi, mobile",
      fixType: "flow",
      fixSummary: "Show the chosen day's times right away and update the label.",
      before: "The time grid keeps showing Tuesday after a Saturday is picked.",
      after: "Picking a date loads that date's slots and the label names the chosen day.",
    },
  ],
};

export const SAMPLE_CARDS = [
  { id: "sample-signup", title: "Signup", site: "Fernhill · project planner", task: "Sign up and create your first project", completed: 2, total: 5, image: "/landing/pricing.jpg", tint: "#e7f8c4" },
  { id: "sample-checkout", title: "Checkout", site: "Larkspur Supply · clothing store", task: "Buy a medium t-shirt in blue and pay by card", completed: 0, total: 5, image: "/landing/product.jpg", tint: "#ffe2d6" },
  { id: "sample-booking", title: "Booking", site: "Marlowe Studio · hair salon", task: "Book a haircut for next Saturday afternoon", completed: 4, total: 5, image: "/landing/booking.jpg", tint: "#e3e0ff" },
] as const;

/** Measured on the committed sample runs. */
export const RUN_FACTS = [
  { value: "5", label: "AI users per test, in parallel" },
  { value: "~130", label: "Nemotron calls per run" },
  { value: "~$0.10", label: "model cost per run" },
  { value: "~2 min", label: "from link to report" },
];
