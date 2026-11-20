const { generateTestBatch } = require("../lib/luhn");

async function sendTelegramMessage(token, chatId, text, replyToMessageId) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Telegram sendMessage failed:", response.status, errText);
  }
}

function parseGenCommand(text) {
  // Matches: /gen 453201 10   or   /gen 453201   or   453201 5
  const trimmed = text.trim();
  const cmdMatch = trimmed.match(/^\/(?:gen|cc)\s+([0-9xX]{4,18})(?:\s+(\d{1,2}))?/i);
  if (cmdMatch) {
    return {
      bin: cmdMatch[1],
      count: cmdMatch[2] ? Number(cmdMatch[2]) : 10,
    };
  }

  const plainBinMatch = trimmed.match(/^([0-9xX]{6,18})(?:\s+(\d{1,2}))?$/);
  if (plainBinMatch) {
    return {
      bin: plainBinMatch[1],
      count: plainBinMatch[2] ? Number(plainBinMatch[2]) : 10,
    };
  }

  return null;
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "telegram-luhn-bot-vercel" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    console.error("Missing BOT_TOKEN environment variable");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // Optional webhook secret check set during setWebhook
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (expectedSecret) {
    const receivedSecret = req.headers["x-telegram-bot-api-secret-token"];
    if (receivedSecret !== expectedSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const update = req.body;
  const message = update?.message || update?.edited_message;

  if (!message || !message.chat?.id) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const messageId = message.message_id;
  const text = (message.text || "").trim();

  try {
    if (text === "/start" || text === "/help") {
      const helpText = [
        "*Luhn Test Generator Bot (Vercel)*",
        "",
        "Generates synthetic Luhn-valid test numbers for QA & form validation only.",
        "",
        "*Commands:*",
        "`/gen <bin> [count]` — Generate up to 30 test rows",
        "Example: `/gen 453201 10`",
        "",
        "You can also send a BIN directly, such as `541275 5`.",
      ].join("\n");

      await sendTelegramMessage(botToken, chatId, helpText, messageId);
      return res.status(200).json({ ok: true });
    }

    const parsed = parseGenCommand(text);
    if (!parsed) {
      await sendTelegramMessage(
        botToken,
        chatId,
        "Send `/gen <bin> [count]` (for example `/gen 453201 10`) or `/help`.",
        messageId
      );
      return res.status(200).json({ ok: true });
    }

    const rows = generateTestBatch({
      bin: parsed.bin,
      count: parsed.count,
      length: 16,
    });

    const replyText = [
      `*BIN:* \`${parsed.bin}\` | *Count:* ${rows.length}`,
      "```",
      ...rows,
      "```",
      "_For testing & validation purposes only._",
    ].join("\n");

    await sendTelegramMessage(botToken, chatId, replyText, messageId);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).json({ ok: true });
  }
};
