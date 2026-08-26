// ============================================================
// ACCOUNT MANAGER — Owner Panel ka "➕ Add Account" feature
//
// Scam/name channels scan karne ke liye Bot API kaafi nahi hai (bot channel ka
// history nahi padh sakta). Isliye owner apna khud ka Telegram account
// number se login karke add karta hai (MTProto / GramJS).
//
// SECURITY (padhna zaroori hai):
//  • Ye flow SIRF OWNER_ID ke liye khulta hai. Kisi normal user ko phone/OTP
//    kabhi nahi poocha jata — dusre logon ka account maangna Telegram ToS
//    violation hai aur account ban karwa deta hai.
//  • Login session string account ka full access deti hai. Isliye wo
//    AES-256-GCM se encrypt hoke local data file me jati hai (SESSION_KEY env).
//  • Bot chat me OTP code likhne ke turant baad wo message delete karne ki
//    koshish ki jati hai.
// ============================================================
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "accounts.json");

const API_ID = parseInt(process.env.API_ID || "0", 10);
const API_HASH = process.env.API_HASH || "";

function keyBuf() {
  const raw = process.env.SESSION_KEY || process.env.BOT_TOKEN || "";
  if (!raw) throw new Error("SESSION_KEY (ya BOT_TOKEN) set nahi hai — session encrypt nahi kar sakta.");
  return crypto.createHash("sha256").update("fontnamebot:" + raw).digest();
}
function enc(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", keyBuf(), iv);
  const ct = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
function dec(stored) {
  const buf = Buffer.from(stored, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", keyBuf(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

let db = { accounts: [], activeId: null }; // accounts: [{ id, label, phoneMasked, session, addedAt }]
try {
  if (fs.existsSync(FILE)) db = Object.assign(db, JSON.parse(fs.readFileSync(FILE, "utf8")));
} catch (e) {
  console.error("accounts load failed:", e.message);
}
function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(db), { mode: 0o600 });
  } catch (e) {
    console.error("accounts save failed:", e.message);
  }
}

const apiReady = () => !!(API_ID && API_HASH);
const maskPhone = (p) => String(p).replace(/\s/g, "").replace(/^(\+?\d{2,3})\d+(\d{3})$/, "$1•••••$2");

function list() {
  return db.accounts.map((a) => ({
    id: a.id,
    label: a.label,
    phoneMasked: a.phoneMasked,
    addedAt: a.addedAt,
    active: a.id === db.activeId,
  }));
}
function count() { return db.accounts.length; }

// Env SESSION_STRING bhi ek valid account hai (backward compatible)
function activeSession() {
  const a = db.accounts.find((x) => x.id === db.activeId) || db.accounts[0];
  if (a) {
    try { return dec(a.session); } catch (e) { console.error("session decrypt failed:", e.message); }
  }
  return process.env.SESSION_STRING || null;
}
function setActive(id) {
  if (!db.accounts.some((a) => a.id === id)) return false;
  db.activeId = id;
  save();
  return true;
}
function remove(id) {
  const before = db.accounts.length;
  db.accounts = db.accounts.filter((a) => a.id !== id);
  if (db.activeId === id) db.activeId = db.accounts[0] ? db.accounts[0].id : null;
  save();
  return db.accounts.length < before;
}

// ── login state machine (owner ke liye) ──
// steps: "phone" → "code" → ("password") → done
const pending = new Map(); // ownerId -> { step, phone, client, phoneCodeHash }

function loginState(ownerId) {
  const p = pending.get(ownerId);
  return p ? p.step : null;
}
function cancelLogin(ownerId) {
  const p = pending.get(ownerId);
  if (p && p.client) p.client.disconnect().catch(() => {});
  pending.delete(ownerId);
}

async function newClient() {
  const { TelegramClient } = require("telegram");
  const { StringSession } = require("telegram/sessions");
  const client = new TelegramClient(new StringSession(""), API_ID, API_HASH, { connectionRetries: 3 });
  await client.connect();
  return client;
}

async function startLogin(ownerId) {
  if (!apiReady()) throw new Error("API_ID aur API_HASH env vars set karo (my.telegram.org se milte hain).");
  cancelLogin(ownerId);
  pending.set(ownerId, { step: "phone" });
  return { step: "phone" };
}

// Owner ka text input handle karta hai. Return: { step, message, done? }
async function handleInput(ownerId, text) {
  const p = pending.get(ownerId);
  if (!p) return null;
  const value = String(text).trim();

  if (/^cancel$/i.test(value)) {
    cancelLogin(ownerId);
    return { step: "cancelled", message: "❎ Account login cancel ho gaya." };
  }

  if (p.step === "phone") {
    if (!/^\+?\d{8,15}$/.test(value.replace(/[\s-]/g, ""))) {
      return { step: "phone", message: "❌ Number theek nahi laga. Country code ke sath bhejo, jaise <code>+919876543210</code>." };
    }
    const phone = value.replace(/[\s-]/g, "").startsWith("+") ? value.replace(/[\s-]/g, "") : "+" + value.replace(/[\s-]/g, "");
    const client = await newClient();
    const res = await client.sendCode({ apiId: API_ID, apiHash: API_HASH }, phone);
    p.client = client;
    p.phone = phone;
    p.phoneCodeHash = res.phoneCodeHash;
    p.step = "code";
    return {
      step: "code",
      message:
        `📲 Code bhej diya <b>${maskPhone(phone)}</b> par.\n\n` +
        `Telegram app me aaya <b>5-digit code</b> yahan bhejo.\n` +
        `⚠️ Code bhejne ke baad wo message main delete kar dunga.\n` +
        `Cancel ke liye: <code>cancel</code>`,
    };
  }

  if (p.step === "code") {
    const code = value.replace(/\D/g, "");
    if (code.length < 4) return { step: "code", message: "❌ Sirf code ke digits bhejo (jaise <code>12345</code>)." };
    const { Api } = require("telegram");
    try {
      await p.client.invoke(
        new Api.auth.SignIn({ phoneNumber: p.phone, phoneCodeHash: p.phoneCodeHash, phoneCode: code })
      );
    } catch (e) {
      const msg = String(e.message || e);
      if (/SESSION_PASSWORD_NEEDED/i.test(msg)) {
        p.step = "password";
        return { step: "password", message: "🔐 Is account par 2FA on hai. Apna <b>2FA password</b> bhejo (main use save nahi karunga)." };
      }
      if (/PHONE_CODE_INVALID/i.test(msg)) return { step: "code", message: "❌ Code galat hai, dobara bhejo." };
      if (/PHONE_CODE_EXPIRED/i.test(msg)) {
        cancelLogin(ownerId);
        return { step: "cancelled", message: "⌛ Code expire ho gaya. Phir se <b>➕ Add Account</b> dabao." };
      }
      cancelLogin(ownerId);
      return { step: "error", message: "❌ Login fail: " + msg };
    }
    return finish(ownerId, p);
  }

  if (p.step === "password") {
    try {
      await p.client.signInWithPassword(
        { apiId: API_ID, apiHash: API_HASH },
        { password: async () => value, onError: (e) => { throw e; } }
      );
    } catch (e) {
      const msg = String(e.message || e);
      if (/PASSWORD_HASH_INVALID/i.test(msg)) return { step: "password", message: "❌ Password galat hai, dobara bhejo." };
      cancelLogin(ownerId);
      return { step: "error", message: "❌ Login fail: " + msg };
    }
    return finish(ownerId, p);
  }

  return null;
}

async function finish(ownerId, p) {
  const me = await p.client.getMe().catch(() => null);
  const session = p.client.session.save();
  const id = crypto.randomBytes(4).toString("hex");
  db.accounts.push({
    id,
    label: me ? [me.firstName, me.lastName].filter(Boolean).join(" ") || (me.username ? "@" + me.username : "account") : "account",
    phoneMasked: maskPhone(p.phone),
    session: enc(session),
    addedAt: Date.now(),
  });
  if (!db.activeId) db.activeId = id;
  save();
  await p.client.disconnect().catch(() => {});
  pending.delete(ownerId);
  return {
    step: "done",
    accountId: id,
    message:
      `✅ Account add ho gaya!\n\n` +
      `👤 ${db.accounts[db.accounts.length - 1].label}\n📱 ${maskPhone(p.phone)}\n\n` +
      `Ab <b>📡 Scan Name Channel</b> is account se chalega. Session encrypt hoke save hui hai.`,
  };
}

module.exports = {
  apiReady, list, count, activeSession, setActive, remove,
  startLogin, handleInput, loginState, cancelLogin, maskPhone,
};
