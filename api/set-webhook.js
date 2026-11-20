module.exports = async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "BOT_TOKEN is not set" });
  }

  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.query.secret !== secret) {
    return res.status(401).json({ error: "Invalid secret" });
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) {
    return res.status(400).json({ error: "Host not found" });
  }

  const webhookUrl = `https://${host}/api/webhook`;
  const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      drop_pending_updates: true,
      ...(secret ? { secret_token: secret } : {}),
    }),
  });

  const data = await tgRes.json();
  return res.status(tgRes.ok ? 200 : 500).json({ webhookUrl, telegram: data });
};
