// Channel scanner — owner panel ka "Scan Name Channel" feature.
// IMPORTANT: Bot API se kisi channel ka message history padha NAHI ja sakta.
// Isliye ye module GramJS (MTProto user client) use karta hai — iske liye
// API_ID, API_HASH aur SESSION_STRING env vars chahiye (README dekho).
// Ye sirf styled name text aur ornaments collect karta hai — kisi channel ka
// naam, @username, link ya watermark store NAHI karta.
const store = require("./store");
const accounts = require("./accounts");

let _client = null;
let _clientSession = null;

// Ready = API creds + (owner panel se add kiya account YA env SESSION_STRING)
function scannerReady() {
  return !!(process.env.API_ID && process.env.API_HASH && accounts.activeSession());
}

async function getClient() {
  const session = accounts.activeSession();
  if (!session) throw new Error("Koi account add nahi hai — Owner Panel se ➕ Add Account karo.");
  // account switch hua to purana client chhod do
  if (_client && _clientSession !== session) {
    await _client.disconnect().catch(() => {});
    _client = null;
  }
  if (_client) return _client;
  // Lazy require — telegram package na ho ya env missing ho to baki bot chalta rahe
  const { TelegramClient } = require("telegram");
  const { StringSession } = require("telegram/sessions");
  const apiId = parseInt(process.env.API_ID, 10);
  const apiHash = process.env.API_HASH;
  _client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5,
  });
  _clientSession = session;
  await _client.connect();
  return _client;
}

// ── Text cleaning: watermark / channel-name / links hatao ──
const HAS_FANCY = /[^\x00-\x7F]/;

function cleanMessage(raw) {
  let base = null;
  const lines = String(raw).split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const kept = [];

  for (let line of lines) {
    // base name pehle hashtag se pakdo:  #rahul  ya  #rahul@KisiChannel
    const tags = [...line.matchAll(/#([A-Za-z][A-Za-z0-9_]{0,31})(@[A-Za-z0-9_]+)?/g)];
    for (const t of tags) {
      if (!base) base = t[1].replace(/_/g, " ").trim();
    }
    // URLs, @mentions, #hashtags — sab hatao (kisi ka channel naam/watermark nahi rakhna)
    line = line
      .replace(/https?:\/\/\S+|t\.me\/\S+|telegram\.me\/\S+/gi, " ")
      .replace(/@[A-Za-z0-9_]+/g, " ")
      .replace(/#\S+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!line) continue;

    if (!HAS_FANCY.test(line)) {
      // plain ASCII line — shayad base naam ho (jaise "Rahul")
      if (!base && /^[A-Za-z][A-Za-z .'-]{1,24}$/.test(line)) base = line;
      continue; // plain promo lines store nahi karte
    }
    kept.push(line);
  }
  return { base, variants: kept };
}

// Line ke shuru/aakhir ke symbol clusters ko ornament template ke roop me nikalo
const SYM = /[\p{S}\p{P}]/u;
function extractOrnaments(line, out) {
  const chars = Array.from(line);
  let i = 0;
  while (i < chars.length && (SYM.test(chars[i]) || chars[i] === " ")) i++;
  let j = chars.length;
  while (j > i && (SYM.test(chars[j - 1]) || chars[j - 1] === " ")) j--;
  const pre = chars.slice(0, i).join("").trim();
  const post = chars.slice(j).join("").trim();
  if (pre.length >= 2 && !/^[a-z0-9 ]+$/i.test(pre)) out.pre.push(pre.slice(0, 20));
  if (post.length >= 2 && !/^[a-z0-9 ]+$/i.test(post)) out.post.push(post.slice(0, 20));
  // poori line hi symbols ki ho (separator / divider line)
  if (i >= chars.length && line.length >= 2 && line.length <= 10) out.sep.push(line);
  // single emoji frame lines
  if (chars.length <= 3 && [...line].every((c) => SYM.test(c))) out.frames.push(line);
}

// ids: array of "@username" ya numeric chat id strings. force=true pe rescan.
async function scanChannels(ids, opts = {}) {
  if (!scannerReady()) {
    throw new Error(
      "Scanner ke liye API_ID + API_HASH env chahiye aur Owner Panel se ek account add karna hoga."
    );
  }
  const client = await getClient();
  const results = [];

  for (const rawId of ids) {
    let id = String(rawId).trim();
    if (!id) continue;
    let force = opts.force || false;
    if (id.startsWith("!")) {
      force = true;
      id = id.slice(1);
    }
    const key = id.toLowerCase();

    if (!force && store.isScanned(key)) {
      results.push({ id, status: "skipped", reason: "pehle se scanned hai (force ke liye ! prefix lagao)" });
      continue;
    }

    let entity;
    try {
      entity = await client.getEntity(/^-?\d+$/.test(id) ? id : id.replace(/^@/, ""));
    } catch (e) {
      results.push({ id, status: "error", reason: "channel nahi mila: " + e.message });
      continue;
    }

    const title = (entity && (entity.title || entity.username)) || id;
    let scanned = 0, added = 0, dupes = 0;
    const orn = { pre: [], post: [], sep: [], frames: [] };

    try {
      for await (const msg of client.iterMessages(entity, { limit: 400 })) {
        const text = msg && msg.message;
        if (!text || typeof text !== "string") continue;
        scanned++;
        const { base, variants } = cleanMessage(text);
        for (const v of variants) {
          extractOrnaments(v, orn);
          if (base && v.length <= 120) {
            if (store.addName(base, v)) added++;
            else dupes++;
          }
        }
      }
    } catch (e) {
      results.push({ id, status: "error", reason: e.message, scanned, added });
      continue;
    }

    // ornament templates store me daalo
    let ornAdded = 0;
    for (const kind of ["pre", "post", "sep", "frames"]) {
      for (const v of orn[kind]) if (store.addTemplate(kind, v)) ornAdded++;
    }

    store.markScanned(key, { title: String(title).slice(0, 60), scanned, added });
    results.push({ id, title, status: "done", scanned, added, dupes, ornaments: ornAdded });
  }

  return results;
}

module.exports = { scanChannels, scannerReady, cleanMessage, extractOrnaments };
