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
