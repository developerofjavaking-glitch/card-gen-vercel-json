const crypto = require("crypto");

function randomInt(maxExclusive) {
  return crypto.randomInt(0, maxExclusive);
}

/**
 * Computes the Luhn check digit for a numeric body string.
 * @param {string} bodyDigits - Digits excluding the final check digit
 * @returns {number} Check digit (0-9)
 */
function calculateLuhnCheckDigit(bodyDigits) {
  let sum = 0;
  let doubleNext = true; // Rightmost digit of body is adjacent to check digit

  for (let i = bodyDigits.length - 1; i >= 0; i--) {
    let digit = Number(bodyDigits[i]);
    if (doubleNext) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleNext = !doubleNext;
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Formats a BIN/pattern template into a valid Luhn test card string.
 * Supports digits and 'x'/'X' wildcards. Defaults to 16 digits.
 *
 * @param {string} rawBin - Starting digits (e.g., "453201" or "453201xxxxxxxxxx")
 * @param {number} [length=16] - Total card length (13-19)
 * @returns {string} Luhn-valid digit string
 */
function generateLuhnNumber(rawBin = "453201", length = 16) {
  const cleaned = String(rawBin).replace(/[^0-9xX]/g, "") || "453201";
  const targetLen = Math.min(19, Math.max(13, Number(length) || 16));

  let prefix = "";
  for (let i = 0; i < cleaned.length && prefix.length < targetLen - 1; i++) {
    const ch = cleaned[i];
    if (/[0-9]/.test(ch)) {
      prefix += ch;
    } else {
      prefix += String(randomInt(10));
    }
  }

  while (prefix.length < targetLen - 1) {
    prefix += String(randomInt(10));
  }

  const checkDigit = calculateLuhnCheckDigit(prefix);
  return prefix + String(checkDigit);
}

function generateExpiry() {
  const month = String(randomInt(12) + 1).padStart(2, "0");
  const currentYearTwoDigit = Number(String(new Date().getFullYear()).slice(-2));
  const year = String(currentYearTwoDigit + 1 + randomInt(5)).padStart(2, "0");
  return `${month}|${year}`;
}

function generateCvv(isAmex = false) {
  const digits = isAmex ? 4 : 3;
  let cvv = "";
  for (let i = 0; i < digits; i++) {
    cvv += String(randomInt(10));
  }
  return cvv;
}

/**
 * Generates multiple test entries formatted as NUMBER|MM|YY|CVV.
 *
 * @param {object} options
 * @param {string} options.bin
 * @param {number} [options.count=10]
 * @param {number} [options.length=16]
 */
function generateTestBatch({ bin = "453201", count = 10, length = 16 }) {
  const safeCount = Math.min(30, Math.max(1, Number(count) || 10));
  const cleanBinDigits = String(bin).replace(/\D/g, "");
  const isAmex = cleanBinDigits.startsWith("34") || cleanBinDigits.startsWith("37");
  const effectiveLength = isAmex ? 15 : length;

  const entries = [];
  for (let i = 0; i < safeCount; i++) {
    const num = generateLuhnNumber(bin, effectiveLength);
    const exp = generateExpiry();
    const cvv = generateCvv(isAmex);
    entries.push(`${num}|${exp}|${cvv}`);
  }
  return entries;
}

module.exports = {
  calculateLuhnCheckDigit,
  generateLuhnNumber,
  generateTestBatch,
};
