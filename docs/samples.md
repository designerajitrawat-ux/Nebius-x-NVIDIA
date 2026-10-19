# Sample sites: answer key

Three small static sites with **deliberate, realistic usability flaws** live in `web/public/samples/`.
This file is the answer key we use to judge whether a FiveUsers report found the real problems.
It is intentionally **not** inside `web/public` so it is never web-served.

| Flow | Brand (fictional) | Entry path | Task string |
|---|---|---|---|
| Signup | Fernhill, a project planning tool | `samples/signup/index.html` | `Sign up and create your first project` |
| Checkout | Larkspur Supply, a clothing store | `samples/checkout/index.html` | `Buy a medium t-shirt in blue and pay by card` |
| Booking | Marlowe Studio, a hair salon | `samples/booking/index.html` | `Book a haircut for next Saturday afternoon` |

## How the sites work

- Plain HTML, CSS and vanilla JS. They make no external requests: system fonts, inline SVG, and `data:` URIs only.
- All links are relative. Always use the explicit `index.html` entry URL. Next.js/Vercel does not serve a
  directory index from `public/`, so `/samples/signup/` would 404 while `/samples/signup/index.html` works.
- State lives in `sessionStorage`. A fresh browser context (one per persona) starts clean.
- Success pages are guarded. Opening them directly, without completing the flow, shows a neutral page with a
  different `<h1>` ("No project open", "No recent order", "No booking found"). Success can only be reached
  through the flow.
- Each footer carries a small line saying it is a fictional company used for usability-testing demos. The checkout
  shows "Demo store, no real payment is taken" above the card fields.
- Severity scale: **critical** blocks or derails most users, or risks the wrong outcome. **Major** causes
  significant friction or errors. **Minor** is an annoyance or polish issue.
- Categories: flow, copy, form, visual, a11y, mobile, feedback.

---

## 1. Signup: Fernhill

**Task:** `Sign up and create your first project`
**Entry:** `samples/signup/index.html`
**What it is:** a calm, green SaaS marketing site for a team project tool, followed by a logged-in dashboard.
The main CTA puts a pricing wall before signup, and the signup form collects most of the classic form
mistakes. The way to create a project is an unlabeled "+" icon.

**Pages:** `index.html` → `pricing.html` → `signup.html?plan=free|starter|team|business` → `projects.html` → `board.html` (success).
Off-path: `login.html` is a dead end ("We couldn't find an account…") that leads back to pricing.

**Success:** `board.html` with `<h1>` **"Your project is ready"**, showing the project name and key.

### Happy path

1. On `index.html`, click **Get started** (header, hero or bottom band). This leads to `pricing.html`.
2. On `pricing.html`, scroll past the three plan cards and the comparison table. Click the small grey link
   **"Just exploring? Continue with Fernhill Free"** (y ≈ 1,616px on desktop, ≈ 2,660px on mobile).
   *Alternative:* any **Start free trial** button leads to the same form plus card fields. Any 13–19 digit card
   number (spaces and dashes are fine), any future expiry (`MM/YY` or `MM/YYYY`) and a 3–4 digit CVC are accepted.
3. On `signup.html`, **at 390px first tap "Accept all"** (or "Manage preferences", then "Save choices") on the cookie
   bar. Then fill in:
   - Full name
   - the unlabeled field with placeholder "Work email"
   - a password of **≥ 10 characters including a number and a symbol** (e.g. `Garden-path-42`)
   - Workspace slug: 3–30 letters, digits or hyphens, no spaces (uppercase is lowercased automatically, e.g. `ada-studio`)

   Tick the terms checkbox and click **Submit**.
4. On `projects.html`, click the **unlabeled "+" button** next to "PROJECTS" in the sidebar (on mobile it sits in the
   dark top block). In the "New project" modal, fill **Project name** and **Project key** (2–5 letters, e.g. `WEB`),
   then click **Create**.
5. `board.html` shows "Your project is ready".

### Validation behaviour (for reading transcripts)

- Client-side errors keep the typed values: a missing field, a bad email, a bad slug, card problems or an unticked
  terms box. All of them are joined into one line, e.g. *"Please correct the following: Invalid slug. Terms must be accepted."*
- The password is checked after a ~650 ms "Submitting…" state. A weak password **clears every field** and shows
  *"Password must be at least 10 characters and include a number and a symbol."*

### Deliberate flaws

| ID | Page | Severity | Category | What it is | Fix a good report should suggest |
|---|---|---|---|---|---|
| S1 | index → pricing | critical | flow | **Pricing wall before signup.** Every "Get started" CTA goes to a plan picker. All three cards are paid trials. The free plan exists only as a 13px, low-contrast (#9AA39D on #FAF8F3, ≈ 2.4:1) text link *below the comparison table*, far below the fold. Free is not a column in the comparison table either. | Let people sign up first and choose a plan later, or default to Free. Show Free as a first-class card or column with an equal-weight button. Point "Get started" at signup. |
| S2 | pricing | major | copy | "Start free trial" buttons, but the small footnote says *a credit card is required to start a trial*, and card fields then appear on the signup form. | Say "card required" on or next to the button, or drop the card requirement for trials. |
| S3 | signup | major | a11y | **Email field has no label.** It has only the placeholder "Work email", which disappears while typing, and no required marker. | Add a visible `<label>` ("Work email"). Keep the placeholder for an example only. |
| S4 | signup | major | form | **Password rules are hidden until you fail.** There is no hint under the field. The rules (≥ 10 characters, a number, a symbol) appear only in the error. | Show the rules under the field up front, ideally as a live checklist. |
| S5 | signup | critical | form | **A validation error clears the whole form.** A weak password wipes name, email, password, slug, terms and card fields after "Submitting…". | Preserve entered values (never clear on error). Validate password strength inline before submit. |
| S6 | signup | major | visual | **Errors appear far from the fields in tiny low-contrast text:** one 12px line of pale pink (#D2A9A2 on white, ≈ 2.1:1) above the form. Fields are not highlighted. On mobile the line is off-screen while you are at the button. | Inline error under each field in an accessible red (≥ 4.5:1), linked with `aria-describedby`. Focus or scroll to the first invalid field. |
| S7 | signup | major | copy | **Jargon: "Workspace slug"** with no help text. The format rule is only revealed as "Invalid slug." | Rename it "Workspace URL" and auto-generate it from the name. Show the allowed format and a live preview (`fernhill.app/ada-studio`). |
| S8 | signup | minor | form | **Required fields not marked.** Workspace slug and the Terms checkbox are required but have no `*`, while Full name and Password do. | Mark required fields consistently, or mark the optional ones instead. |
| S9 | signup | minor | copy | **Vague button: "Submit"** instead of describing the outcome. | "Create account" (or "Start free trial" on paid plans). |
| S10 | signup (mobile; also on home, pricing and login) | major | mobile | **The cookie bar covers the primary button at 390px.** The fixed bar is ~155px tall and covers the centre of Submit even at maximum scroll, so you must accept or dismiss cookies before you can submit. On desktop it is a small bottom-left card and does not block. | Don't overlay the primary CTA. Use a smaller banner, or add bottom padding equal to the banner height, or a non-modal top banner. |
| S11 | projects | critical | a11y | **The create-project control is icon-only with no accessible name.** It is a 28×28px "+" next to "PROJECTS" in the sidebar. The empty state *describes* it ("Click + next to Projects in the sidebar…") instead of offering a button, the checklist item "Create your first project" is not clickable, and on mobile there is no visible "sidebar". | Put a labelled "New project" button in the empty state. Add `aria-label="New project"` to the icon button and enlarge it. Make the checklist items actionable. |
| S12 | projects | minor | visual | **A decorative "+" looks clickable.** The empty-state illustration has a large green "+" circle that is not interactive. | Remove the plus from the illustration, or make that element the real button. |
| S13 | projects (modal) | minor | copy | **Jargon: required "Project key"** (2–5 letters) with no explanation. The error is just "Key is required." | Auto-suggest the key from the project name, explain it ("Short code used in task IDs, e.g. WEB-12"), or make it optional. |

---

## 2. Checkout: Larkspur Supply

**Task:** `Buy a medium t-shirt in blue and pay by card`
**Entry:** `samples/checkout/index.html`
**What it is:** an editorial, utilitarian clothing store with product art drawn as inline SVG. The blue colour can
only be found by sight. "Add to bag" gives no feedback. The bag is behind an unlabeled icon. The real price (shipping,
a handling fee and tax) appears only on the last step, behind a button labelled "Continue".

**Pages:** `index.html` → `product.html?id=everyday-tee` → bag drawer (overlay, same page) → `checkout.html` → `payment.html` → `confirmed.html` (success).

**Correct item:** **The Everyday Tee**, colour **Harbor** (the 4th of 5 swatches and the only clearly blue one), size
**M**. Decoys: the Heavyweight Pocket Tee has no blue (Oat, Black, Rust). The Long-Sleeve Rib Tee comes in "Slate", a
blue-grey, and is long-sleeved.

**Success:** `confirmed.html` with `<h1>` **"Order confirmed, #1042"** (rendered uppercase by CSS). The line item
reads **"The Everyday Tee, Harbor / M"**. With standard shipping the total paid is **$43.97**:
$28.00 + $9.95 shipping + $3.50 handling + $2.52 tax.
Wrong-path outcomes still reach this page, so check the line item. Examples: "Bone / M" (the default colour was
kept), the wrong size, or quantity 2 (Add to bag clicked twice).

### Happy path

1. On `index.html`, click the **The Everyday Tee** card in "New arrivals". "Shop new arrivals" scrolls there.
2. On `product.html`, click the **4th colour swatch** (blue). The text next to COLOR changes from "Bone" to
   "Harbor". Click **M**, then click **Add to bag**. At 390px that button is ~2,180px down the page.
3. Nothing visible happens except a small "1" badge on the bag icon (top right). Click the **bag icon** (an unnamed
   button) to open the drawer "Your bag (1)", then click **Checkout**.
4. On `checkout.html`, fill Email, First name, Last name, Street address, City, State (select), ZIP code **and
   Phone** (required, though not marked). Click **Proceed**.
5. On `payment.html`, Standard shipping is preselected. Enter any card number of 13–19 digits, Name on card,
   Expiration as `MM/YY` or `MM/YYYY` (future), and a 3–4 digit Security code. Click **Continue**, which places the order.
6. `confirmed.html` shows "Order confirmed, #1042".

### Deliberate flaws

| ID | Page | Severity | Category | What it is | Fix a good report should suggest |
|---|---|---|---|---|---|
| C1 | checkout → payment | critical | flow | **Surprise costs at the last step.** Shipping ($9.95), a "Handling fee" ($3.50) and tax ($2.52) first appear on the payment page. The bag drawer and the shipping step both show **Total $28.00**. The site-wide banner says "Free shipping on orders over $75", and the fees are otherwise disclosed only in the collapsed "Shipping & returns" accordion. The total jumps 57%. | Show estimated shipping and every fee in the bag and on the first checkout step. Drop or justify the handling fee. Show progress toward the free-shipping threshold. |
| C2 | product | critical | a11y | **Colour swatches are images without alt text.** Each is a `<button>` containing an `<img>` (`data:` SVG) with no `alt` or `aria-label`, so it has no accessible name and no visible colour name. The name appears only *after* selection, and it is "Harbor", not "blue". | Add an accessible name to each swatch ("Harbor blue"). Show colour names visibly or on hover/focus, using names that include the plain colour. |
| C3 | product | minor | form | **Default colour preselected.** The first colour (Bone, off-white) is selected on load. A user who only picks a size gets the wrong colour. | Don't preselect, or make the selected colour very prominent and repeat it in the add-to-bag confirmation. |
| C4 | product | major | feedback | **"Add to bag" has no visible confirmation.** No toast, no mini-bag, no button state change: only a 15px badge on the bag icon. Clicking again silently adds a second unit. | Open a mini-bag or toast ("Added: Everyday Tee, Harbor, M · View bag / Checkout") and change the button state briefly. |
| C5 | header (home, product) | major | a11y | **Icon-only header buttons with no accessible name.** Search, account and bag have no names; the bag's computed name becomes just "1" after adding. The bag icon is the only route to checkout. | `aria-label="Bag, 1 item"` plus a visible "Bag" text label. Name the search and account buttons too. |
| C6 | bag drawer, order summaries | major | copy | **Internal jargon: "SKU variant: EVT-HRB-M"** (and "EVT-HRB-M" in the checkout summary) instead of the colour and size, so users can't verify they picked blue and M. | Show "Color: Harbor (blue) · Size: M" and hide SKUs from shoppers. |
| C7 | checkout (shipping) | major | form | **Phone is required but not marked, and the error is off-screen.** Phone has no `*` while every other required field has one and Apartment says "(optional)". On submit, the only message is a banner at the *top of the page* (off-screen: y ≈ −146px desktop, −491px mobile). The page doesn't scroll, and the phone field only gets a red border with no text. | Mark it required (or make it optional) and say why it's needed. Put an inline error under the field. Move focus and scroll to the first error. |
| C8 | checkout (shipping) | minor | copy | **Vague button: "Proceed."** | "Continue to payment". |
| C9 | payment | critical | copy | **"Continue" actually charges.** The final button places the order and charges the card. There is no review step and the amount isn't on the button. | "Pay $43.97" or "Place order", optionally after a review step. |
| C10 | payment | minor | copy | **Ambiguous expiry format.** The placeholder says `MM/YYYY`, but cards print `MM/YY`. Both are accepted, but the hint makes people hesitate or retype. | "MM / YY" with auto-formatting. |
| C11 | product (mobile) | major | mobile | **Key button far below the fold.** At 390px all four gallery images stack full-width before the title, so "Add to bag" sits ~2,180px down (≈ 2.6 screens). | A swipeable gallery, with title, price and options above the fold and a sticky "Add to bag" bar. |
| C12 | product (mobile) | major | mobile | **Tiny tap targets.** Size buttons shrink to 26×26px with 4px gaps at 390px (52×44px on desktop). | Tap targets of at least 44×44px. |

---

## 3. Booking: Marlowe Studio

**Task:** `Book a haircut for next Saturday afternoon`
**Entry:** `samples/booking/index.html`
**What it is:** a warm, serif, boutique salon site. Services have insider names, times are in 24-hour format, and
booked slots look almost the same as free ones. The Continue button looks disabled. You must create a full account,
including date of birth in DD/MM/YYYY, before the booking is confirmed.

**Pages:** `index.html` → `services.html` → `time.html` → `details.html` → `booked.html` (success).

**Correct outcome:** any **cut** service (Signature Cut & Finish, Express Restyle, or Clipper Cut & Detail).
Fringe Detail is borderline, and Restyle Consultation is *not* a haircut. It must be booked on **the first Saturday
after today**. If today is a Saturday, that means 7 days later; persona agents may reasonably read "next Saturday" as
the one in the following week, so treat that as a soft miss. The **start time must be 12:00 or later**.

- Dates are computed in JS from the browser's "today". The strip shows 7 days starting today; the unnamed ‹ › arrows
  page through up to 3 weeks. Sunday and Monday are labelled "Closed".
- **Every Saturday has the same availability:**
  - Available: 10:00, 11:30, **14:30, 15:30, 16:00, 17:00**
  - Booked (disabled): 09:00, 09:30, 10:30, 11:00, **12:00, 12:30, 13:00, 13:30, 14:00, 15:00**, 16:30

  So the earliest afternoon slots all fail silently.
- Weekday availability is pseudo-random per date but deterministic. For today, slots earlier than now + 1h are disabled.

**Success:** `booked.html` with `<h1>` **"You're booked"** and the lead text "See you on **Saturday 24 October at
15:30**…" (the date depends on the run date).

### Happy path

1. On `index.html`, click **Book an appointment** (hero) or **Book now** (header).
2. On `services.html`, click the **Select** button in the first row under CUT & FINISH ("Signature Cut & Finish").
3. On `time.html`, click the **Saturday** day chip (e.g. "SAT 24"). If today is a Saturday, first click the unnamed
   **›** arrow. Click an *enabled* afternoon slot (14:30, 15:30, 16:00 or 17:00), then click the pale **Continue**.
4. On `details.html`, an account is required. Fill First name, Last name, Email, Mobile number, Date of birth **as
   DD/MM/YYYY** (e.g. `14/03/1988`), Create password (≥ 8 characters) and Confirm password. Tick the booking-policy
   checkbox and click **Proceed**.
5. `booked.html` shows "You're booked".

### Deliberate flaws

| ID | Page | Severity | Category | What it is | Fix a good report should suggest |
|---|---|---|---|---|---|
| B1 | details | critical | flow | **Forced account creation mid-flow.** A password, a password confirmation and date of birth are required before the booking is confirmed. There is no guest option, and "Log in" is a dead end ("We couldn't find a Marlowe account…"). | Allow guest booking with name, email and phone. Offer to create an account (or a magic link) *after* confirmation. |
| B2 | services | major | copy | **No service is called a "haircut".** The names are insider terms ("Signature Cut & Finish", "Express Restyle", "Clipper Cut & Detail"). Prices say "from $X*", and the stylist levels (Associate, Senior, Director) are explained only in a footnote at the bottom. | Use plain names ("Haircut & blow-dry", "Quick trim") under a "Haircuts" heading, and show price per stylist level inline. |
| B3 | services | minor | a11y | **Nine identical "Select" buttons** with no service context in their accessible names. | `aria-label="Select Signature Cut & Finish"`, or make the whole row the control. |
| B4 | time | major | copy | **24-hour times with no AM/PM or Morning/Afternoon grouping** ("13:00", "15:30"), on a site that otherwise uses $ and US phone numbers. People looking for "afternoon" must translate. | "3:30 PM" format for this audience, grouped into Morning / Afternoon / Evening. |
| B5 | time | major | feedback | **Disabled slots look selectable.** Booked slots are disabled but nearly identical to free ones: slightly greyer text, the same border, no strikethrough, no legend, no tooltip. Clicking does nothing. On Saturdays 12:00–14:00 are all booked. | Hide unavailable slots, or mark them clearly ("Booked", strikethrough, legend). Say "Next available: 14:30". |
| B6 | time | major | visual | **Low-contrast primary CTA.** "Continue" is pale champagne (#D8C5AC) with white text, a **1.64:1** contrast ratio. It looks disabled even after a time is selected. | Use the dark brand colour (≥ 4.5:1). Show a disabled look only when the button is actually disabled. |
| B7 | time (mobile) | major | mobile | **Tiny tap targets.** At 390px the time slots shrink to ~56×24px with 4px gaps (129×42px on desktop). | At least 44px tall, fewer columns. |
| B8 | time | minor | a11y | **Icon-only week arrows with no accessible name.** The ‹ › buttons are 24px. They are needed whenever "next Saturday" falls outside the first 7 days, for example when today is a Saturday. | `aria-label="Previous week"` and `"Next week"`, larger targets, or show 14 days. |
| B9 | details | major | form | **Ambiguous date-of-birth format.** Date of birth is required (for a haircut) and must be DD/MM/YYYY. A US-style `03/14/1985` is rejected with "Enter a valid date of birth." The format exists only as a placeholder that disappears on typing. | Don't require date of birth for cuts. If it is needed, use separate Day / Month / Year fields or a date picker with a persistent format hint. |
| B10 | details | minor | copy | **Vague button: "Proceed"** creates the account *and* confirms the booking in one click, with no review step. | "Confirm booking". |
| B11 | details | minor | form | **Marketing opt-in checkbox is pre-checked.** | Leave it unchecked by default. |
| B12 | all pages (mobile) | minor | mobile | **The app-promo bar overlays content.** At 390px a fixed bar ("Book faster in the Marlowe app", ~77px) covers the bottom of every page and partly covers Continue/Proceed as you scroll to them. Its close "×" has no accessible name. | Don't overlay CTAs (or add bottom padding), use a labelled close button, and show it once. |

---

## Quick reference: flaws by category

| Category | Signup | Checkout | Booking |
|---|---|---|---|
| flow | S1 | C1 | B1 |
| copy | S2, S7, S9, S13 | C6, C8, C9, C10 | B2, B4, B10 |
| form | S4, S5, S8 | C3, C7 | B9, B11 |
| visual | S6, S12 | | B6 |
| a11y | S3, S11 | C2, C5 | B3, B8 |
| mobile | S10 | C11, C12 | B7, B12 |
| feedback | | C4 | B5 |

A good report on each flow should surface at least the **critical** rows and most of the **major** rows. Each
finding should come with an annotated screenshot of the right page and a concrete fix close to the "Fix" column.
