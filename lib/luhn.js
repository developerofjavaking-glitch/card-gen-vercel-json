const crypto = require("crypto");

function randomInt(maxExclusive) {
  return crypto.randomInt(0, maxExclusive);
}

function luhnChecksum(cardNumber) {
  let sum = 0;
  let isEven = true;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let d = Number(cardNumber[i]);
    if (isEven) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isEven = !isEven;
  }

  return (10 - (sum % 10)) % 10;
}

function generateCcFull(binCode, expMonth = null, expYear = null) {
  const cleanBin = String(binCode).replace(/\D/g, "");
  const isAmex = cleanBin.startsWith("34") || cleanBin.startsWith("37");

  const targetLengthPreChecksum = isAmex ? 14 : 15;
  const randLen = Math.max(0, targetLengthPreChecksum - cleanBin.length);

  let base = cleanBin;
  for (let i = 0; i < randLen; i++) {
    base += String(randomInt(10));
  }

  const cc = base + String(luhnChecksum(base));

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let finalYear;
  if (expYear) {
    finalYear = Number(expYear);
  } else {
    finalYear = currentYear + randomInt(7); // currentYear..currentYear+6
  }

  let finalMonth;
  if (expMonth) {
    finalMonth = String(expMonth).padStart(2, "0");
  } else if (finalYear === currentYear) {
    const startMonth = Math.min(currentMonth, 12);
    const m = startMonth + randomInt(12 - startMonth + 1);
    finalMonth = String(m).padStart(2, "0");
  } else {
    finalMonth = String(randomInt(12) + 1).padStart(2, "0");
  }

  const cvvDigits = isAmex ? 4 : 3;
  let cvv = "";
  for (let i = 0; i < cvvDigits; i++) {
    cvv += String(randomInt(10));
  }

  return `${cc}|${finalMonth}|${finalYear}|${cvv}`;
}

function generateBatch({ binCode, count = 1, expMonth = null, expYear = null }) {
  const safeCount = Math.min(50, Math.max(1, Number(count) || 1));
  const list = [];
  for (let i = 0; i < safeCount; i++) {
    list.push(generateCcFull(binCode, expMonth, expYear));
  }
  return list;
}

function generateTxtString(data) {
  return data.join("\n");
}

function generateCsvString(data) {
  const header = "CC Number,Expiry Month,Expiry Year,CVV";
  const rows = data.map((item) => item.split("|").join(","));
  return [header, ...rows].join("\n");
}

module.exports = {
  luhnChecksum,
  generateCcFull,
  generateBatch,
  generateTxtString,
  generateCsvString,
};
