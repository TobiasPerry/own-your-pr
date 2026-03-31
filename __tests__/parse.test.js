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
