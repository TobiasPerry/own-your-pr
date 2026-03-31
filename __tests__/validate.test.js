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
