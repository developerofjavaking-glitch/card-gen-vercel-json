const binCache = new Map();

function getFlagEmoji(countryCode) {
  if (!countryCode || typeof countryCode !== "string") return "";
  const upper = countryCode.trim().toUpperCase();
  if (upper.length !== 2) return "";
  return String.fromCodePoint(
    ...[...upper].map((c) => 127397 + c.charCodeAt(0))
  );
}

function capitalize(str) {
  if (!str || typeof str !== "string") return "Unknown";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function fetchBinInfo(binCode) {
  const cleanBin = String(binCode || "").replace(/\D/g, "");
  if (binCache.has(cleanBin)) {
    return binCache.get(cleanBin);
  }

  const fallback = {
    scheme: "Unknown",
    type: "Unknown",
    brand: "Unknown",
    bank: "Unknown",
    country: "Unknown",
    emoji: "",
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`https://data.handyapi.com/bin/${cleanBin}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.Status === "SUCCESS") {
        const countryData = data.Country || {};
        const info = {
          scheme: capitalize(data.Scheme),
          type: capitalize(data.Type),
          brand: capitalize(data.CardTier),
          bank: data.Issuer || "Unknown",
          country: countryData.Name || "Unknown",
          emoji: getFlagEmoji(countryData.A2),
        };
        binCache.set(cleanBin, info);
        return info;
      }
    }
  } catch (err) {
    console.error("BIN lookup failed:", err.message || err);
  } finally {
    clearTimeout(timer);
  }

  return fallback;
}

module.exports = {
  fetchBinInfo,
  getFlagEmoji,
};
