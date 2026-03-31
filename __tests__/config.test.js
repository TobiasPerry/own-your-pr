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
