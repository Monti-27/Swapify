/**
 * Parse human-readable numbers with K, M, B, T suffixes
 * Examples:
 *   "1B" → 1,000,000,000
 *   "100M" → 100,000,000
 *   "50K" → 50,000
 *   "1.5T" → 1,500,000,000,000
 *   "1000" → 1000
 *   "$500M" → 500,000,000
 * 
 * @param input - The string to parse (e.g., "1B", "100M", "50K")
 * @returns The numeric value or NaN if invalid
 */
export function parseHumanNumber(input: string): number {
    if (!input || typeof input !== 'string') return NaN;

    // Remove common prefixes/suffixes and whitespace
    const cleanInput = input
        .toUpperCase()
        .replace(/[$,\s]/g, '')
        .trim();

    if (cleanInput === '') return NaN;

    // Define multipliers
    const multipliers: Record<string, number> = {
        'K': 1_000,
        'M': 1_000_000,
        'B': 1_000_000_000,
        'T': 1_000_000_000_000,
    };

    // Match number with optional decimal and optional suffix
    // Examples: "1.5B", "100M", "1000", ".5K"
    const match = cleanInput.match(/^([\d.]+)([KMBT])?$/);

    if (!match) return NaN;

    const [, numStr, suffix] = match;
    const num = parseFloat(numStr);

    if (isNaN(num)) return NaN;

    // Apply multiplier if suffix exists
    const multiplier = suffix ? multipliers[suffix] : 1;

    return num * multiplier;
}

/**
 * Format a number to human-readable format with K, M, B, T suffixes
 * Examples:
 *   1500000 → "1.5M"
 *   1000000000 → "1B"
 *   50000 → "50K"
 * 
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatHumanNumber(num: number, decimals: number = 2): string {
    if (num === 0) return '0';
    if (isNaN(num)) return 'NaN';

    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';

    if (absNum >= 1_000_000_000_000) {
        return sign + (absNum / 1_000_000_000_000).toFixed(decimals) + 'T';
    }
    if (absNum >= 1_000_000_000) {
        return sign + (absNum / 1_000_000_000).toFixed(decimals) + 'B';
    }
    if (absNum >= 1_000_000) {
        return sign + (absNum / 1_000_000).toFixed(decimals) + 'M';
    }
    if (absNum >= 1_000) {
        return sign + (absNum / 1_000).toFixed(decimals) + 'K';
    }

    return sign + absNum.toString();
}

/**
 * Validate if a string can be parsed as a human-readable number
 * 
 * @param input - The string to validate
 * @returns true if valid, false otherwise
 */
export function isValidHumanNumber(input: string): boolean {
    return !isNaN(parseHumanNumber(input));
}
