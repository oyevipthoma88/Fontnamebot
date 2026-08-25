// Fancy font engine — 60+ styles + decorated name templates
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";

const cp = (s) => Array.from(s);

// Build a style from contiguous unicode start codepoints, with per-letter exceptions
function fromStart(startUpper, startLower, startDigit, exceptions = {}) {
  const map = {};
  cp(UPPER).forEach((c, i) => {
    if (startUpper != null) map[c] = String.fromCodePoint(startUpper + i);
  });
  cp(LOWER).forEach((c, i) => {
    if (startLower != null) map[c] = String.fromCodePoint(startLower + i);
  });
  cp(DIGITS).forEach((c, i) => {
    if (startDigit != null) map[c] = String.fromCodePoint(startDigit + i);
  });
  return Object.assign(map, exceptions);
}

// Build a style from explicit glyph lists
function fromLists(upper, lower, digits) {
  const map = {};
  if (upper) cp(upper).forEach((g, i) => (map[UPPER[i]] = g));
  if (lower) cp(lower).forEach((g, i) => (map[LOWER[i]] = g));
  if (digits) cp(digits).forEach((g, i) => (map[DIGITS[i]] = g));
  return map;
}

const MAPS = {
  "Bold Serif": fromStart(0x1d400, 0x1d41a, 0x1d7ce),
  "Italic Serif": fromStart(0x1d434, 0x1d44e, null, { h: "\u210e" }),
  "Bold Italic Serif": fromStart(0x1d468, 0x1d482, null),
  "Script": fromStart(0x1d49c, 0x1d4b6, null, {
    B: "\u212C", E: "\u2130", F: "\u2131", H: "\u210B", I: "\u2110",
    L: "\u2112", M: "\u2133", R: "\u211B", e: "\u212F", g: "\u210A", o: "\u2134",
  }),
  "Bold Script": fromStart(0x1d4d0, 0x1d4ea, null),
  "Fraktur": fromStart(0x1d504, 0x1d51e, null, {
    C: "\u212D", H: "\u210C", I: "\u2111", R: "\u211C", Z: "\u2128",
  }),
  "Bold Fraktur": fromStart(0x1d56c, 0x1d586, null),
  "Double Struck": fromStart(0x1d538, 0x1d552, 0x1d7d8, {
    C: "\u2102", H: "\u210D", N: "\u2115", P: "\u2119", Q: "\u211A", R: "\u211D", Z: "\u2124",
  }),
  "Sans": fromStart(0x1d5a0, 0x1d5ba, 0x1d7e2),
  "Sans Bold": fromStart(0x1d5d4, 0x1d5ee, 0x1d7ec),
  "Sans Italic": fromStart(0x1d608, 0x1d622, null),
  "Sans Bold Italic": fromStart(0x1d63c, 0x1d656, null),
  "Monospace": fromStart(0x1d670, 0x1d68a, 0x1d7f6),
  "Circled": fromStart(0x24b6, 0x24d0, null, { 0: "\u24EA" }),
  "Circled Dark": fromStart(0x1f150, 0x1f150, null),
  "Squared": fromStart(0x1f130, 0x1f130, null),
  "Squared Dark": fromStart(0x1f170, 0x1f170, null),
  "Fullwidth": fromStart(0xff21, 0xff41, 0xff10),
  "Small Caps": fromLists(
    UPPER,
    "\u1d00\u0299\u1d04\u1d05\u1d07\u0493\u0262\u029c\u026a\u1d0a\u1d0b\u029f\u1d0d\u0274\u1d0f\u1d18\u01eb\u0280\u0455\u1d1b\u1d1c\u1d20\u1d21\u02e3\u028f\u1d22"
  ),
  "Superscript": fromLists(
    "\u1d2c\u1d2e\u1d9c\u1d30\u1d31\u1da0\u1d33\u1d34\u1d35\u1d36\u1d37\u1d38\u1d39\u1d3a\u1d3c\u1d3e\u146b\u1d3f\u02e2\u1d40\u1d41\u2c7d\u1d42\u02e3\u02b8\u1dbb",
    "\u1d43\u1d47\u1d9c\u1d48\u1d49\u1da0\u1d4d\u02b0\u2071\u02b2\u1d4f\u02e1\u1d50\u207f\u1d52\u1d56\u146b\u02b3\u02e2\u1d57\u1d58\u1d5b\u02b7\u02e3\u02b8\u1dbb",
    "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079"
  ),
  "Subscript": fromLists(
    null,
    "\u2090\u0299\u1d9c\u1d48\u2091\u1da0\u1d67\u2095\u1d62\u2c7c\u2096\u2097\u2098\u2099\u2092\u209a\u146b\u1d63\u209b\u209c\u1d64\u1d65\u1d21\u2093\u02b8\u1dbb",
    "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089"
  ),
  "Greek Mix": fromLists(
    "\u0391\u0392\u010a\u010e\u0395\u0191\u0262\u0397\u0399\u0134\u039a\u039b\u039c\u039d\u039f\u03a1\u01a2\u0154\u0405\u03a4\u0244\u01b2\u0428\u03a7\u03a8\u0396",
    "\u03b1\u03b2\u03c2\u03b4\u03b5\u03c6\u03b3\u03b7\u03b9\u03c3\u03ba\u03bb\u03bc\u03b7\u03bf\u03c1\u03d5\u0433\u0455\u03c4\u03c5\u03bd\u03c9\u03c7\u03c8\u03b6"
  ),
  "Cyrillic Mix": fromLists(
    "\u0414\u0411\u0480\u0110\u0404\u0492\u0413\u041d\u0406\u0408\u041a\u041b\u041c\u0418\u0424\u0420\u0470\u042f\u0405\u0413\u0426\u0474\u0429\u0416\u04ae\u0417",
    "\u0430\u0432\u0441\u0501\u0454\u0192\u0411\u043d\u0456\u0458\u043a\u04c5\u043c\u0438\u043e\u0440\u0563\u0453\u0455\u0442\u04af\u1d20\u0448\u04b1\u0443\u0437"
  ),
  "Tribal": fromLists(
    "\u10d0\u10d1\u03f2\u10eb\u10dd\u0492\u10de\u10ee\u10d8\u0408\u10da\u10df\u10db\u10dc\u10dd\u10e6\u10e7\u10e0\u10e1\u10e2\u10e3\u10d5\u10ea\u10ed\u10e8\u10d6",
    "\u10d0\u10d1\u03f2\u10eb\u10dd\u0492\u10de\u10ee\u10d8\u0458\u10da\u10df\u10db\u10dc\u10dd\u10e6\u10e7\u10e0\u10e1\u10e2\u10e3\u10d5\u10ea\u10ed\u10e8\u10d6"
  ),
  "Runic": fromLists(
    "\u16a8\u16d2\u16b3\u16de\u16d6\u16a0\u16b7\u16bb\u16c1\u16c1\u16b2\u16da\u16d7\u16be\u16df\u16c8\u16b3\u16b1\u16cb\u16cf\u16a2\u16a1\u16b9\u16c9\u16a3\u16c9",
    "\u16a8\u16d2\u16b3\u16de\u16d6\u16a0\u16b7\u16bb\u16c1\u16c1\u16b2\u16da\u16d7\u16be\u16df\u16c8\u16b3\u16b1\u16cb\u16cf\u16a2\u16a1\u16b9\u16c9\u16a3\u16c9"
  ),
  "Inverted": fromLists(
    "\u2200\u10da\u0186\u15E1\u018E\u2132\u2141\u0048\u0049\u017F\u029E\u2142\u0057\u1D0E\u004F\u0500\u1F49\u1D1A\u0053\u22A5\u2229\u039B\u039B\u2717\u2144\u005A",
    "\u0250\u0071\u0254\u0070\u01dd\u025f\u0253\u0265\u1d09\u0567\u029e\u05df\u026f\u0075\u006f\u0064\u0062\u0279\u0073\u0287\u2229\u028c\u028d\u0078\u028e\u007a"
  ),
};

// Wrapping / decorating styles (applied to plain text)
const WRAPPERS = [
  ["Strike", (t) => cp(t).map((c) => c + "\u0336").join("")],
  ["Underline", (t) => cp(t).map((c) => c + "\u0332").join("")],
  ["Slash", (t) => cp(t).map((c) => c + "\u0338").join("")],
  ["Cross Above", (t) => cp(t).map((c) => c + "\u033D").join("")],
  ["Dotted", (t) => cp(t).map((c) => c + "\u0323").join("")],
  ["Wavy", (t) => cp(t).map((c) => c + "\u0330").join("")],
  ["Heartify", (t) => cp(t).join("\u2665")],
  ["Starify", (t) => cp(t).join("\u2727")],
  ["Arrowify", (t) => cp(t).join("\u1d33")],
  ["Spaced", (t) => cp(t).join(" ")],
  ["Dotify", (t) => cp(t).join("\u00b7")],
];

function applyMap(map, text) {
  return cp(text)
    .map((ch) => map[ch] || map[ch.toLowerCase()] || map[ch.toUpperCase()] || ch)
    .join("");
}

// 60+ style variants
function styleList(text) {
  const out = [];
  for (const [name, map] of Object.entries(MAPS)) out.push([name, applyMap(map, text)]);
  for (const [name, fn] of WRAPPERS) out.push([name, fn(text)]);
  // combos: mapped + decoration
  const combos = [
    ["Bold Serif", "Strike"],
    ["Script", "Underline"],
    ["Fraktur", "Dotted"],
    ["Double Struck", "Spaced"],
    ["Sans Bold Italic", "Heartify"],
    ["Small Caps", "Starify"],
    ["Greek Mix", "Wavy"],
    ["Monospace", "Dotify"],
    ["Cyrillic Mix", "Underline"],
    ["Tribal", "Spaced"],
  ];
  for (const [m, w] of combos) {
    const wrap = WRAPPERS.find((x) => x[0] === w)[1];
    out.push([`${m} + ${w}`, wrap(applyMap(MAPS[m], text))]);
  }
  return out;
}

// ───────────────────────────────────────────────
// AESTHETIC NAME ENGINE (strong logic)
// ───────────────────────────────────────────────

// Seeded RNG so ek naam ke liye result stable rahe, par har naam different ho
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

// Letter-level "greek/fancy mix" like  𝙆𝜶𝜷𝜾𝙧 ,  𝚬𝜼𝚌𝜶𝜼𝛐𝜾
const MIX_SETS = [
  { a: "\u{1D736}", b: "\u{1D737}", c: "\u{1D68C}", e: "\u{1D6C6}", i: "\u{1D73E}", k: "\u{1D74B}", n: "\u{1D73C}", o: "\u{1D740}", u: "\u{1D74E}", v: "\u{1D75B}", s: "\u{1D5CC}", r: "\u{1D731}", t: "\u{1D749}", m: "\u{1D726}", g: "\u{1D6FE}", l: "\u{1D746}", h: "\u{1D745}", d: "\u{1D6C5}", p: "\u{1D746}" },
  { a: "\u03b1", b: "\u03b2", c: "\u03c2", e: "\u03b5", i: "\u03b9", k: "\u03ba", n: "\u03b7", o: "\u03bf", u: "\u03c5", v: "\u03bd", s: "\u0455", r: "\u0491", t: "\u03c4", m: "\u043c", g: "\u0263", l: "\u029f", h: "\u04bb", d: "\u0501", p: "\u03c1" },
  { a: "\u0430", b: "\u0432", c: "\u0441", e: "\u0454", i: "\u0456", k: "\u043a", n: "\u0438", o: "\u043e", u: "\u04af", v: "\u1d20", s: "\u0455", r: "\u0433", t: "\u0442", m: "\u043c", g: "\u0433", l: "\u04c5", h: "\u043d", d: "\u0434", p: "\u0440" },
];

// Base fonts used for the untouched letters
const BASE_FONTS = ["Sans Bold Italic", "Bold Italic Serif", "Bold Fraktur", "Bold Script", "Sans Bold", "Monospace"];

// Zero-width / combining decorations sprinkled inside letters
const MARKS = ["\u0353", "\u0359", "\u0325", "\u0348", "\u034D", "\u0362", "\u0334", "\u0350", "\u0357", "\u035B"];

// Ornament clusters (aesthetic Telegram style)
const PRE = [
  "\u{1D104}\u0590\u{1D104} \u22c6\u2500\u253c",
  "\u1BF0\uFAE0 \u{1D145}\u0590",
  "\u{1D05B}\u3099",
  "\u23ef\u2060\u2060",
  "\u2727\u2500\u25c8",
  "\u2570\u2500\u2500 \u2740",
  "\u2500\u2504\u2508",
  "\u16E7\u0DF4",
  "\u10DA\u0F3C",
  "\u0A73\u0A02",
];
const POST = [
  "\u21dd \u{1F6A9}",
  "\u27f6\u22c6\u{1F33E}",
  "\uA1A3\u{1D586}",
  "\u2740 \u2500\u2500\u256d",
  "\u25c8\u2500\u2727",
  "\u2508\u2504\u2500",
  "\u01c0\u01c0 \u26a1",
  "\u0F3D\u16E7",
  "\u2765 \u{1F338}",
  "\u{1F082}\u{1FAC0}",
];
const SEP = ["\u21dd", "\u2500\u253c", "\u2740", "\u0f3c\u0f3d", "\u2027", "\u01c0", "\u22c6", "\u2508"];
const FRAMES = ["\u{1F9FF}", "\u{1F451}", "\u{1F48E}", "\u{1F56F}", "\u{1F6A9}", "\u{1F338}", "\u{1F99A}", "\u2728", "\u{1F48C}", "\u{1FA88}", "\u{1F31F}", "\u26a1"];
const FILLERS = ["\u2500\u2500", "\u2504\u2504", "\u00b7\u00b7", "\u2508\u2508", "\u2027\u2027"];

// Mix letters: base font + lookalike swaps + optional marks
function mixName(text, r, opts = {}) {
  const set = opts.set || pick(MIX_SETS, r);
  const base = MAPS[opts.base || pick(BASE_FONTS, r)];
  const density = opts.marks == null ? r() * 0.35 : opts.marks;
  return cp(text)
    .map((ch) => {
      const low = ch.toLowerCase();
      let out;
      if (ch === " ") return " ";
      // lowercase letters -> greek/cyrillic lookalike, capitals stay in the base font
      if (ch === low && set[low]) out = set[low];
      else out = base[ch] || base[low] || ch;
      if (r() < density) out += pick(MARKS, r);
      return out;
    })
    .join("");
}

// Letter-spaced variant:  𝐕 ༏ န 𝛂 𒁹 𝛂
function spacedName(text, r) {
  const styled = mixName(text, r, { marks: 0 });
  const glue = pick([" \u0F0F ", " \u{1204A} ", " \u2027 ", " \u00b7 ", "  "], r);
  return cp(styled).join(glue);
}

const LAYOUTS = [
  // frame / ornament + name + ornament / frame / hashtag
  (n, r) => `${pick(FRAMES, r)}\n\n${pick(PRE, r)} ${n} ${pick(POST, r)}\n\n${pick(FRAMES, r)}`,
  (n, r) => {
    const f = pick(FRAMES, r);
    return `${f}\n\n${pick(FILLERS, r)}\u00a0 ${n} \u00a0${pick(FILLERS, r)}\n\n${f}`;
  },
  (n, r) => `${pick(FRAMES, r)}${pick(FRAMES, r)}\n\n\u2500 \u00a0 ${n} ${pick(SEP, r)} ${pick(POST, r)}\n\n${pick(FRAMES, r)}${pick(FRAMES, r)}`,
  (n, r) => `${pick(PRE, r)}\n${n}\n${pick(POST, r)}`,
  (n, r) => `\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256d\n\u2502 ${n} \u2502\n\u256d\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2570`,
  (n, r) => `${pick(FRAMES, r)} \u00ab ${n} \u00bb ${pick(FRAMES, r)}`,
];

function hashTag(text, channel) {
  const slug = text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return channel ? `#${slug}@${channel}` : `#${slug}`;
}

// MAIN: N decorated aesthetic names, deterministic per name, no duplicates
function decoratedNames(text, tagLine = "", count = 12) {
  const r = rng(seedOf(text) ^ 0x9e3779b9);
  const seen = new Set();
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 30) {
    const mode = out.length % 3;
    let name;
    if (mode === 0) name = mixName(text, r);
    else if (mode === 1) name = spacedName(text, r);
    else {
      const parts = text.trim().split(/\s+/);
      name = parts.map((p) => mixName(p, r, { marks: 0.15 })).join(` ${pick(SEP, r)} `);
    }
    const block = LAYOUTS[out.length % LAYOUTS.length](name, r) + (tagLine ? `\n\n${tagLine}` : "");
    if (seen.has(block)) continue;
    seen.add(block);
    out.push(block);
  }
  return out;
}

module.exports = { styleList, decoratedNames, applyMap, MAPS, mixName, spacedName, hashTag };
