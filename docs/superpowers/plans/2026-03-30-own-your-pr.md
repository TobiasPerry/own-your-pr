# own-your-pr Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Action that validates PR descriptions contain required sections (video link, rollout explanation, risk assessment, incident ownership) before merge.

**Architecture:** Pure-function JavaScript action. Config loader reads `.own-your-pr.yml` or falls back to hardcoded defaults. Parser splits PR body by H2 headings. Validator checks each required section. Entry point wires them together and calls `core.setFailed()` on errors. Bundled with `@vercel/ncc` into `dist/index.js`.

**Tech Stack:** Node.js 20, `@actions/core`, `@actions/github`, `js-yaml`, Vitest, `@vercel/ncc`

---

## File Structure

```
own-your-pr/
├── action.yml                       # Action metadata — node20, points to dist/index.js
├── package.json                     # Dependencies and scripts
├── vitest.config.js                 # Vitest config
├── src/
│   ├── defaults.js                  # Hardcoded default sections array
│   ├── config.js                    # Load .own-your-pr.yml, validate shape, fall back to defaults
│   ├── parse.js                     # Split PR body into { heading: body } map
│   ├── validate.js                  # Check parsed sections against config rules
│   └── index.js                     # Entry point — wire config/parse/validate, call core.setFailed
├── __tests__/
│   ├── parse.test.js
│   ├── validate.test.js
│   └── config.test.js
├── dist/
│   └── index.js                     # ncc bundle (generated, committed)
├── .github/
│   ├── pull_request_template.md
│   └── workflows/
│       └── own-your-pr.yml
├── .own-your-pr.yml                 # Example config (dogfooded by this repo)
└── README.md
```

`defaults.js` is extracted from `config.js` so tests can import it independently and so the default sections are defined in exactly one place.

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `src/defaults.js`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/tobias/conductor/workspaces/own-your-pr/yangon
npm init -y
```

Then replace the contents of `package.json` with:

```json
{
  "name": "own-your-pr",
  "version": "1.0.0",
  "private": true,
  "description": "GitHub Action to enforce structured PR descriptions",
  "main": "dist/index.js",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "ncc build src/index.js -o dist"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @actions/core @actions/github js-yaml
npm install --save-dev vitest @vercel/ncc
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.js`:

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 4: Create defaults.js**

Create `src/defaults.js`:

```js
export const DEFAULT_SECTIONS = [
  {
    heading: "Video",
    required: true,
    validate: "url",
  },
  {
    heading: "What does this do? How does it behave once rolled out?",
    required: true,
  },
  {
    heading: "How can this adversely impact production or customers?",
    required: true,
  },
  {
    heading: "Am I comfortable owning an incident tied to this code?",
    required: true,
  },
];
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/defaults.js
git commit -m "feat: scaffold project with dependencies and defaults"
```

---

### Task 2: Parser — tests and implementation

**Files:**
- Create: `__tests__/parse.test.js`
- Create: `src/parse.js`

- [ ] **Step 1: Write failing tests for parse.js**

Create `__tests__/parse.test.js`:

```js
import { describe, it, expect } from "vitest";
import { parseSections } from "../src/parse.js";

describe("parseSections", () => {
  it("extracts sections from a PR body with H2 headings", () => {
    const body = [
      "## Video",
      "https://loom.com/share/abc123",
      "",
      "## What does this do? How does it behave once rolled out?",
      "Adds a new button to the dashboard.",
      "",
      "## How can this adversely impact production or customers?",
      "Could increase page load time.",
      "",
      "## Am I comfortable owning an incident tied to this code?",
      "Yes, it is low risk.",
    ].join("\n");

    const result = parseSections(body);

    expect(result.get("video")).toBe("https://loom.com/share/abc123");
    expect(result.get("what does this do? how does it behave once rolled out?")).toBe(
      "Adds a new button to the dashboard."
    );
    expect(result.get("how can this adversely impact production or customers?")).toBe(
      "Could increase page load time."
    );
    expect(result.get("am i comfortable owning an incident tied to this code?")).toBe(
      "Yes, it is low risk."
    );
  });

  it("strips HTML comments from section bodies", () => {
    const body = [
      "## Video",
      "<!-- Paste a Loom link -->",
      "",
    ].join("\n");

    const result = parseSections(body);
    expect(result.get("video")).toBe("");
  });

  it("handles body with content before first heading", () => {
    const body = [
      "Some preamble text",
      "",
      "## Video",
      "https://youtube.com/watch?v=123",
    ].join("\n");

    const result = parseSections(body);
    expect(result.get("video")).toBe("https://youtube.com/watch?v=123");
  });

  it("returns empty map for empty body", () => {
    const result = parseSections("");
    expect(result.size).toBe(0);
  });

  it("returns empty map for null body", () => {
    const result = parseSections(null);
    expect(result.size).toBe(0);
  });

  it("handles multiline section content", () => {
    const body = [
      "## Video",
      "https://loom.com/share/abc",
      "",
      "Also see https://loom.com/share/def",
    ].join("\n");

    const result = parseSections(body);
    expect(result.get("video")).toBe(
      "https://loom.com/share/abc\n\nAlso see https://loom.com/share/def"
    );
  });

  it("strips multiline HTML comments", () => {
    const body = [
      "## Video",
      "<!--",
      "Paste a Loom link",
      "-->",
    ].join("\n");

    const result = parseSections(body);
    expect(result.get("video")).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/parse.test.js`
Expected: FAIL — `parseSections` is not defined

- [ ] **Step 3: Implement parse.js**

Create `src/parse.js`:

```js
/**
 * Parse a PR body into a map of { lowercase heading → trimmed body }.
 * Strips HTML comments from body content.
 */
export function parseSections(body) {
  const sections = new Map();

  if (!body) return sections;

  const headingRegex = /^## (.+)$/gm;
  const matches = [...body.matchAll(headingRegex)];

  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim().toLowerCase();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    const rawBody = body.slice(start, end);

    // Strip HTML comments (single-line and multiline)
    const stripped = rawBody.replace(/<!--[\s\S]*?-->/g, "").trim();
    sections.set(heading, stripped);
  }

  return sections;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/parse.test.js`
Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/parse.js __tests__/parse.test.js
git commit -m "feat: add PR body parser with tests"
```

---

### Task 3: Validator — tests and implementation

**Files:**
- Create: `__tests__/validate.test.js`
- Create: `src/validate.js`

- [ ] **Step 1: Write failing tests for validate.js**

Create `__tests__/validate.test.js`:

```js
import { describe, it, expect } from "vitest";
import { validateSections } from "../src/validate.js";
import { DEFAULT_SECTIONS } from "../src/defaults.js";

describe("validateSections", () => {
  it("returns no errors when all required sections are filled", () => {
    const parsed = new Map([
      ["video", "https://loom.com/share/abc"],
      ["what does this do? how does it behave once rolled out?", "Adds a button."],
      ["how can this adversely impact production or customers?", "Minimal risk."],
      ["am i comfortable owning an incident tied to this code?", "Yes."],
    ]);

    const errors = validateSections(parsed, DEFAULT_SECTIONS);
    expect(errors).toEqual([]);
  });

  it("returns error for missing section", () => {
    const parsed = new Map([
      ["video", "https://loom.com/share/abc"],
    ]);

    const errors = validateSections(parsed, DEFAULT_SECTIONS);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toEqual({
      heading: "What does this do? How does it behave once rolled out?",
      reason: "section is missing",
    });
  });

  it("returns error for empty section", () => {
    const parsed = new Map([
      ["video", "https://loom.com/share/abc"],
      ["what does this do? how does it behave once rolled out?", ""],
      ["how can this adversely impact production or customers?", "Some content."],
      ["am i comfortable owning an incident tied to this code?", "Yes."],
    ]);

    const errors = validateSections(parsed, DEFAULT_SECTIONS);
    expect(errors).toEqual([
      {
        heading: "What does this do? How does it behave once rolled out?",
        reason: "section is empty",
      },
    ]);
  });

  it("returns error when url validation fails", () => {
    const parsed = new Map([
      ["video", "I will add a video later"],
      ["what does this do? how does it behave once rolled out?", "Something."],
      ["how can this adversely impact production or customers?", "Nothing."],
      ["am i comfortable owning an incident tied to this code?", "Yes."],
    ]);

    const errors = validateSections(parsed, DEFAULT_SECTIONS);
    expect(errors).toEqual([
      {
        heading: "Video",
        reason: "must contain a URL",
      },
    ]);
  });

  it("skips optional sections", () => {
    const config = [
      { heading: "Video", required: false, validate: "url" },
      { heading: "Notes", required: true },
    ];

    const parsed = new Map([
      ["notes", "Some notes."],
    ]);

    const errors = validateSections(parsed, config);
    expect(errors).toEqual([]);
  });

  it("returns multiple errors at once", () => {
    const parsed = new Map();

    const errors = validateSections(parsed, DEFAULT_SECTIONS);
    expect(errors).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/validate.test.js`
Expected: FAIL — `validateSections` is not defined

- [ ] **Step 3: Implement validate.js**

Create `src/validate.js`:

```js
/**
 * Validate parsed PR sections against config rules.
 * Returns an array of { heading, reason } error objects. Empty array = pass.
 */
export function validateSections(parsed, sections) {
  const errors = [];

  for (const section of sections) {
    if (!section.required) continue;

    const key = section.heading.toLowerCase();
    const body = parsed.get(key);

    if (body === undefined) {
      errors.push({ heading: section.heading, reason: "section is missing" });
      continue;
    }

    if (body.trim() === "") {
      errors.push({ heading: section.heading, reason: "section is empty" });
      continue;
    }

    if (section.validate === "url" && !/https?:\/\//.test(body)) {
      errors.push({ heading: section.heading, reason: "must contain a URL" });
    }
  }

  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/validate.test.js`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/validate.js __tests__/validate.test.js
git commit -m "feat: add section validator with tests"
```

---

### Task 4: Config loader — tests and implementation

**Files:**
- Create: `__tests__/config.test.js`
- Create: `src/config.js`

- [ ] **Step 1: Write failing tests for config.js**

Create `__tests__/config.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import { loadConfig } from "../src/config.js";
import { DEFAULT_SECTIONS } from "../src/defaults.js";

vi.mock("fs");

describe("loadConfig", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns defaults when config file does not exist", () => {
    fs.existsSync.mockReturnValue(false);

    const result = loadConfig("/workspace");
    expect(result).toEqual(DEFAULT_SECTIONS);
  });

  it("parses a valid config file", () => {
    const yaml = [
      "sections:",
      '  - heading: "Demo"',
      "    required: true",
      '    validate: "url"',
      '  - heading: "Notes"',
      "    required: false",
    ].join("\n");

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(yaml);

    const result = loadConfig("/workspace");
    expect(result).toEqual([
      { heading: "Demo", required: true, validate: "url" },
      { heading: "Notes", required: false },
    ]);
  });

  it("throws on missing sections key", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("foo: bar\n");

    expect(() => loadConfig("/workspace")).toThrow(
      "must contain a 'sections' array"
    );
  });

  it("throws when sections is not an array", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("sections: not-an-array\n");

    expect(() => loadConfig("/workspace")).toThrow(
      "must contain a 'sections' array"
    );
  });

  it("throws when a section is missing a heading", () => {
    const yaml = [
      "sections:",
      "  - required: true",
    ].join("\n");

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(yaml);

    expect(() => loadConfig("/workspace")).toThrow(
      "Section 1 is missing a 'heading'"
    );
  });

  it("defaults required to true when omitted", () => {
    const yaml = [
      "sections:",
      '  - heading: "Demo"',
    ].join("\n");

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(yaml);

    const result = loadConfig("/workspace");
    expect(result[0].required).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/config.test.js`
Expected: FAIL — `loadConfig` is not defined

- [ ] **Step 3: Implement config.js**

Create `src/config.js`:

```js
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { DEFAULT_SECTIONS } from "./defaults.js";

const CONFIG_FILENAME = ".own-your-pr.yml";

/**
 * Load config from .own-your-pr.yml in the given directory.
 * Falls back to DEFAULT_SECTIONS if the file does not exist.
 * Throws on malformed config.
 */
export function loadConfig(workspaceDir) {
  const configPath = path.join(workspaceDir, CONFIG_FILENAME);

  if (!fs.existsSync(configPath)) {
    return DEFAULT_SECTIONS;
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const doc = yaml.load(raw);

  if (!doc || !Array.isArray(doc.sections)) {
    throw new Error(
      `.own-your-pr.yml must contain a 'sections' array`
    );
  }

  return doc.sections.map((section, i) => {
    if (!section.heading || typeof section.heading !== "string") {
      throw new Error(
        `Section ${i + 1} is missing a 'heading' string in .own-your-pr.yml`
      );
    }

    return {
      heading: section.heading,
      required: section.required !== false,
      ...(section.validate ? { validate: section.validate } : {}),
    };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/config.test.js`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.js __tests__/config.test.js
git commit -m "feat: add config loader with YAML parsing and tests"
```

---

### Task 5: Entry point

**Files:**
- Create: `src/index.js`

- [ ] **Step 1: Implement index.js**

Create `src/index.js`:

```js
import * as core from "@actions/core";
import * as github from "@actions/github";
import { loadConfig } from "./config.js";
import { parseSections } from "./parse.js";
import { validateSections } from "./validate.js";

function run() {
  try {
    const pr = github.context.payload.pull_request;

    if (!pr) {
      core.setFailed("This action only runs on pull_request events.");
      return;
    }

    const body = pr.body || "";
    const workspaceDir = process.env.GITHUB_WORKSPACE || process.cwd();

    const sections = loadConfig(workspaceDir);
    const parsed = parseSections(body);
    const errors = validateSections(parsed, sections);

    if (errors.length === 0) {
      core.info("✅ Own Your PR — all required sections are filled in.");
      return;
    }

    const lines = errors.map((e) => `  • ${e.heading} — ${e.reason}`);
    const message = [
      "❌ Own Your PR — missing or empty sections:",
      "",
      ...lines,
      "",
      "Fill in all required sections in your PR description and push or edit to re-run.",
    ].join("\n");

    core.setFailed(message);
  } catch (error) {
    core.setFailed(`own-your-pr failed: ${error.message}`);
  }
}

run();
```

- [ ] **Step 2: Commit**

```bash
git add src/index.js
git commit -m "feat: add action entry point"
```

---

### Task 6: Action metadata, workflow, PR template, and example config

**Files:**
- Create: `action.yml`
- Create: `.github/workflows/own-your-pr.yml`
- Create: `.github/pull_request_template.md`
- Create: `.own-your-pr.yml`

- [ ] **Step 1: Create action.yml**

Create `action.yml`:

```yaml
name: "Own Your PR"
description: "Enforce structured PR descriptions with video, rollout explanation, risk assessment, and incident ownership"
branding:
  icon: "check-circle"
  color: "green"
runs:
  using: "node20"
  main: "dist/index.js"
```

- [ ] **Step 2: Create example workflow**

Create `.github/workflows/own-your-pr.yml`:

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
      - uses: ./
```

- [ ] **Step 3: Create PR template**

Create `.github/pull_request_template.md`:

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

- [ ] **Step 4: Create example config**

Create `.own-your-pr.yml`:

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

- [ ] **Step 5: Commit**

```bash
git add action.yml .github/ .own-your-pr.yml
git commit -m "feat: add action metadata, workflow, PR template, and example config"
```

---

### Task 7: Bundle and verify

**Files:**
- Create: `dist/index.js` (generated)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all 19 tests PASS

- [ ] **Step 2: Build the bundle**

Run: `npm run build`
Expected: `dist/index.js` is created, no errors

- [ ] **Step 3: Verify dist/index.js exists and is non-trivial**

Run: `ls -lh dist/index.js`
Expected: file exists, size > 10KB (includes bundled dependencies)

- [ ] **Step 4: Commit the bundle**

```bash
git add dist/
git commit -m "chore: build dist bundle"
```

---

### Task 8: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

Create `README.md`:

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and usage instructions"
```

---

### Task 9: Clean up scaffolding

**Files:**
- Delete: `.gitkeep`

- [ ] **Step 1: Remove .gitkeep**

```bash
git rm .gitkeep
git commit -m "chore: remove .gitkeep"
```
