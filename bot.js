const TelegramBot = require("node-telegram-bot-api");
const { styleList, decoratedNames } = require("./fonts");

const TOKEN = process.env.BOT_TOKEN;
const CHANNEL = process.env.CHANNEL_USERNAME || "FontsxWorld";
const TUTORIAL_URL = process.env.TUTORIAL_URL || "https://t.me/" + CHANNEL;
if (!TOKEN) {
  console.error("BOT_TOKEN missing. Set it in Heroku Config Vars / .env");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const lastText = new Map(); // chatId -> last requested name
const PER_PAGE = 12;

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function startKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📖 Tutorial", callback_data: "tutorial" }],
      [
        { text: "🎨 All Fonts Demo", callback_data: "demo" },
        { text: "👑 Fancy Names", callback_data: "demo_decor" },
      ],
      [{ text: "📣 Updates Channel", url: "https://t.me/" + CHANNEL }],
      [{ text: "❓ Help", callback_data: "help" }],
    ],
  };
}

function resultKeyboard(page, total) {
  const pages = Math.ceil(total / PER_PAGE);
  const nav = [];
  if (page > 0) nav.push({ text: "⬅️ Back", callback_data: "p:" + (page - 1) });
  nav.push({ text: `${page + 1}/${pages}`, callback_data: "noop" });
  if (page < pages - 1) nav.push({ text: "Next ➡️", callback_data: "p:" + (page + 1) });
  return {
    inline_keyboard: [
      nav,
      [{ text: "👑 Decorated Names", callback_data: "decor" }],
      [{ text: "📖 Tutorial", callback_data: "tutorial" }, { text: "📣 Channel", url: "https://t.me/" + CHANNEL }],
    ],
  };
}

const WELCOME = (name) =>
  `👑 <b>Hey ${esc(name)}!</b>\n\n` +
  `Main <b>Fancy Font Name Bot</b> hoon 🪈\n` +
  `Mujhe koi bhi naam bhejo — main use <b>50+ stylish fonts</b> aur <b>decorated fancy names</b> me bana ke doonga ✨\n\n` +
  `<b>Example:</b> <code>Kabir Singh</code>\n\n` +
  `Neeche buttons se tutorial dekho 👇`;

const TUTORIAL =
  `📖 <b>Tutorial — Kaise use kare?</b>\n\n` +
  `1️⃣ Bot ko <code>/start</code> karo.\n` +
  `2️⃣ Seedha apna naam type karke bhej do (jaise <code>Kabir Singh</code>).\n` +
  `3️⃣ Bot turant <b>50+ font styles</b> bhej dega — page buttons se aage-peeche jao.\n` +
  `4️⃣ <b>👑 Decorated Names</b> button dabao — symbols wale premium fancy names milenge.\n` +
  `5️⃣ Jo style pasand aaye, us par <b>tap-and-hold → Copy</b> karke Telegram naam/bio me paste kar do.\n\n` +
  `<b>Commands:</b>\n` +
  `/start — bot start\n/fancy naam — decorated names\n/fonts naam — sabhi font styles\n/tutorial — ye guide\n/help — madad`;

const HELP =
  `❓ <b>Help</b>\n\n` +
  `• Sirf naam bhejo, bot khud bana dega.\n` +
  `• Hindi/English dono chalega (English letters best result dete hain).\n` +
  `• Kuch fonts purane phone me box (▯) dikh sakte hain — dusra style choose karo.\n` +
  `• Copy karne ke liye text par tap-and-hold karo.`;

function renderPage(text, page) {
  const styles = styleList(text);
  const slice = styles.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const body = slice
    .map(([name, val]) => `<b>${esc(name)}</b>\n<code>${esc(val)}</code>`)
    .join("\n\n");
  return { text: `✨ <b>Fancy Fonts .ᐟ.ᐟ</b>\n\n${body}`, total: styles.length };
}

function renderDecor(text) {
  const tag = "#" + text.trim().toLowerCase().replace(/\s+/g, "_") + "@" + CHANNEL;
  const list = decoratedNames(text, tag);
  return `👑 <b>Decorated Fancy Names</b>\n\n` + list.map((v) => `<code>${esc(v)}</code>`).join("\n\n");
}

bot.onText(/^\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, WELCOME(msg.from.first_name || "friend"), {
    parse_mode: "HTML",
    reply_markup: startKeyboard(),
  });
});

bot.onText(/^\/(tutorial|guide)/, (msg) =>
  bot.sendMessage(msg.chat.id, TUTORIAL, { parse_mode: "HTML", reply_markup: startKeyboard() })
);
bot.onText(/^\/help/, (msg) => bot.sendMessage(msg.chat.id, HELP, { parse_mode: "HTML" }));

bot.onText(/^\/fonts(?:\s+([\s\S]+))?/, (msg, m) => {
  const t = (m[1] || "").trim();
  if (!t) return bot.sendMessage(msg.chat.id, "Use: <code>/fonts Kabir Singh</code>", { parse_mode: "HTML" });
  sendFonts(msg.chat.id, t, 0);
});

bot.onText(/^\/fancy(?:\s+([\s\S]+))?/, (msg, m) => {
  const t = (m[1] || "").trim();
  if (!t) return bot.sendMessage(msg.chat.id, "Use: <code>/fancy Kabir</code>", { parse_mode: "HTML" });
  lastText.set(msg.chat.id, t);
  bot.sendMessage(msg.chat.id, renderDecor(t), { parse_mode: "HTML", reply_markup: startKeyboard() });
});

function sendFonts(chatId, text, page) {
  lastText.set(chatId, text);
  const { text: body, total } = renderPage(text, page);
  return bot.sendMessage(chatId, body, { parse_mode: "HTML", reply_markup: resultKeyboard(page, total) });
}

bot.on("message", (msg) => {
  const t = (msg.text || "").trim();
  if (!t || t.startsWith("/")) return;
  if (t.length > 40) return bot.sendMessage(msg.chat.id, "😅 Naam thoda chhota bhejo (max 40 characters).");
  sendFonts(msg.chat.id, t, 0);
});

bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const data = q.data || "";
  const saved = lastText.get(chatId) || "Kabir Singh";
  try {
    if (data === "tutorial") {
      await bot.sendMessage(chatId, TUTORIAL, { parse_mode: "HTML", reply_markup: startKeyboard() });
    } else if (data === "help") {
      await bot.sendMessage(chatId, HELP, { parse_mode: "HTML" });
    } else if (data === "demo") {
      await sendFonts(chatId, "Kabir Singh", 0);
    } else if (data === "demo_decor" || data === "decor") {
      await bot.sendMessage(chatId, renderDecor(data === "decor" ? saved : "Kabir Singh"), {
        parse_mode: "HTML",
        reply_markup: startKeyboard(),
      });
    } else if (data.startsWith("p:")) {
      const page = parseInt(data.slice(2), 10) || 0;
      const { text: body, total } = renderPage(saved, page);
      await bot.editMessageText(body, {
        chat_id: chatId,
        message_id: q.message.message_id,
        parse_mode: "HTML",
        reply_markup: resultKeyboard(page, total),
      });
    }
  } catch (e) {
    console.error(e.message);
  }
  bot.answerCallbackQuery(q.id).catch(() => {});
});

bot.setMyCommands([
  { command: "start", description: "Bot start karo" },
  { command: "fonts", description: "Naam ko 50+ fonts me badlo" },
  { command: "fancy", description: "Decorated fancy names" },
  { command: "tutorial", description: "Kaise use kare" },
  { command: "help", description: "Madad" },
]).catch(() => {});

bot.on("polling_error", (e) => console.error("polling_error:", e.message));
console.log("🚀 Fancy Font Name Bot started");
