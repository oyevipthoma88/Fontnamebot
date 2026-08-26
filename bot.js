const TelegramBot = require("node-telegram-bot-api");
const { styleList, decoratedNames, hashTag, extendTemplates } = require("./fonts");
const store = require("./store");
const scanner = require("./scanner");
const accounts = require("./accounts");
const namegen = require("./namegen");

const TOKEN = process.env.BOT_TOKEN;
const CHANNEL = process.env.CHANNEL_USERNAME || "FontsxWorld";
const OWNER_ID = parseInt(process.env.OWNER_ID || "0", 10); // apni numeric Telegram id
const OWNER_USERNAME = process.env.OWNER_USERNAME || ""; // jaise "mera_username" (bina @)
if (!TOKEN) {
  console.error("BOT_TOKEN missing. Set it in Heroku Config Vars / .env");
  process.exit(1);
}
if (!OWNER_ID) console.warn("⚠️  OWNER_ID set nahi hai — Owner Panel kaam nahi karega.");

const bot = new TelegramBot(TOKEN, { polling: true });
const lastText = new Map(); // chatId -> last requested name
const pendingScan = new Map(); // ownerId -> { force: boolean }
const PER_PAGE = 12;

// Startup pe collected ornament templates engine me merge kar do
extendTemplates(store.templates);

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const isOwner = (id) => OWNER_ID && Number(id) === OWNER_ID;

// Telegram flood-limit safe sender (same chat me bahut saare messages)
async function sendSafe(chatId, text, opts = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await bot.sendMessage(chatId, text, opts);
    } catch (e) {
      const ra = e && e.response && e.response.body && e.response.body.parameters && e.response.body.parameters.retry_after;
      if (ra) {
        await new Promise((r) => setTimeout(r, (ra + 1) * 1000));
        continue;
      }
      throw e;
    }
  }
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Owner ki profile ka direct link (username ho to @username, warna numeric id)
function ownerProfileUrl() {
  if (OWNER_USERNAME) return "https://t.me/" + OWNER_USERNAME;
  if (OWNER_ID) return "tg://user?id=" + OWNER_ID;
  return null;
}

function startKeyboard(uid) {
  const rows = [
    [{ text: "📖 Tutorial", callback_data: "tutorial" }],
    [
      { text: "🎨 All Fonts Demo", callback_data: "demo" },
      { text: "👑 Fancy Names", callback_data: "demo_decor" },
    ],
    [{ text: "📣 Updates Channel", url: "https://t.me/" + CHANNEL }],
  ];
  // 👑 Owner  = owner ki profile seedha khulti hai (sabke liye)
  const url = ownerProfileUrl();
  rows.push([
    url ? { text: "👑 Owner", url } : { text: "👑 Owner", callback_data: "owner" },
    { text: "❓ Help", callback_data: "help" },
  ]);
  // ⚙️ Owner Panel = alag button, sirf owner ko dikhta hai
  if (isOwner(uid)) rows.push([{ text: "⚙️ Owner Panel", callback_data: "panel" }]);
  return { inline_keyboard: rows };
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
      [{ text: "📖 Tutorial", callback_data: "tutorial" }, { text: "📣 Channel", url: "https://t.me/" + CHANNEL }],
    ],
  };
}

// ── Owner panel ──
function panelKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📊 Bot Stats", callback_data: "o:stats" }],
      [{ text: "📡 Scan Name Channel", callback_data: "o:scan" }],
      [{ text: "♻️ Force Rescan", callback_data: "o:rescan" }],
      [{ text: "👤 Accounts", callback_data: "o:accs" }],
      [{ text: "🏠 Back", callback_data: "o:back" }],
    ],
  };
}

function accountsKeyboard() {
  const rows = accounts.list().map((a) => [
    { text: `${a.active ? "✅" : "▫️"} ${a.label} (${a.phoneMasked})`, callback_data: "a:use:" + a.id },
    { text: "🗑", callback_data: "a:del:" + a.id },
  ]);
  rows.push([{ text: "➕ Add Account", callback_data: "a:add" }]);
  rows.push([{ text: "⬅️ Panel", callback_data: "panel" }]);
  return { inline_keyboard: rows };
}

function accountsText() {
  const list = accounts.list();
  const body = list.length
    ? list.map((a) => `${a.active ? "✅" : "▫️"} <b>${esc(a.label)}</b> — ${esc(a.phoneMasked)}`).join("\n")
    : "_Koi account add nahi hai._";
  return (
    `👤 <b>Scanner Accounts</b>\n\n${body}\n\n` +
    `Scam/name channels scan karne ke liye owner ka apna Telegram account chahiye (bot khud channel history nahi padh sakta).\n\n` +
    `➕ <b>Add Account</b> — number → OTP → (2FA) se login.\n` +
    `🔒 Session AES-256 se encrypt hoke save hoti hai, OTP message turant delete ho jata hai.\n` +
    `⚠️ Sirf <b>apna</b> account add karo — dusre ka account maangna/lagana Telegram ke rules ke against hai.` +
    (accounts.apiReady() ? "" : `\n\n❗ Pehle <code>API_ID</code> aur <code>API_HASH</code> env vars set karo (my.telegram.org).`)
  );
}

const PANEL_TEXT =
  `⚙️ <b>Owner Panel</b>\n\n` +
  `• <b>Bot Stats</b> — users, fonts, requests, uptime\n` +
  `• <b>Scan Name Channel</b> — chat id ya @username bhejo, us channel ke saare name fonts scan ho ke add ho jayenge.\n` +
  `  Ek sath multiple bhej sakte ho (space/comma se). Jo pehle se scanned ya duplicate hai wo skip ho jayega.\n` +
  `  Kisi channel ka naam ya watermark store nahi hota — sirf name styles.\n` +
  `• <b>Force Rescan</b> — pehle se scanned channel ko dobara scan karta hai.\n` +
  `• <b>Accounts</b> — scanner ke liye apna Telegram account number se add/switch karo.`;

function statsText() {
  const s = store.stats(styleList("Aa").length);
  const up = Math.floor(s.uptimeMs / 1000);
  const hh = Math.floor(up / 3600), mm = Math.floor((up % 3600) / 60);
  return (
    `📊 <b>Bot Stats</b>\n\n` +
    `👥 Total users: <b>${s.users}</b>\n` +
    `✨ Total name requests: <b>${s.totalRequests}</b>\n` +
    `🔤 Font styles: <b>${s.fontStyles}</b>\n` +
    `🧩 Collected names: <b>${s.nameVariants}</b> variants (${s.nameBases} unique names)\n` +
    `🎀 Ornaments: ${s.templates.pre} pre / ${s.templates.post} post / ${s.templates.sep} sep / ${s.templates.frames} frames\n` +
    `📡 Scanned channels: <b>${s.scannedChannels}</b>\n` +
    `⏱ Uptime: ${hh}h ${mm}m`
  );
}

const WELCOME = (name) =>
  `👑 <b>Hey ${esc(name)}!</b>\n\n` +
  `Main <b>Fancy Font Name Bot</b> hoon 🪈\n` +
  `Mujhe koi bhi naam bhejo — main use <b>65+ stylish fonts</b> aur <b>decorated fancy names</b> me bana ke doonga ✨\n\n` +
  `<b>Example:</b> <code>Kabir Singh</code>\n\n` +
  `Neeche buttons se tutorial dekho 👇`;

const TUTORIAL =
  `📖 <b>Tutorial — Kaise use kare?</b>\n\n` +
  `1️⃣ Bot ko <code>/start</code> karo.\n` +
  `2️⃣ Seedha apna naam type karke bhej do (jaise <code>Kabir Singh</code>).\n` +
  `3️⃣ Bot turant <b>12-15 decorated names</b> ek-ek message me bhej dega.\n` +
  `4️⃣ <b>/fonts naam</b> likho — 65+ font styles page buttons ke sath milenge.\n` +
  `5️⃣ Jo style pasand aaye, us par <b>tap-and-hold → Copy</b> karke Telegram naam/bio me paste kar do.\n\n` +
  `<b>Commands:</b>\n` +
  `/start — bot start\n/fancy naam — decorated names\n/fonts naam — sabhi font styles\n/tutorial — ye guide\n/help — madad`;

const HELP =
  `❓ <b>Help</b>\n\n` +
  `• Sirf naam bhejo, bot khud bana dega.\n` +
  `• Hindi/English dono chalega (English letters best result dete hain).\n` +
  `• Kuch fonts purane phone me box (▯) dikh sakte hain — dusra style choose karo.\n` +
  `• Copy karne ke liye text par tap-and-hold karo.`;

function ownerInfoText() {
  const un = OWNER_USERNAME ? `@${OWNER_USERNAME}` : "owner";
  return (
    `👑 <b>Bot Owner</b>\n\n` +
    `Contact: ${OWNER_USERNAME ? `<a href="https://t.me/${OWNER_USERNAME}">${esc(un)}</a>` : "owner se channel ke through sampark karo"}\n` +
    `📣 Channel: @${CHANNEL}`
  );
}

// ── Name rendering ──
function renderPage(text, page) {
  const styles = styleList(text);
  const slice = styles.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const body = slice
    .map(([name, val]) => `<b>${esc(name)}</b>\n<code>${esc(val)}</code>`)
    .join("\n\n");
  return { text: `✨ <b>Fancy Fonts .ᐟ.ᐟ</b>\n\n${body}`, total: styles.length };
}

function sendFonts(chatId, text, page) {
  lastText.set(chatId, text);
  const { text: body, total } = renderPage(text, page);
  return bot.sendMessage(chatId, body, { parse_mode: "HTML", reply_markup: resultKeyboard(page, total) });
}

// MAIN FLOW: user ka requested naam — 12-15 decorated names, EK-EK message me,
// sirf styled name + apna watermark (#naam@FontsxWorld).
// Collected data me naam mila to wahi do, nahi mila to engine se bana ke do.
async function sendRequestedNames(chatId, text, theme) {
  const base = namegen.titleCase(namegen.cleanName(text));
  const tag = hashTag(base, CHANNEL); // #naam@FontsxWorld — sirf apna watermark
  const count = 12;

  // 1) Premium engine se top-quality names (scored + de-duped)
  let blocks = theme ? namegen.themedNames(base, theme, count) : namegen.premiumNames(base, count);

  // 2) Collected (scanned) names me se best mila to unhe bhi mila do
  const stored = store.getNames(base);
  if (stored.length) {
    const ranked = stored
      .map((v) => ({ v, s: namegen.score(v, base) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map((x) => x.v);
    const seen = new Set(blocks);
    blocks = ranked.filter((v) => !seen.has(v)).concat(blocks).slice(0, count);
  }

  await sendSafe(chatId, `✨ <b>${esc(base)}</b> ke liye ${blocks.length} best stylish names — ek-ek message me 👇`, {
    parse_mode: "HTML",
  });
  for (const block of blocks) {
    await sendSafe(chatId, `${esc(block)}\n\n${esc(tag)}`, { parse_mode: "HTML" });
    await delay(150); // flood limit se bachne ke liye halka gap
  }
  await sendSafe(chatId, `✅ Ho gaya! Style theme choose karke aur names lo 👇`, {
    reply_markup: { inline_keyboard: themeRows() },
  });
}

// Theme buttons (royal / aesthetic / dark / cute / gamer / spiritual / minimal)
function themeRows() {
  const ids = namegen.themeIds();
  const rows = [];
  for (let i = 0; i < ids.length; i += 3) {
    rows.push(
      ids.slice(i, i + 3).map((t) => ({
        text: `${t.icon} ${t.id.charAt(0).toUpperCase() + t.id.slice(1)}`,
        callback_data: "t:" + t.id,
      }))
    );
  }
  rows.push([{ text: "🎨 65+ Fonts List", callback_data: "more_fonts" }]);
  rows.push([{ text: "📣 Channel", url: "https://t.me/" + CHANNEL }]);
  return rows;
}

// ── Commands ──
bot.onText(/^\/start/, (msg) => {
  store.trackUser(msg.from);
  bot.sendMessage(msg.chat.id, WELCOME(msg.from.first_name || "friend"), {
    parse_mode: "HTML",
    reply_markup: startKeyboard(msg.from.id),
  });
});

bot.onText(/^\/(tutorial|guide)/, (msg) =>
  bot.sendMessage(msg.chat.id, TUTORIAL, { parse_mode: "HTML", reply_markup: startKeyboard(msg.from.id) })
);
bot.onText(/^\/help/, (msg) => bot.sendMessage(msg.chat.id, HELP, { parse_mode: "HTML" }));

// /owner  → owner ki profile card (sabke liye)
bot.onText(/^\/owner/, (msg) => {
  const url = ownerProfileUrl();
  bot.sendMessage(msg.chat.id, ownerInfoText(), {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: url ? { inline_keyboard: [[{ text: "👤 Owner Profile Kholo", url }]] } : undefined,
  });
});

// /panel , /admin → owner panel (sirf owner)
bot.onText(/^\/(panel|admin)/, (msg) => {
  if (!isOwner(msg.from.id)) return bot.sendMessage(msg.chat.id, "🚫 Ye sirf owner ke liye hai.");
  bot.sendMessage(msg.chat.id, PANEL_TEXT, { parse_mode: "HTML", reply_markup: panelKeyboard() });
});

bot.onText(/^\/accounts/, (msg) => {
  if (!isOwner(msg.from.id)) return;
  bot.sendMessage(msg.chat.id, accountsText(), { parse_mode: "HTML", reply_markup: accountsKeyboard() });
});

bot.onText(/^\/stats/, (msg) => {
  if (!isOwner(msg.from.id)) return;
  bot.sendMessage(msg.chat.id, statsText(), { parse_mode: "HTML", reply_markup: panelKeyboard() });
});

bot.onText(/^\/scan(?:\s+([\s\S]+))?/, async (msg, m) => {
  if (!isOwner(msg.from.id)) return;
  const ids = (m[1] || "").split(/[\s,]+/).filter(Boolean);
  if (!ids.length) {
    pendingScan.set(msg.from.id, { force: false });
    return bot.sendMessage(
      msg.chat.id,
      `📡 Chat id ya @username bhejo — ek ya ek se zyada (space/comma se alag).\nForce rescan ke liye <code>!</code> prefix lagao (jaise <code>!@somechannel</code>).\nCancel ke liye: <code>cancel</code>`,
      { parse_mode: "HTML" }
    );
  }
  await runScan(msg.chat.id, ids, false);
});

bot.onText(/^\/fonts(?:\s+([\s\S]+))?/, (msg, m) => {
  const t = (m[1] || "").trim();
  if (!t) return bot.sendMessage(msg.chat.id, "Use: <code>/fonts Kabir Singh</code>", { parse_mode: "HTML" });
  store.trackUser(msg.from);
  store.bumpRequest(msg.from.id);
  sendFonts(msg.chat.id, t, 0);
});

bot.onText(/^\/fancy(?:\s+([\s\S]+))?/, async (msg, m) => {
  const t = (m[1] || "").trim();
  if (!t) return bot.sendMessage(msg.chat.id, "Use: <code>/fancy Kabir</code>", { parse_mode: "HTML" });
  store.trackUser(msg.from);
  store.bumpRequest(msg.from.id);
  await sendRequestedNames(msg.chat.id, t);
});

// ── Scan runner (owner only) ──
async function runScan(chatId, ids, force) {
  if (!scanner.scannerReady()) {
    return bot.sendMessage(
      chatId,
      `⚠️ Scanner ready nahi hai.\n\n1️⃣ <code>API_ID</code> + <code>API_HASH</code> env vars set karo (my.telegram.org)\n2️⃣ Owner Panel → 👤 <b>Accounts</b> → ➕ <b>Add Account</b> se apna number login karo.`,
      { parse_mode: "HTML", reply_markup: accountsKeyboard() }
    );
  }
  const status = await sendSafe(chatId, `📡 Scanning ${ids.length} channel(s)... ⏳`);
  try {
    const results = await scanner.scanChannels(ids, { force });
    // naye ornaments engine me live merge
    extendTemplates(store.templates);
    const lines = results.map((r) => {
      if (r.status === "done")
        return `✅ <b>${esc(r.id)}</b> — ${r.scanned} msgs scanned, <b>${r.added}</b> names add hue, ${r.dupes} duplicate skip, ${r.ornaments} ornaments`;
      if (r.status === "skipped") return `⏭ <b>${esc(r.id)}</b> — skip (${esc(r.reason)})`;
      return `❌ <b>${esc(r.id)}</b> — ${esc(r.reason || "error")}`;
    });
    await bot.sendMessage(chatId, `📡 <b>Scan Result</b>\n\n${lines.join("\n")}`, { parse_mode: "HTML", reply_markup: panelKeyboard() });
  } catch (e) {
    await bot.sendMessage(chatId, `❌ Scan failed: ${esc(e.message)}`, { parse_mode: "HTML" });
  }
  bot.deleteMessage(chatId, status.message_id).catch(() => {});
}

// ── Messages ──
bot.on("message", async (msg) => {
  const t = (msg.text || "").trim();
  if (!t || t.startsWith("/")) return;
  store.trackUser(msg.from);

  // Owner ka pending account-login input (phone / OTP / 2FA)
  if (isOwner(msg.from.id) && accounts.loginState(msg.from.id)) {
    const step = accounts.loginState(msg.from.id);
    let res;
    try {
      res = await accounts.handleInput(msg.from.id, t);
    } catch (e) {
      accounts.cancelLogin(msg.from.id);
      res = { step: "error", message: "❌ " + esc(e.message) };
    }
    // OTP / password wale message ko chat se hata do
    if (step === "code" || step === "password") {
      bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});
    }
    if (res) {
      const done = res.step === "done" || res.step === "cancelled" || res.step === "error";
      return bot.sendMessage(msg.chat.id, res.message, {
        parse_mode: "HTML",
        reply_markup: done ? accountsKeyboard() : undefined,
      });
    }
    return;
  }

  // Owner ka pending scan input
  if (isOwner(msg.from.id) && pendingScan.has(msg.from.id)) {
    if (t.toLowerCase() === "cancel") {
      pendingScan.delete(msg.from.id);
      return bot.sendMessage(msg.chat.id, "❎ Scan cancel ho gaya.", { reply_markup: panelKeyboard() });
    }
    const { force } = pendingScan.get(msg.from.id);
    pendingScan.delete(msg.from.id);
    const ids = t.split(/[\s,]+/).filter(Boolean);
    return runScan(msg.chat.id, ids, force);
  }

  if (t.length > 40) return bot.sendMessage(msg.chat.id, "😅 Naam thoda chhota bhejo (max 40 characters).");

  store.bumpRequest(msg.from.id);
  lastText.set(msg.chat.id, t);
  try {
    await sendRequestedNames(msg.chat.id, t);
  } catch (e) {
    console.error("sendRequestedNames:", e.message);
  }
});

// ── Callbacks ──
bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const data = q.data || "";
  const saved = lastText.get(chatId) || "Kabir Singh";
  store.trackUser(q.from);
  try {
    if (data === "tutorial") {
      await bot.sendMessage(chatId, TUTORIAL, { parse_mode: "HTML", reply_markup: startKeyboard(q.from.id) });
    } else if (data === "help") {
      await bot.sendMessage(chatId, HELP, { parse_mode: "HTML" });
    } else if (data === "demo") {
      await sendFonts(chatId, "Kabir Singh", 0);
    } else if (data === "demo_decor") {
      await sendRequestedNames(chatId, "Kabir Singh");
    } else if (data === "more_fonts") {
      await sendFonts(chatId, saved, 0);
    } else if (data === "decor") {
      await sendRequestedNames(chatId, saved);
    } else if (data === "owner") {
      // 👑 Owner button — sabke liye owner ki profile card
      const url = ownerProfileUrl();
      await bot.sendMessage(chatId, ownerInfoText(), {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: url ? { inline_keyboard: [[{ text: "👤 Owner Profile Kholo", url }]] } : undefined,
      });
    } else if (data === "panel") {
      // ⚙️ Owner Panel — alag button, sirf owner
      if (!isOwner(q.from.id)) {
        await bot.answerCallbackQuery(q.id, { text: "🚫 Sirf owner ke liye", show_alert: true }).catch(() => {});
        return;
      }
      await bot.sendMessage(chatId, PANEL_TEXT, { parse_mode: "HTML", reply_markup: panelKeyboard() });
    } else if (data.startsWith("t:")) {
      await sendRequestedNames(chatId, saved, data.slice(2));
    } else if (data === "o:accs" && isOwner(q.from.id)) {
      await bot.sendMessage(chatId, accountsText(), { parse_mode: "HTML", reply_markup: accountsKeyboard() });
    } else if (data === "a:add" && isOwner(q.from.id)) {
      try {
        await accounts.startLogin(q.from.id);
        await bot.sendMessage(
          chatId,
          `➕ <b>Add Account</b>\n\nApna phone number country code ke sath bhejo, jaise <code>+919876543210</code>.\n\n` +
            `⚠️ Sirf apna account add karo. Cancel ke liye: <code>cancel</code>`,
          { parse_mode: "HTML" }
        );
      } catch (e) {
        await bot.sendMessage(chatId, "❌ " + esc(e.message), { parse_mode: "HTML" });
      }
    } else if (data.startsWith("a:use:") && isOwner(q.from.id)) {
      accounts.setActive(data.slice(6));
      await bot.sendMessage(chatId, "✅ Active account switch ho gaya.", { reply_markup: accountsKeyboard() });
    } else if (data.startsWith("a:del:") && isOwner(q.from.id)) {
      accounts.remove(data.slice(6));
      await bot.sendMessage(chatId, "🗑 Account hata diya (session delete).", { reply_markup: accountsKeyboard() });
    } else if (data === "o:stats" && isOwner(q.from.id)) {
      await bot.sendMessage(chatId, statsText(), { parse_mode: "HTML", reply_markup: panelKeyboard() });
    } else if ((data === "o:scan" || data === "o:rescan") && isOwner(q.from.id)) {
      pendingScan.set(q.from.id, { force: data === "o:rescan" });
      await bot.sendMessage(
        chatId,
        `📡 Chat id ya @username bhejo — ek ya ek se zyada (space/comma se alag).\n` +
          (data === "o:rescan" ? `♻️ Force rescan ON — pehle scanned channels bhi dobara scan honge.\n` : `Jo channel pehle se scanned hai wo skip hoga.\n`) +
          `Cancel ke liye: <code>cancel</code>`,
        { parse_mode: "HTML" }
      );
    } else if (data === "o:back" && isOwner(q.from.id)) {
      await bot.sendMessage(chatId, WELCOME(q.from.first_name || "boss"), {
        parse_mode: "HTML",
        reply_markup: startKeyboard(q.from.id),
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
  { command: "fonts", description: "Naam ko 65+ fonts me badlo" },
  { command: "fancy", description: "Decorated fancy names (ek-ek msg me)" },
  { command: "tutorial", description: "Kaise use kare" },
  { command: "help", description: "Madad" },
  { command: "owner", description: "Owner ki profile" },
  { command: "panel", description: "Owner panel (sirf owner)" },
]).catch(() => {});

bot.on("polling_error", (e) => console.error("polling_error:", e.message));
console.log("🚀 Fancy Font Name Bot started");
console.log(scanner.scannerReady() ? "📡 Scanner: READY" : "📡 Scanner: off (API_ID/API_HASH/SESSION_STRING missing)");
