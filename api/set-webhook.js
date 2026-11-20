module.exports = async function handler(req, res) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ error: "BOT_TOKEN is not set" });
  }

  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret && req.query.secret !== webhookSecret) {
    return res.status(401).json({ error: "Invalid secret query parameter" });
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) {
    return res.status(400).json({ error: "Unable to determine deployment host" });
  }

  const webhookUrl = `https://${host}/api/webhook`;
  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;

  const body = {
    url: webhookUrl,
    drop_pending_updates: true,
    ...(webhookSecret ? { secret_token: webhookSecret } : {}),
  };

  const tgRes = await fetch(telegramApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await tgRes.json();
  return res.status(tgRes.ok ? 200 : 500).json({
    webhookUrl,
    telegramResponse: data,
  });
};
