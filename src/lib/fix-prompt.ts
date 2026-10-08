/**
 * Generates a copy-paste prompt for AI coding agents (Muse, ChatGPT, etc.)
 * to fix the specific issues found in an Auditify scan.
 *
 * The key value: this prompt contains REAL measured data (actual missing
 * headers, real metrics, specific URLs) that the AI wouldn't otherwise have.
 */

export type PromptIssue = {
  title: string;
  severity: "FAIL" | "WARN";
  metric: string;
  detail: string;
  fix: string;
};

export function buildFixPrompt(opts: {
  url: string;
  host: string;
  score: number;
  grade: string;
  issues: PromptIssue[];
}): string {
  const { url, host, score, grade, issues } = opts;

  const fails = issues.filter((i) => i.severity === "FAIL");
  const warns = issues.filter((i) => i.severity === "WARN");

  const formatIssue = (i: PromptIssue, idx: number) =>
    `### ${idx + 1}. ${i.title} [${i.severity}]\n` +
    `- Measured: ${i.metric}\n` +
    `- Why it matters: ${i.detail}\n` +
    `- Recommended fix: ${i.fix}`;

  const lines = [
    `# Fix my website — measured audit results`,
    ``,
    `My site ${url} was scanned by Auditify and scored ${score}/100 (Grade ${grade}).`,
    `Below are the real measured issues, in priority order. Fix them one by one.`,
    ``,
    `## Critical issues (${fails.length})`,
    ``,
    ...fails.map((i, idx) => formatIssue(i, idx)),
    ``,
    `## Warnings (${warns.length})`,
    ``,
    ...warns.map((i, idx) => formatIssue(i, fails.length + idx)),
    ``,
    `## Instructions`,
    ``,
    `- Fix the critical issues first, then warnings.`,
    `- For each fix, show me the exact code or config change needed.`,
    `- If a fix depends on my hosting setup, ask me what I use (Vercel, Nginx, Apache, etc.) before guessing.`,
    `- After explaining all fixes, give me a checklist I can verify each one with.`,
    `- Do not suggest anything not listed above — stick to these measured issues.`,
  ];

  return lines.join("\n");
}
