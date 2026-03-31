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
