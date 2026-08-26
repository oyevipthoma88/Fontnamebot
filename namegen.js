// ============================================================
// PREMIUM NAME ENGINE  (v3)
// Purana engine random marks aur random ornaments mix karta tha, isliye
// output "gandha" lagta tha. Ye engine 3 rules follow karta hai:
//
//   1) COVERAGE — koi font tabhi use hota hai jab wo naam ke SAARE letters
//      support karta ho. Aadha-adhoora font (box ▯ / mixed script) reject.
//   2) THEME MATCHING — pre/post ornaments jode me aate hain (symmetric),
//      random nahi. Frame, separator aur font ek hi theme se aate hain.
//   3) SCORING — har candidate ko score milta hai (readability, symmetry,
//      length, uniqueness) aur sirf TOP results user ko jate hain.
//
// Combining marks (zalgo type) by default OFF hain — wo purane phones me
// tut jate hain aur "ugly" dikhte hain.
// ============================================================
const { MAPS, applyMap } = require("./fonts");

const cp = (s) => Array.from(s);

// ── deterministic RNG (same naam → same premium result) ──
function seedOf(str) {
  let h = 2166136261;
  for (const ch of str) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

// ── name cleanup ──
function cleanName(raw) {
  return String(raw)
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/[#@]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 32);
}
function titleCase(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// ── font quality tiers (best-rendering fonts first) ──
// Tier A: Telegram + Android + iOS me sabse safe aur premium dikhte hain.
const TIER_A = [
  "Bold Serif", "Bold Italic Serif", "Italic Serif", "Sans Bold",
  "Sans Bold Italic", "Sans Italic", "Bold Script", "Script",
  "Double Struck", "Monospace", "Small Caps",
];
// Tier B: stylish but thoda heavy/rare — kam weight.
const TIER_B = ["Fraktur", "Bold Fraktur", "Fullwidth", "Circled", "Squared"];

// Font naam ke saare letters ko cover karta hai?
function covers(mapName, text) {
  const map = MAPS[mapName];
  if (!map) return false;
  for (const ch of cp(text)) {
    if (ch === " " || ch === "." || ch === "'" || ch === "-") continue;
    if (!map[ch] && !map[ch.toLowerCase()] && !map[ch.toUpperCase()]) return false;
  }
  return true;
}
function usableFonts(text) {
  const a = TIER_A.filter((f) => covers(f, text));
  const b = TIER_B.filter((f) => covers(f, text));
  return { a, b, all: a.concat(b) };
}

// ── THEMES: matched ornament sets (hath se curate kiye gaye) ──
// pairs: [prefix, suffix] — symmetric jode
// frame: theme ka signature emoji
// sep: multi-word naam ke beech ka joiner
const THEMES = [
  {
    id: "royal",
    frames: ["👑", "🦁", "💎", "🏆"],
    pairs: [["༄", "࿐"], ["⌯", "⌯"], ["❰", "❱"], ["⟬", "⟭"], ["𓆩", "𓆪"]],
    sep: ["᭄", "•", "☬", "×"],
    fonts: ["Bold Serif", "Bold Italic Serif", "Sans Bold", "Double Struck"],
  },
  {
    id: "aesthetic",
    frames: ["🌸", "✨", "🕊️", "🦋", "💫"],
    pairs: [["˚｡⋆", "⋆｡˚"], ["⊹", "⊹"], ["✧", "✧"], ["˗ˏˋ", "ˊˎ˗"], ["⋆｡°", "°｡⋆"]],
    sep: ["·", "˚", "⋆", "࿐"],
    fonts: ["Script", "Bold Script", "Italic Serif", "Sans Italic"],
  },
  {
    id: "dark",
    frames: ["🥀", "⚡", "🖤", "🗡️"],
    pairs: [["༺", "༻"], ["⟦", "⟧"], ["≛", "≛"], ["丨", "丨"], ["【", "】"]],
    sep: ["࿆", "†", "×", "彡"],
    fonts: ["Bold Fraktur", "Fraktur", "Bold Serif", "Monospace"],
  },
  {
    id: "cute",
    frames: ["🎀", "🧸", "🍓", "🫧"],
    pairs: [["♡", "♡"], ["₊˚", "˚₊"], ["ᰔ", "ᰔ"], ["︶", "︶"], ["ೃ", "ೃ"]],
    sep: ["♡", "·", "˚", "ᯓ"],
    fonts: ["Bold Script", "Script", "Small Caps", "Sans Italic"],
  },
  {
    id: "gamer",
    frames: ["🎮", "🔥", "💀", "🚀"],
    pairs: [["ᴳᵛ", "ᵜ"], ["⌁", "⌁"], ["「", "」"], ["≺", "≻"], ["ᯓ", "ᯓ"]],
    sep: ["᯽", "×", "•", "࿇"],
    fonts: ["Sans Bold", "Monospace", "Double Struck", "Bold Serif"],
  },
  {
    id: "spiritual",
    frames: ["🕉️", "🪷", "🌙", "🪔"],
    pairs: [["࿇", "࿇"], ["༄ᶦᶫᵛ", "࿐"], ["☬", "☬"], ["᭄", "᭄"], ["꧁", "꧂"]],
    sep: ["☬", "࿐", "᭄", "·"],
    fonts: ["Bold Serif", "Italic Serif", "Small Caps", "Bold Script"],
  },
  {
    id: "minimal",
    frames: ["◆", "▪", "◈", "❖"],
    pairs: [["", ""], ["·", "·"], ["—", "—"], ["/", "/"], ["|", "|"]],
    sep: ["·", "—", "|", "•"],
    fonts: ["Small Caps", "Monospace", "Sans Bold", "Double Struck"],
  },
];

// ── layouts: clean, symmetric, copy-paste friendly ──
// Sabhi single-line hain (Telegram name/bio me directly paste ho jate hain),
// last do multi-line "showcase" style hain.
const LAYOUTS = [
  (n, t, r) => `${pick(t.frames, r)}${n}${pick(t.frames, r)}`,
  (n, t, r) => { const [a, b] = pick(t.pairs, r); return `${a}${n}${b}`.trim(); },
  (n, t, r) => { const [a, b] = pick(t.pairs, r); return `${a} ${n} ${b}`.trim(); },
  (n, t, r) => { const f = pick(t.frames, r); const [a, b] = pick(t.pairs, r); return `${f}${a} ${n} ${b}${f}`.trim(); },
  (n, t, r) => `${n} ${pick(t.frames, r)}`,
  (n, t, r) => `${pick(t.frames, r)} ${n}`,
  (n, t, r) => { const [a, b] = pick(t.pairs, r); return `${a}${pick(t.frames, r)} ${n} ${pick(t.frames, r)}${b}`.trim(); },
  (n, t, r) => `${pick(t.sep, r)}${n}${pick(t.sep, r)}`,
  (n, t, r) => { const f = pick(t.frames, r); return `${f}\n${n}\n${f}`; },
  (n, t, r) => { const [a, b] = pick(t.pairs, r); return `${a}${a}\n  ${n}\n${b}${b}`; },
];

// ── word joining for multi-word names ──
function joinWords(words, font, theme, r, mode) {
  const styled = words.map((w) => applyMap(MAPS[font], w));
  if (styled.length === 1) return styled[0];
  if (mode === 0) return styled.join(" ");
  if (mode === 1) return styled.join(pick(theme.sep, r));
  if (mode === 2) return styled.join(` ${pick(theme.sep, r)} `);
  // first word full, rest short-joined
  return styled[0] + pick(theme.sep, r) + styled.slice(1).join(" ");
}

// ── scoring: kya ye result "badhiya" hai? ──
function score(block, plain) {
  let s = 100;
  const len = cp(block).length;
  const plainLen = cp(plain).length;

  // bahut lamba = Telegram name field me kategа
  if (len > 64) s -= (len - 64) * 3;
  if (len > 40) s -= (len - 40);
  // bilkul bina decoration = boring
  if (len <= plainLen + 1) s -= 25;

  const symbols = cp(block).filter((c) => /[\p{S}\p{P}]/u.test(c)).length;
  const ratio = symbols / Math.max(len, 1);
  // 12%–40% ornament sweet spot; iske bahar clutter ya plain
  if (ratio > 0.45) s -= (ratio - 0.45) * 220;
  if (ratio < 0.08) s -= 18;

  // combining marks (zalgo) — render tut jata hai
  const combining = cp(block).filter((c) => /[\u0300-\u036f\u0483-\u0489]/u.test(c)).length;
  s -= combining * 12;

  // repeated same symbol 3+ times spam lagta hai
  if (/(.)\1{3,}/u.test(block)) s -= 20;
  // symmetric open/close bonus
  const first = cp(block)[0], last = cp(block)[len - 1];
  if (first && last && /[\p{S}\p{P}]/u.test(first) && /[\p{S}\p{P}]/u.test(last)) s += 12;
  // short & sweet bonus
  if (len >= plainLen + 4 && len <= plainLen + 16) s += 15;

  return s;
}

// ── MAIN: best decorated names ──
// Deterministic: ek naam ke liye har baar same top results (users ko consistent
// quality milti hai), par har naam ka apna unique flavour.
function premiumNames(rawName, count = 12, opts = {}) {
  const plain = titleCase(cleanName(rawName)) || "Name";
  const words = plain.split(" ").filter(Boolean);
  const r = rng(seedOf(plain.toLowerCase()) ^ 0x5bf03635);
  const { a, b, all } = usableFonts(plain);
  const fontPool = (a.length ? a : all.length ? all : ["Bold Serif"]).concat(b.slice(0, 2));

  const candidates = [];
  const seen = new Set();
  const themes = opts.theme ? THEMES.filter((t) => t.id === opts.theme) : THEMES;

  // sabhi theme × font × layout combos try karo, phir best chuno
  for (const theme of themes) {
    const fonts = theme.fonts.filter((f) => fontPool.includes(f));
    const useFonts = fonts.length ? fonts : fontPool.slice(0, 3);
    for (const font of useFonts) {
      for (let li = 0; li < LAYOUTS.length; li++) {
        for (let mode = 0; mode < (words.length > 1 ? 3 : 1); mode++) {
          const name = joinWords(words, font, theme, r, mode);
          const block = LAYOUTS[li](name, theme, r).trim();
          if (!block || seen.has(block)) continue;
          seen.add(block);
          candidates.push({ block, theme: theme.id, font, s: score(block, plain) });
        }
      }
    }
  }

  candidates.sort((x, y) => y.s - x.s);

  // Variety: ek hi theme/font ke 3 se zyada results na aaye
  const out = [];
  const themeCount = {};
  const fontCount = {};
  for (const c of candidates) {
    if (out.length >= count) break;
    if ((themeCount[c.theme] || 0) >= 3) continue;
    if ((fontCount[c.font] || 0) >= 3) continue;
    themeCount[c.theme] = (themeCount[c.theme] || 0) + 1;
    fontCount[c.font] = (fontCount[c.font] || 0) + 1;
    out.push(c);
  }
  // agar variety filter ke baad kam pade to top-up
  for (const c of candidates) {
    if (out.length >= count) break;
    if (!out.includes(c)) out.push(c);
  }
  return out.slice(0, count).map((c) => c.block);
}

// Ek theme ke best names (theme buttons ke liye)
function themedNames(rawName, themeId, count = 8) {
  return premiumNames(rawName, count, { theme: themeId });
}

const themeIds = () => THEMES.map((t) => ({ id: t.id, icon: t.frames[0] }));

module.exports = { premiumNames, themedNames, themeIds, cleanName, titleCase, score, usableFonts };
