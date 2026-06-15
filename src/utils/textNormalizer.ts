/**
 * Replace Chinese quotation marks with Western equivalents.
 * ' → '   ' → '
 * " → "   " → "
 */
export function normalizeQuotes(text: string): string {
  return text
    .replace(/‘/g, "'")  // ' left single
    .replace(/’/g, "'")  // ' right single
    .replace(/“/g, '"')  // " left double
    .replace(/”/g, '"'); // " right double
}
