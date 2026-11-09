# Agent Operating Rules & Invariants

## Project Architecture & Commands
- Stack: React 19 / TypeScript / Vite / Tailwind CSS v4 / Firebase / Vitest / Oxlint
- Test Command: `npm test`
- Lint Command: `npm run lint`
- Build Command: `npm run build`

## Non-Negotiable Invariants (Strict)
1. **Never Weaken Tests:** When tests fail, do NOT edit assertions, comment out tests, or relax linter configurations to get a green exit code. Always fix the implementation code.
2. **Red-to-Green Verification:** When fixing a bug or adding a feature, write or identify a failing test demonstrating the issue first. Verify the failure, then write the minimal implementation to turn it green.
3. **Deterministic Verification Gate:** Before declaring any task complete, run lint, build, and test commands in the terminal (`npm run lint && npm test && npm run build`). Resolve all errors before asking the user for review.
4. **No Code Writes During Spec Phase:** When planning or drafting specifications, all project code files are strictly read-only.
5. **No Phantom Passing (Over-Mocking):** Mocking is permitted only at external I/O boundaries (e.g., third-party network APIs). Never mock internal modules or the unit under test to bypass real verification.
6. **No Unvetted Dependencies & Slopsquatting Protection:** Never install new packages (`npm install`, `pip install`, etc.) without explicit user permission. Always verify that package names exist in the official registry (e.g., via `npm view <package>`) before suggesting them to guard against hallucinated malicious packages.
7. **No Unprompted Architectural Drift:** Do not alter schema definitions, change global configs, or create top-level directories without explicit user authorization.
8. **Isolated Blast Radius:** Restrict edits strictly to files relevant to the active task.

## MCP Tooling & External Integrations
- Active Project MCPs: None by default.
- Principle: When an MCP tool exists for an external service (database queries, browser automation, API docs), use the dedicated MCP tool instead of executing ad-hoc shell scripts or temporary one-off code files.

## Dynamic Skills Index (Consult On-Demand)
- When planning non-trivial features: read `skills/spec-workflow/SKILL.md`
- When requested to review code or diffs: read `skills/code-review/SKILL.md`
- When running periodic maintenance / health checks: read `skills/health-audit/SKILL.md`

## The Two-Strike Rule for Custom Skills
- If you have to be corrected twice on project-specific setup or conventions, capture the pattern into a new skill under `skills/<topic>/SKILL.md` so you never forget it, or recommend running the `/learn` slash command.
