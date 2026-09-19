/**
 * src/utils/money.js
 * Centralized monetary precision utility.
 * ALL monetary calculations in the application must use these functions.
 * Do NOT use Math.round(value * 100) / 100 scattered across the codebase.
 */

/**
 * Convert a decimal string or number to integer cents.
 * Example: toCents(900.5) → 90050
 * @param {number|string} value
 * @returns {number} integer cents
 */
export const toCents = (value) => Math.round(parseFloat(value || 0) * 100);

/**
 * Convert integer cents back to a decimal number with 2 decimal places.
 * Example: fromCents(90050) → "900.50"
 * @param {number} cents
 * @returns {string}
 */
export const fromCents = (cents) => ((cents || 0) / 100).toFixed(2);

/**
 * Format cents as a locale-aware currency display string (PKR).
 * Example: formatMoney(90050) → "900.50"
 * @param {number|string} value - can be cents (integer) or decimal (float)
 * @param {boolean} [alreadyCents=false] - set true if value is already in cents
 * @returns {string}
 */
export const formatMoney = (value, alreadyCents = false) => {
  const num = alreadyCents ? (value || 0) / 100 : parseFloat(value || 0);
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Round a decimal number to the configured WAC precision.
 * @param {number} value
 * @param {number} [precision=2] - decimal places (2-4)
 * @returns {number}
 */
export const roundWac = (value, precision = 2) => {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};

/**
 * Safe multiply – avoids floating point drift for qty × price.
 * @param {number} qty
 * @param {number} price
 * @returns {number} rounded to 2 decimal places
 */
export const multiply = (qty, price) =>
  Math.round(qty * price * 100) / 100;

/**
 * Safe add – accumulates multiple decimal amounts without drift.
 * @param {...number} values
 * @returns {number} rounded to 2 decimal places
 */
export const add = (...values) =>
  Math.round(values.reduce((sum, v) => sum + (parseFloat(v) || 0), 0) * 100) / 100;
