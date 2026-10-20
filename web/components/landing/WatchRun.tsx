import { HeroStage } from "./HeroStage";
import { Reveal, SectionIntro } from "./Reveal";

/** The demo loop, moved out of the hero so the form owns the first screen. */
export function WatchRun() {
  return (
    <section aria-labelledby="watch-title" className="page py-16 sm:py-24">
      <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
        <div>
          <SectionIntro
            id="watch-title"
            eyebrow="Watch a run"
            title={
              <>
                See where they <span className="marker">get stuck</span>, as it happens.
              </>
            }
            lede="This is our Fernhill sample. Each character is a persona working through the same pricing page. When something confuses them you see it on their face, hear it in their words, and a pin lands on the exact spot."
          />
          <Reveal delay={0.15} className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ["Their face", "Calm, confused, worried or fed up: the confusion score of every step."],
              ["Their words", "What the persona was thinking, quoted in the report."],
              ["The pin", "Taken from the page's own layout, so it lands on the real element."],
              ["The verdict", "Who finished, who gave up, and why."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-[18px] bg-white/70 p-4 shadow-soft">
                <p className="text-15 font-semibold text-ink">{t}</p>
                <p className="mt-1 text-13 leading-relaxed text-ink-2">{d}</p>
              </div>
            ))}
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <HeroStage />
        </Reveal>
      </div>
    </section>
  );
}
