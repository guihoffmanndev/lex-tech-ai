import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export interface VariableMapping {
  find: string;
  replace: string;
}

interface RunInfo {
  text: string;
  fullMatch: string;
  formatting: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractRuns(paragraph: string): RunInfo[] {
  const runs: RunInfo[] = [];
  const runRegex = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
  let match: RegExpExecArray | null;

  while ((match = runRegex.exec(paragraph)) !== null) {
    const runContent = match[1];
    const fullMatch = match[0];

    // Extract formatting (w:rPr block)
    const fmtMatch = runContent.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    const formatting = fmtMatch ? fmtMatch[0] : "";

    // Extract text from w:t
    const textMatch = runContent.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
    const text = textMatch ? textMatch[1] : "";

    runs.push({ text, fullMatch, formatting });
  }

  return runs;
}

function rebuildParagraphWithText(
  paragraph: string,
  runs: RunInfo[],
  newText: string
): string {
  if (runs.length === 0) return paragraph;

  const oldText = runs.map((r) => r.text).join("");

  // Find the first character position where old and new text diverge
  let commonPrefix = 0;
  while (
    commonPrefix < oldText.length &&
    commonPrefix < newText.length &&
    oldText[commonPrefix] === newText[commonPrefix]
  ) {
    commonPrefix++;
  }

  // Find common suffix (not overlapping with prefix)
  let commonSuffix = 0;
  while (
    commonSuffix < oldText.length - commonPrefix &&
    commonSuffix < newText.length - commonPrefix &&
    oldText[oldText.length - 1 - commonSuffix] === newText[newText.length - 1 - commonSuffix]
  ) {
    commonSuffix++;
  }

  // Character ranges for each run in the concatenated old text
  const ranges: Array<{ start: number; end: number }> = [];
  let pos = 0;
  for (const run of runs) {
    ranges.push({ start: pos, end: pos + run.text.length });
    pos += run.text.length;
  }

  // Determine which runs are affected by the change
  const changeStartOld = commonPrefix;
  const changeEndOld = oldText.length - commonSuffix;
  const changeStartNew = commonPrefix;
  const changeEndNew = newText.length - commonSuffix;
  const replacementText = newText.slice(changeStartNew, changeEndNew);

  // Find the first and last affected run indices
  let firstAffected = -1;
  let lastAffected = -1;
  for (let i = 0; i < runs.length; i++) {
    const { start, end } = ranges[i];
    // A run is affected if its range overlaps with the changed region
    if (end > changeStartOld && start < changeEndOld) {
      if (firstAffected === -1) firstAffected = i;
      lastAffected = i;
    }
  }

  // If somehow no runs are affected (shouldn't happen since text changed),
  // fall back to putting all text in the first run
  if (firstAffected === -1) {
    firstAffected = 0;
    lastAffected = 0;
  }

  // Build new run content for each run
  let result = paragraph;

  // Process runs in reverse order so string replacements don't invalidate positions
  for (let i = runs.length - 1; i >= 0; i--) {
    const run = runs[i];
    const range = ranges[i];

    if (i < firstAffected || i > lastAffected) {
      // This run is NOT affected — keep its original XML completely intact
      continue;
    }

    let newRunText: string;

    if (i === firstAffected && i === lastAffected) {
      // Only one run affected: prefix from this run + replacement + suffix from this run
      const prefixInRun = oldText.slice(range.start, changeStartOld);
      const suffixInRun = oldText.slice(changeEndOld, range.end);
      newRunText = prefixInRun + replacementText + suffixInRun;
    } else if (i === firstAffected) {
      // First affected run: keep the portion before the change, plus the replacement text
      const prefixInRun = oldText.slice(range.start, changeStartOld);
      newRunText = prefixInRun + replacementText;
    } else if (i === lastAffected) {
      // Last affected run: keep the portion after the change
      const suffixInRun = oldText.slice(changeEndOld, range.end);
      newRunText = suffixInRun;
    } else {
      // Middle affected run: its text is entirely within the replaced region, clear it
      newRunText = "";
    }

    // Build new run XML preserving original formatting
    const newRunXml = `<w:r>${run.formatting}<w:t xml:space="preserve">${escapeXml(newRunText)}</w:t></w:r>`;
    result = result.replace(run.fullMatch, newRunXml);
  }

  return result;
}

function replaceMappingsInXml(
  xml: string,
  mappings: VariableMapping[]
): string {
  if (mappings.length === 0) return xml;

  // Sort by find text length DESC to avoid substring conflicts
  const sortedMappings = [...mappings].sort(
    (a, b) => b.find.length - a.find.length
  );

  // Process each <w:p>...</w:p> block
  const result = xml.replace(
    /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g,
    (paragraph: string) => {
      const runs = extractRuns(paragraph);
      if (runs.length === 0) return paragraph;

      // Concatenate all text from runs
      const fullText = runs.map((r) => r.text).join("");

      // Apply all mappings
      let newText = fullText;
      for (const mapping of sortedMappings) {
        // Use global replacement with escaped find text
        const escaped = mapping.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        newText = newText.replace(new RegExp(escaped, "g"), mapping.replace);
      }

      // If text didn't change, no need to rebuild
      if (newText === fullText) return paragraph;

      return rebuildParagraphWithText(paragraph, runs, newText);
    }
  );

  return result;
}

export function applyMappingsToDocx(
  docxBinary: ArrayBuffer,
  mappings: VariableMapping[]
): ArrayBuffer {
  if (mappings.length === 0) {
    // Return a copy
    const zip = new PizZip(docxBinary);
    return zip.generate({ type: "arraybuffer" });
  }

  const zip = new PizZip(docxBinary);

  // Process document.xml and any header/footer parts
  const xmlParts = Object.keys(zip.files).filter(
    (name) =>
      name === "word/document.xml" ||
      /^word\/(header|footer)\d*\.xml$/.test(name)
  );

  for (const partName of xmlParts) {
    const file = zip.file(partName);
    if (!file) continue;
    const xml = file.asText();
    const updatedXml = replaceMappingsInXml(xml, mappings);
    zip.file(partName, updatedXml);
  }

  return zip.generate({ type: "arraybuffer" });
}

export function generateFromDocxTemplate(
  docxBinary: ArrayBuffer,
  data: Record<string, string>
): ArrayBuffer {
  const zip = new PizZip(docxBinary);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
    nullGetter(part: { module: unknown; value: string }) {
      if (!part.module) {
        return `{${part.value}}`;
      }
      return "";
    },
  });

  doc.render(data);

  const outZip = doc.getZip();
  return outZip.generate({ type: "arraybuffer" });
}
