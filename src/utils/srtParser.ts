import { Subtitle } from "../types/subtitle";

/**
 * Parse SRT file content into structured subtitle array.
 */
export function parseSrt(content: string): Subtitle[] {
  const blocks = content.trim().split(/\n\s*\n/);
  const subtitles: Subtitle[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    const timeMatch = lines[1].match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timeMatch) continue;

    const text = lines.slice(2).join("\n").trim();

    subtitles.push({
      index,
      startTime: timeMatch[1].replace(",", "."),
      endTime: timeMatch[2].replace(",", "."),
      text,
    });
  }

  return subtitles;
}

/**
 * Serialize subtitle array back to SRT format string.
 */
export function serializeSrt(subtitles: Subtitle[]): string {
  return subtitles
    .map((sub, i) => {
      const index = sub.index ?? i + 1;
      const start = sub.startTime.replace(".", ",");
      const end = sub.endTime.replace(".", ",");
      const text = sub.translation ?? sub.text;
      return `${index}\n${start} --> ${end}\n${text}`;
    })
    .join("\n\n")
    .concat("\n");
}
