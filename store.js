// Simple JSON-file data store — users, collected name styles, ornament templates.
// NOTE (Heroku): free/eco dynos ka disk ephemeral hota hai — dyno restart pe data
// reset ho sakta hai. Permanent rakhna ho to DATA_DIR ko persistent volume par
// point karo ya baad me kisi DB (Postgres/Redis) me migrate kar lo.
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const NAME_CAP = 60; // per base name max variants

let db = {
  users: {},            // userId -> { id, name, username, firstSeen, lastSeen, requests }
  names: {},            // base (lowercase) -> [styled variants]
  templates: { pre: [], post: [], sep: [], frames: [] },
  scannedChannels: {},  // chatId/@user -> { at, added, title }
  totalRequests: 0,
  startedAt: Date.now(),
};

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      db = Object.assign(db, raw);
      db.templates = Object.assign({ pre: [], post: [], sep: [], frames: [] }, raw.templates || {});
    }
  } catch (e) {
    console.error("store load failed:", e.message);
  }
}

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(db));
    } catch (e) {
      console.error("store save failed:", e.message);
    }
  }, 500);
}

function normBase(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
}

function trackUser(from) {
  if (!from || !from.id) return;
  const id = String(from.id);
  const now = Date.now();
  const u = db.users[id] || { id, firstSeen: now, requests: 0 };
  u.name = [from.first_name, from.last_name].filter(Boolean).join(" ") || u.name || "";
  u.username = from.username || u.username || "";
  u.lastSeen = now;
  db.users[id] = u;
  save();
}

function bumpRequest(userId) {
  db.totalRequests++;
  const u = db.users[String(userId)];
  if (u) u.requests++;
  save();
}

// Returns true agar naya add hua, false agar duplicate tha
function addName(base, styled) {
  base = normBase(base);
  styled = String(styled).trim();
  if (!base || !styled) return false;
  const list = db.names[base] || (db.names[base] = []);
  if (list.includes(styled)) return false;
  if (list.length >= NAME_CAP) return false;
  list.push(styled);
  save();
  return true;
}

function getNames(base) {
  return db.names[normBase(base)] || [];
}

function addTemplate(kind, value) {
  const pool = db.templates[kind];
  if (!pool) return false;
  value = String(value).trim();
  if (!value || value.length > 24 || pool.includes(value)) return false;
  if (pool.length >= 250) pool.shift();
  pool.push(value);
  save();
  return true;
}

function isScanned(id) {
  return !!db.scannedChannels[String(id).toLowerCase()];
}

function markScanned(id, info) {
  db.scannedChannels[String(id).toLowerCase()] = Object.assign({ at: Date.now() }, info);
  save();
}

function stats(fontStyleCount) {
  const nameBases = Object.keys(db.names);
  const nameVariants = nameBases.reduce((n, k) => n + db.names[k].length, 0);
  return {
    users: Object.keys(db.users).length,
    totalRequests: db.totalRequests,
    fontStyles: fontStyleCount,
    nameBases: nameBases.length,
    nameVariants,
    templates: {
      pre: db.templates.pre.length,
      post: db.templates.post.length,
      sep: db.templates.sep.length,
      frames: db.templates.frames.length,
    },
    scannedChannels: Object.keys(db.scannedChannels).length,
    uptimeMs: Date.now() - db.startedAt,
  };
}

load();

module.exports = {
  trackUser,
  bumpRequest,
  addName,
  getNames,
  addTemplate,
  isScanned,
  markScanned,
  stats,
  get templates() {
    return db.templates;
  },
};
