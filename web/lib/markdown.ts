/**
 * Client-side Markdown for a report. The API's /reports/{id}.md is the primary export;
 * this is used for the fixture and as a fallback when that download fails.
 */
import { formatCost, formatDate, formatDuration } from "./format";
import { FIX_LABEL, OUTCOME_LABEL, SEVERITY_LABEL } from "./labels";
import type { Report } from "./types";

export function reportToMarkdown(report: Report): string {
  const name = (id: string) => report.personas.find((p) => p.id === id)?.name ?? id;
  const out: string[] = [];

  out.push(`# ${report.headline}`, "", report.subline, "");
  out.push(
    `${report.task} · ${report.site} · ${formatDate(report.created_at)} · ${report.total} personas · ${report.completed} completed`,
    "",
  );
  if (report.mode === "dry_run") out.push("> Dry run, persona decisions were scripted; no models were called.", "");
  if (report.degraded) out.push("> Written by Nemotron Super because Ultra was unavailable.", "");

  out.push("## Issues", "");
  for (const issue of report.issues) {
    out.push(`### ${issue.id}. ${SEVERITY_LABEL[issue.severity]}, ${issue.title}`, "");
    out.push(`Screen: ${issue.screen_label} · Hit by ${issue.personas_hit.map(name).join(", ")}`, "");
    if (issue.quote) out.push(`> “${issue.quote.text}”, ${name(issue.quote.persona_id)}`, "");
    out.push(issue.why, "");
    out.push(`**${FIX_LABEL[issue.fix.type]}:** ${issue.fix.summary}`, "");
    if (issue.fix.type === "css") {
      if (issue.fix.after) out.push("```css", issue.fix.after, "```", "");
    } else {
      if (issue.fix.before) out.push(`- Before: ${issue.fix.before}`);
      if (issue.fix.after) out.push(`- After: ${issue.fix.after}`);
      if (issue.fix.before || issue.fix.after) out.push("");
    }
    if (issue.refs.length > 0) {
      out.push("See how others do it (via Tavily):");
      for (const ref of issue.refs) out.push(`- [${ref.title}](${ref.url})${ref.note ? `, ${ref.note}` : ""}`);
      out.push("");
    }
  }

  out.push("## Friction map", "", "| Screen | Path | Confused or quit | Worst issue |", "|---|---|---|---|");
  for (const row of report.friction_map) {
    out.push(`| ${row.label} | ${row.path} | ${row.hits} of ${row.visits} | ${row.worst_issue_id ?? "-"} |`);
  }
  out.push("");

  out.push("## Personas", "", "| Persona | Outcome | Steps | Time |", "|---|---|---|---|");
  for (const p of report.personas) {
    out.push(`| ${p.name}, ${p.age}, ${p.archetype} | ${OUTCOME_LABEL[p.outcome]} | ${p.steps} | ${formatDuration(p.seconds)} |`);
  }
  out.push("");

  if (report.expert.length > 0) {
    out.push("## Expert review", "", "| Screen | Heuristic | Finding | Suggestion | Severity |", "|---|---|---|---|---|");
    for (const f of report.expert) {
      out.push(`| ${f.screen_label} | ${f.heuristic} | ${f.finding} | ${f.suggestion} | ${SEVERITY_LABEL[f.severity]} |`);
    }
    out.push("");
  }

  out.push("## Model usage", "", "| Model | Calls | Tokens in | Tokens out | Cost |", "|---|---|---|---|---|");
  for (const r of report.usage.rows) {
    out.push(`| ${r.label || r.model} | ${r.calls} | ${r.prompt_tokens} | ${r.completion_tokens} | ${formatCost(r.cost_usd)} |`);
  }
  out.push("", `Total cost of this run: ${formatCost(report.usage.total_cost_usd)}`, "");

  return out.join("\n");
}
