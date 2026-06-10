const FILLER_REGEX = /^(嗯|呃|啊|哦|噢|唔|额|诶|唉|哎|嗨)[~～…]*$/;

/**
 * Check if a subtitle line is purely a filler word (standalone).
 */
export function isFillerLine(text: string): boolean {
  return FILLER_REGEX.test(text.trim());
}

/**
 * Parse AI sentence-splitting response into groups of subtitle indices.
 * Expected AI format: one "start-end" per line, e.g. "0-2", "3-4", "5-5".
 * Falls back to one-per-line if parsing fails.
 */
export function parseSentenceGroups(raw: string, totalCount: number): number[][] {
  const groups: number[][] = [];
  const lines = raw.trim().split("\n");

  for (const line of lines) {
    const match = line.match(/(\d+)\s*[-–—]\s*(\d+)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (!isNaN(start) && !isNaN(end) && start <= end && end < totalCount) {
        const group: number[] = [];
        for (let i = start; i <= end; i++) group.push(i);
        groups.push(group);
      }
    }
  }

  // If no valid groups parsed, fallback: each line is its own group
  if (groups.length === 0) {
    for (let i = 0; i < totalCount; i++) {
      groups.push([i]);
    }
    return groups;
  }

  // Verify all indices are covered; fill gaps
  const covered = new Set<number>();
  for (const g of groups) {
    for (const idx of g) covered.add(idx);
  }

  for (let i = 0; i < totalCount; i++) {
    if (!covered.has(i)) {
      groups.push([i]);
    }
  }

  groups.sort((a, b) => a[0] - b[0]);
  return groups;
}
