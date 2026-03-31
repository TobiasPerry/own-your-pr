# own-your-pr

A GitHub Action that enforces structured PR descriptions. Every PR must include a video walkthrough, rollout explanation, risk assessment, and incident ownership statement — or the check fails.

## Quick Start

**1. Add the workflow** — create `.github/workflows/own-your-pr.yml`:

```yaml
name: Own Your PR

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  own-your-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/own-your-pr@v1
```

**2. Add the PR template** — create `.github/pull_request_template.md`:

```markdown
## Video

<!-- Paste a Loom, YouTube, Google Drive, or Vimeo link -->

## What does this do? How does it behave once rolled out?

<!-- Explain what this change does and how it affects users -->

## How can this adversely impact production or customers?

<!-- Describe risks, failure modes, or things that could go wrong -->

## Am I comfortable owning an incident tied to this code?

<!-- Yes/No and why — be honest -->
```

**3. Make it required** — go to your repo's **Settings → Rules → Rulesets** (or **Settings → Branches → Branch protection rules**). Add `own-your-pr` as a required status check on your default branch.

## Custom Sections

Create `.own-your-pr.yml` in your repo root to customize the required sections:

```yaml
sections:
  - heading: "Video"
    required: true
    validate: "url"
  - heading: "What changed?"
    required: true
  - heading: "Risk assessment"
    required: false
```

- `required: true` (default) — the section must exist and be non-empty
- `required: false` — the section is optional
- `validate: "url"` — the section must contain an `https://` or `http://` URL

When no config file is present, the action uses the four default sections shown in the PR template above.

## How It Works

1. Author opens a PR — the template appears automatically
2. Author fills in each section
3. The action reads the PR body on `opened`, `edited`, and `synchronize` events
4. If any required section is missing or empty, the check fails with a clear message
5. Branch protection rules prevent merge until the check passes

## Error Output

When sections are missing or empty, the action fails with:

```
❌ Own Your PR — missing or empty sections:

  • Video — must contain a URL
  • How can this adversely impact production or customers? — section is empty

Fill in all required sections in your PR description and push or edit to re-run.
```
