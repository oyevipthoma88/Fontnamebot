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
  {
    // VIRAL — FontsXWorld channel level heavy style (apna glyph engine)
    id: "viral",
    frames: ["👑", "🔥", "💎", "⚡"],
    pairs: [["─", "─"], ["༺", "༻"]],
    sep: ["↝", "⏤⃝", "･", "×"],
    fonts: [],
    viral: true,
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

// ───────────────────────────────────────────────
// VIRAL ENGINE — "channel level" heavy decorated names
// Style reference: top name-font channels (👑 frames, letter-spaced
// greek/kayah/ethiopic lookalikes, halki combining-mark chhite, royal tails).
// ───────────────────────────────────────────────

// Per-letter rare lookalike glyphs (lowercase letters; capitals base font me rehte hain)
const VIRAL_SET = {
  a: ["𝛂", "𝜶", "𑜼", "ꓛ", "ᧁ"],
  b: ["𝜷", "ᑲ", "𝛃"],
  c: ["𝚌", "ᥴ", "૬", "𝑐"],
  d: ["ᕲ", "𝚍", "ծ", "∂"],
  e: ["𝛆", "𝜺", "ꫀ", "є"],
  f: ["⨍", "𝑓", "ʄ", "ƒ"],
  g: ["𝑔", "ɢ", "ᶃ", "ց"],
  h: ["ꪱ", "𝚑", "հ", "𑜼"],
  i: ["༏", "𝜾", "ᛧ", "¡", "ı"],
  j: ["𝙹", "ʝ", "𝑗"],
  k: ["𝛋", "ҡ", "ƙ", "ᴋ"],
  l: ["𒁹", "𝚕", "ℓ", "ʆ"],
  m: ["𝛍", "ⲙ", "ო", "ᴍ"],
  n: ["𝜼", "𝛈", "န", "ท"],
  o: ["𝛐", "𝚘", "ꭷ", "໐"],
  p: ["ꓕ", "𐓙", "ρ", "ᴘ"],
  q: ["𝑞", "զ", "ǫ"],
  r: ["ɤ", "᱂", "𝚛", "ⲅ"],
  s: ["န", "𝜎", "ร", "ꇙ"],
  t: ["τ", "𝜏", "𐑄", "ᴛ"],
  u: ["𝛖", "υ", "ຟ", "ᴜ"],
  v: ["𝜈", "ѵ", "ν", "ᴠ"],
  w: ["𝛚", "ω", "ꝃ", "ᴡ"],
  x: ["𝑥", "Ӽ", "᥊"],
  y: ["𝛄", "ყ", "𐌦", "ʏ"],
  z: ["𝑧", "չ", "ᴢ"],
};

// Halki combining marks (zitna channel use karta hai — render friendly)
const VIRAL_MARKS = ["̓", "፟", "͛", "̙", "̴", "̥", "̎"];
// Capital letters ke liye base fonts
const VIRAL_BASES = ["Sans Bold Italic", "Bold Italic Serif", "Bold Serif", "Sans Bold"];

const VIRAL_HEADS = [
  "👑 ─  ",
  "👑 ─   ",
  "👑 ⎯࡙⎯ໍ  ",
  "👑 𓂃ᷧ ᷟ  ",
  "👑 ‿⃪ᷝ ⷨ  ",
  "👑 ✇‿⃪ᷝ ⷨ ",
  "👑 ⠀ ─  ᱝ  ",
  "💎 ᯓ꯭𓆰꯭𝅅༎꯭ ꯭ ",
  "🕯 𝁛゙",
  "🧿 𝄄༐𝄄 ⋆─┼༢། ",
  "° 𝂊𝃳Ⲙ᧘ᘫ ꧊",
  "𓂃ᷧ ᷟ  ",
];
const VIRAL_TAILS = [
  " ↝ 🚩 👑",
  " 🚩 👑",
  " ⏤⃝ ⚡ 👑",
  " ⏤⃝ 🔥 👑",
  " ᡣ𐭩𝆆𝁛゙࡙ 👑",
  " ࿐ 👑",
  " ꯭𝆺꯭𝅥༎꯭ࠫ𓍢ִ໋»꯭⟶꯭⋆꯭ 🌾 💎",
  " •.𝇄𝁜๎ 🏨 𝀍𝀤 °",
  " ･<\\> 👑",
  " </𝟑 ｡ 👑",
  " 𒁹 👑",
  " ࿐࿔ 👑",
];
const VIRAL_FRAMES = ["👑", "💎", "🔥", "🚩", "⚡", "🖤"];

// Ek word ko viral glyphs me badlo — token-wise (combining mark kabhi alag nahi hota)
function viralWordTokens(word, r, baseMap) {
  return cp(word).map((ch, i) => {
    let g;
    if (i === 0 && /[A-Za-z]/.test(ch)) {
      g = baseMap[ch.toUpperCase()] || ch;
    } else {
      const low = ch.toLowerCase();
      const set = VIRAL_SET[low];
      g = set ? pick(set, r) : baseMap[ch] || baseMap[low] || ch;
    }
    if (r() < 0.16) g += pick(VIRAL_MARKS, r);
    return g;
  });
}

// Poora naam viral style me (spaced ya joined)
function viralName(plain, r) {
  const words = plain.split(" ").filter(Boolean);
  const baseMap = MAPS[pick(VIRAL_BASES, r)];
  const spaced = r() < 0.5;
  const glue = pick([" ↝ ", " ⏤⃝ ", " ･ ", " × ", " "], r);
  const parts = words.map((w) => {
    const tokens = viralWordTokens(w, r, baseMap);
    return spaced ? tokens.join(" ") : tokens.join("");
  });
  return parts.join(glue);
}

const VIRAL_LAYOUTS = [
  (n, r) => `${pick(VIRAL_HEADS, r)}${n}${pick(VIRAL_TAILS, r)}`,
  (n, r) => `${pick(VIRAL_HEADS, r)}${n}${pick(VIRAL_TAILS, r)}`,
  (n, r) => `${pick(VIRAL_HEADS, r)}${n}${pick(VIRAL_TAILS, r)}`,
  (n, r) => `👑 ${n}${pick(VIRAL_TAILS, r)}`,
  (n, r) => `${pick(VIRAL_FRAMES, r)} ${n} ${pick(VIRAL_FRAMES, r)}`,
  (n, r) => `꧁ ${n} ꧂${pick(VIRAL_TAILS, r)}`,
];

// N viral names — deterministic per naam, de-duped
function viralNames(rawName, count = 8) {
  const plain = titleCase(cleanName(rawName)) || "Name";
  const r = rng(seedOf(plain.toLowerCase()) ^ 0x1f123bb5);
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < count && guard++ < count * 30) {
    const n = viralName(plain, r);
    const block = pick(VIRAL_LAYOUTS, r)(n, r).trim();
    if (!block || seen.has(block)) continue;
    seen.add(block);
    out.push(block);
  }
  return out;
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
    // Viral theme apna glyph engine use karti hai (channel-level heavy style)
    if (theme.viral) {
      for (const block of viralNames(plain, 12)) {
        if (seen.has(block)) continue;
        seen.add(block);
        candidates.push({ block, theme: theme.id, font: "Viral Mix", s: 128 + r() * 8 });
      }
      continue;
    }
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

module.exports = { premiumNames, themedNames, themeIds, cleanName, titleCase, score, usableFonts, viralNames };
