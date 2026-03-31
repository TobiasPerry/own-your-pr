# own-your-pr Design Spec

## Overview

A GitHub Action that enforces PR quality by requiring authors to fill in structured sections before merge. Ships as a reusable JavaScript action with a PR template and optional config file.

## Repository Structure

```
own-your-pr/
├── action.yml                    # GitHub Action metadata
├── src/
│   ├── index.js                  # Entry point — reads PR body, loads config, validates
│   ├── parse.js                  # Extracts sections from PR body markdown
│   ├── validate.js               # Checks each section against rules
│   └── config.js                 # Loads and merges .own-your-pr.yml with defaults
├── dist/
│   └── index.js                  # ncc-bundled output (committed, no node_modules at runtime)
├── __tests__/
│   ├── parse.test.js
│   ├── validate.test.js
│   └── config.test.js
├── .github/
│   ├── pull_request_template.md  # The reusable PR template
│   └── workflows/
│       └── own-your-pr.yml       # Example workflow (also used by this repo itself)
├── .own-your-pr.yml              # Example config (also used by this repo itself)
├── package.json
└── README.md
```

## Default Sections

These four sections are baked into the action as defaults. They are used when no `.own-your-pr.yml` config file is present.

1. **Video** — must contain a URL (Loom, YouTube, Google Drive, Vimeo, etc.)
2. **What does this do? How does it behave once rolled out?** — free text, must be non-empty
3. **How can this adversely impact production or customers?** — free text, must be non-empty
4. **Am I comfortable owning an incident tied to this code?** — free text, must be non-empty

## PR Template

The `.github/pull_request_template.md` uses H2 headings matching the default section headings, each followed by an HTML comment as a placeholder hint. The action considers a section "empty" if it only contains whitespace and/or the HTML comment.

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

## Config File (`.own-your-pr.yml`)

```yaml
sections:
  - heading: "Video"
    required: true
    validate: "url"
  - heading: "What does this do? How does it behave once rolled out?"
    required: true
  - heading: "How can this adversely impact production or customers?"
    required: true
  - heading: "Am I comfortable owning an incident tied to this code?"
    required: true
```

Rules:
- **No config file present**: uses the four defaults above.
- **Config file present**: completely replaces the defaults (not merged — the file is the source of truth).
- `validate: "url"` means the section body must contain at least one `https?://` URL. This is the only validation type beyond "not empty".
- `required: false` makes a section optional — the action won't fail if it's empty.
- Bad config (malformed YAML, missing `sections` array, missing `heading` on an entry) causes the action to fail with a clear parse error, not a silent fallback.

## Action Implementation

### Entry point (`src/index.js`)
- Reads `github.event.pull_request.body`
- Calls `config.js` to load `.own-your-pr.yml` from the repo root (falls back to defaults)
- Calls `parse.js` to extract sections from the PR body
- Calls `validate.js` to check each required section
- On failure: calls `core.setFailed()` with a message listing which sections are missing/empty
- On success: logs a confirmation

### Parser (`src/parse.js`)
- Splits the PR body by `## ` headings
- Returns a map of `{ heading: body }` pairs
- Strips HTML comments from body content before checking emptiness
- Case-insensitive heading match

### Validator (`src/validate.js`)
- For each configured section where `required: true`:
  - Check that the heading exists in the parsed map
  - Check that the body is non-empty after stripping comments and whitespace
  - If `validate: "url"`, check body contains an `https?://` pattern
- Returns a list of error objects (empty list = pass)

### Config (`src/config.js`)
- Reads `.own-your-pr.yml` from workspace root using `fs`
- If not found, returns the hardcoded defaults
- Validates the YAML shape (must have `sections` array, each entry must have `heading` string)
- Bad config = action fails with a clear error

### Bundling
- `@vercel/ncc` compiles everything into `dist/index.js`
- `dist/` is committed so the action runs without `npm install` at runtime

## action.yml

```yaml
name: "Own Your PR"
description: "Enforce structured PR descriptions with video, rollout explanation, risk assessment, and incident ownership"
inputs: {}
runs:
  using: "node20"
  main: "dist/index.js"
```

## Example Workflow

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
      - uses: ./  # self-reference; consumers use owner/own-your-pr@v1
```

Triggers on `opened`, `edited` (body changed), and `synchronize` (new commits) so the check re-runs when the author updates their PR description.

## Error UX

When validation fails, the action outputs:

```
❌ Own Your PR — missing or empty sections:

  • Video — must contain a URL (Loom, YouTube, Drive, Vimeo, etc.)
  • How can this adversely impact production or customers? — section is empty

Fill in all required sections in your PR description and push or edit to re-run.
```

## Branch Protection

Documentation-only. The README explains how to add `own-your-pr` as a required status check in branch protection rules or rulesets. The repo itself cannot configure this.

## Testing

Unit tests with Vitest:
- `parse.test.js` — extracts headings/bodies correctly, handles missing headings, strips HTML comments, case-insensitive matching
- `validate.test.js` — passes when all sections filled, fails on empty sections, fails on missing URL when `validate: "url"`, handles `required: false`
- `config.test.js` — loads YAML correctly, falls back to defaults when no file, fails on malformed YAML

No integration/E2E tests. The action logic is pure functions (string in, errors out). Mocking `@actions/core` and `@actions/github` in unit tests is sufficient.
