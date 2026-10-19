"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ApiRequestError, createRun } from "@/lib/api";
import { normaliseUrl } from "@/lib/format";
import type { SampleInfo } from "@/lib/types";

type Sample = Pick<SampleInfo, "id" | "title">;

export function StartForm({
  samples,
  demoMode,
  onBudgetExhausted,
  status,
}: {
  samples: Sample[];
  /** Hard budget reached: no new runs, samples only. */
  demoMode: boolean;
  onBudgetExhausted: () => void;
  /** Quiet status lines (waking, dry run, soft budget) rendered under the actions. */
  status?: ReactNode;
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

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby={formError ? `${formId}-error` : undefined}>
      <fieldset disabled={demoMode} className="min-w-0">
        <legend className="sr-only">Test setup</legend>
        <div className="rounded-control border border-line bg-card">
          <FieldRow
            id={`${formId}-url`}
            label="Site"
            error={urlError}
            input={{
              name: "url",
              value: url,
              onChange: (v) => {
                setUrl(v);
                if (urlError) setUrlError(null);
              },
              placeholder: "e.g. your-site.com",
              inputMode: "url",
              autoComplete: "url",
              maxLength: 500,
              required: true,
            }}
          />
          <FieldRow
            id={`${formId}-task`}
            label="Task"
            error={taskError}
            input={{
              name: "task",
              value: task,
              onChange: (v) => {
                setTask(v);
                if (taskError) setTaskError(null);
              },
              placeholder: "e.g. Sign up and create your first project",
              maxLength: 300,
              required: true,
            }}
          />
          <FieldRow
            id={`${formId}-audience`}
            label="Audience"
            hint="Optional"
            input={{
              name: "audience",
              value: audience,
              onChange: setAudience,
              placeholder: "e.g. First-time users of a project planning tool",
              maxLength: 200,
            }}
          />
        </div>
      </fieldset>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
        {demoMode ? (
          <p className="max-w-[46ch] text-15 text-ink">
            Demo mode: explore the sample reports. New runs are paused because this demo has used its model
            credits.
          </p>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="btn-primary self-start"
          >
            {submitting ? "Starting the test…" : "Run the test"}
          </button>
        )}
        <SampleLinks samples={samples} lead={demoMode ? "Samples:" : "or try a sample:"} />
      </div>

      {formError ? (
        <p id={`${formId}-error`} role="alert" className="mt-4 max-w-[64ch] rounded-control bg-signal-soft px-4 py-3 text-15">
          {formError}
        </p>
      ) : null}
      {status ? <div className="mt-4 flex flex-col gap-1">{status}</div> : null}
    </form>
  );
}

function SampleLinks({ samples, lead }: { samples: Sample[]; lead: string }) {
  return (
    <p className="text-15 text-ink-2">
      {lead}{" "}
      {samples.map((sample, i) => (
        <span key={`${sample.title}-${i}`}>
          {i > 0 ? <span aria-hidden="true"> · </span> : null}
          <Link href={`/r/${encodeURIComponent(sample.id)}`} className="link rounded-[2px] font-medium">
            {sample.title}
          </Link>
        </span>
      ))}
    </p>
  );
}

interface InputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  required?: boolean;
  inputMode?: "url" | "text";
  autoComplete?: string;
}

function FieldRow({
  id,
  label,
  hint,
  error,
  input,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  input: InputProps;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="relative border-t border-line first:border-t-0 first:rounded-t-control last:rounded-b-control focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-ink">
      <div className="flex flex-col sm:flex-row sm:items-center">
        <label
          htmlFor={id}
          className="flex shrink-0 justify-between px-4 pt-3 text-13 text-ink-2 sm:block sm:w-32 sm:py-0"
        >
          {label}
          {hint ? <span className="sm:sr-only">{hint}</span> : null}
        </label>
        <input
          id={id}
          name={input.name}
          type="text"
          value={input.value}
          onChange={(e) => input.onChange(e.target.value)}
          placeholder={input.placeholder}
          maxLength={input.maxLength}
          required={input.required}
          inputMode={input.inputMode}
          autoComplete={input.autoComplete ?? "off"}
          spellCheck={input.inputMode === "url" ? false : undefined}
          autoCapitalize={input.inputMode === "url" ? "none" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-11 w-full min-w-0 bg-transparent px-4 text-15 text-ink outline-none placeholder:text-ink-2 disabled:cursor-not-allowed disabled:text-ink-2 sm:h-14 sm:flex-1 sm:pl-0"
        />
        {hint ? (
          <span aria-hidden="true" className="hidden shrink-0 pr-4 text-13 text-ink-2 sm:block">
            {hint}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="px-4 pb-3 text-13 text-signal-ink sm:pl-32">
          {error}
        </p>
      ) : null}
    </div>
  );
}
