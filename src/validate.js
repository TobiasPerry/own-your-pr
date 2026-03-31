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
