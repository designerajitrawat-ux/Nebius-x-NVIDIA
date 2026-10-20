"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { ApiRequestError, createRun } from "@/lib/api";
import { normaliseUrl } from "@/lib/format";
import type { SampleInfo } from "@/lib/types";

type Sample = Pick<SampleInfo, "id" | "title">;

/** What the person is doing with the form, so the hero's characters can react to it. */
export type FormActivity = "idle" | "url" | "task" | "ready" | "submitting" | "error";

const PRESETS = [
  "Sign up and create your first project",
  "Start a free trial",
  "Buy a product and pay by card",
  "Book an appointment",
];

export function StartForm({
  samples,
  demoMode,
  onBudgetExhausted,
  status,
  onActivity,
}: {
  samples: Sample[];
  /** Hard budget reached: no new runs, samples only. */
  demoMode: boolean;
  onBudgetExhausted: () => void;
  /** Quiet status lines (waking, dry run, soft budget) rendered under the actions. */
  status?: ReactNode;
  onActivity?: (activity: FormActivity) => void;
}) {
  const router = useRouter();
  const formId = useId();
  const [url, setUrl] = useState("");
  const [task, setTask] = useState("");
  const [audience, setAudience] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAudience, setShowAudience] = useState(false);
  const [focus, setFocus] = useState<"url" | "task" | null>(null);

  const ready = /\.[a-z]{2,}/i.test(url) && task.trim().length >= 3;
  const activity: FormActivity = submitting
    ? "submitting"
    : urlError || taskError || formError
      ? "error"
      : ready
        ? "ready"
        : focus ?? "idle";
  useEffect(() => onActivity?.(activity), [activity, onActivity]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || demoMode) return;
    setFormError(null);

    const normalised = normaliseUrl(url);
    const trimmedTask = task.trim();
    setUrlError(normalised ? null : "Enter a full web address, like your-site.com or https://your-site.com.");
    setTaskError(trimmedTask.length >= 3 ? null : "Say what the five users should try to do, like “Sign up and create a project”.");
    if (!normalised || trimmedTask.length < 3) {
      document.getElementById(normalised ? `${formId}-task` : `${formId}-url`)?.focus();
      return;
    }
    setUrl(normalised);

    setSubmitting(true);
    try {
      const trimmedAudience = audience.trim();
      const { run_id } = await createRun({
        url: normalised,
        task: trimmedTask,
        ...(trimmedAudience ? { audience: trimmedAudience } : {}),
      });
      router.push(`/run/${encodeURIComponent(run_id)}`);
    } catch (err) {
      setSubmitting(false);
      const apiError = err instanceof ApiRequestError ? err : null;
      if (apiError?.code === "budget_exhausted") {
        onBudgetExhausted();
        return;
      }
      if (apiError?.code === "bad_url") {
        setUrlError(apiError.message);
        document.getElementById(`${formId}-url`)?.focus();
        return;
      }
      setFormError(apiError?.message ?? "Something went wrong while starting the test. Try again in a moment.");
    }
  }

  const fieldError = urlError || taskError;

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby={formError ? `${formId}-error` : undefined}>
      <fieldset disabled={demoMode} className="min-w-0">
        <legend className="sr-only">Test setup</legend>

        {/* The command bar: one glowing pill holding the site, the task and the button. */}
        <div className="glow-ring relative z-10 rounded-[30px] p-[2px] shadow-float">
          <div className="flex flex-col gap-1 rounded-[28px] bg-white p-2 md:flex-row md:items-stretch md:gap-0">
            <Field
              id={`${formId}-url`}
              label="Your website"
              icon="lock"
              invalid={!!urlError}
              className="md:w-[38%]"
              value={url}
              onChange={(v) => {
                setUrl(v);
                if (urlError) setUrlError(null);
              }}
              onFocus={() => setFocus("url")}
              onBlur={() => setFocus(null)}
              placeholder="your-site.com"
              inputMode="url"
              autoComplete="url"
              maxLength={500}
            />
            <span aria-hidden="true" className="mx-1 hidden w-px self-stretch bg-lilac-2 md:block" />
            <Field
              id={`${formId}-task`}
              label="What should they try to do?"
              icon="flag"
              invalid={!!taskError}
              className="md:flex-1"
              value={task}
              onChange={(v) => {
                setTask(v);
                if (taskError) setTaskError(null);
              }}
              onFocus={() => setFocus("task")}
              onBlur={() => setFocus(null)}
              placeholder="Sign up and create your first project"
              maxLength={300}
            />
            {demoMode ? null : (
              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="btn-lime h-14 w-full shrink-0 rounded-[22px] px-7 text-17 md:h-auto md:w-auto"
              >
                {submitting ? "Starting…" : "Run the test"}
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h9.5M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {fieldError ? (
          <p id={`${formId}-field-error`} role="alert" className="mt-3 text-center text-13 font-medium text-signal-ink">
            {fieldError}
          </p>
        ) : null}

        {!demoMode ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-13 text-ink-2">Try a task:</span>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setTask(p);
                  setTaskError(null);
                  document.getElementById(url ? `${formId}-task` : `${formId}-url`)?.focus();
                }}
                className={`h-8 rounded-full border px-3 text-13 font-medium transition-all duration-200 hover:-translate-y-0.5 ${
                  task === p ? "border-violet bg-violet text-white" : "border-white bg-white/70 text-ink hover:bg-white hover:shadow-soft"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        ) : null}

        {showAudience ? (
          <div className="mx-auto mt-4 max-w-[560px]">
            <label htmlFor={`${formId}-audience`} className="block text-center text-13 text-ink-2">
              Who are your users? <span className="text-ink-2/70">(optional)</span>
            </label>
            <input
              id={`${formId}-audience`}
              name="audience"
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="First-time users of a project planning tool"
              maxLength={200}
              autoComplete="off"
              className="mt-2 h-11 w-full rounded-full border border-white bg-white/80 px-5 text-15 text-ink outline-none placeholder:text-ink-2/60 focus:bg-white focus:shadow-[0_0_0_2px_var(--color-violet)]"
            />
          </div>
        ) : null}
      </fieldset>

      {demoMode ? (
        <p className="mt-5 text-center text-15 text-ink">
          Demo mode: explore the sample reports. New runs are paused because this demo has used its model credits.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-13 text-ink-2">
        {!showAudience && !demoMode ? (
          <button type="button" onClick={() => setShowAudience(true)} className="font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
            + Describe your audience
          </button>
        ) : null}
        <SampleLinks samples={samples} lead={demoMode ? "Samples:" : "Or open a finished report:"} />
      </div>

      {formError ? (
        <p id={`${formId}-error`} role="alert" className="mx-auto mt-4 max-w-[64ch] rounded-card bg-signal-soft px-4 py-3 text-center text-15">
          {formError}
        </p>
      ) : null}
      {status ? <div className="mt-4 flex flex-col items-center gap-1 text-center">{status}</div> : null}
    </form>
  );
}

function SampleLinks({ samples, lead }: { samples: Sample[]; lead: string }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>{lead}</span>
      {samples.map((sample, i) => (
        <Link
          key={`${sample.title}-${i}`}
          href={`/r/${encodeURIComponent(sample.id)}`}
          className="group inline-flex items-center gap-1 font-medium text-violet"
        >
          {sample.title}
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      ))}
    </span>
  );
}

const ICONS = {
  lock: (
    <>
      <rect x="3" y="7" width="10" height="7.5" rx="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2" stroke="currentColor" strokeWidth="1.3" />
    </>
  ),
  flag: <path d="M3.5 14.5v-12m0 .5h8l-1.6 3 1.6 3h-8" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />,
} as const;

function Field({
  id,
  label,
  icon,
  invalid,
  className = "",
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  maxLength,
  inputMode,
  autoComplete,
}: {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
  invalid: boolean;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder: string;
  maxLength: number;
  inputMode?: "url" | "text";
  autoComplete?: string;
}) {
  return (
    <div
      className={`group flex min-w-0 items-center gap-3 rounded-[22px] px-4 py-2.5 transition-colors duration-200 hover:bg-mist focus-within:bg-mist ${
        invalid ? "bg-signal-soft" : ""
      } ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-ink-2 transition-colors group-focus-within:text-violet">
        {ICONS[icon]}
      </svg>
      <div className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={id} className="text-[11px] font-semibold tracking-[0.08em] text-ink-2 uppercase">
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          required
          inputMode={inputMode}
          autoComplete={autoComplete ?? "off"}
          spellCheck={inputMode === "url" ? false : undefined}
          autoCapitalize={inputMode === "url" ? "none" : undefined}
          aria-invalid={invalid || undefined}
          className="h-8 w-full min-w-0 bg-transparent text-17 font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-2/55 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
