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
