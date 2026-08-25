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

// Decorated "aesthetic name" templates like fancy Telegram bios
const DECOR = [
  (n) => `\u{1F9FF}\n\u{1D104}\u0590\u{1D104} \u22c6\u2500\u253c \u{1F338}\u203a\u203a "\u{1FA88}\u{1F99A}\u2728\u{1F48C}\n\u{1F451}\n\u2500   ${n} \u21dd \u{1F6A9}\n\u{1F451}`,
  (n) => `\u{1F48E}\n\u1BF0\uFAE0 \u{1D145}\u0590 \u{1D3A2}\u1D6A\u27f6\u22c6\u{1F33E}\n${n}\n\u{1F48E}`,
  (n) => `\u{1F56F}\n\u{1D05B}\u3099 ${n} \u{1FAC0}\u{1F082}\n\u{1F56F}`,
  (n) => `\u{1F451}\n  \u23ef\u2060\u2060   ${n}  \uA1A3\u{1D586}\u{1D05B}\n\u{1F451}`,
  (n) => `\u2727\u2500\u2500\u25c8\u2500\u2500\u2727\n\u2727 ${n} \u2727\n\u2727\u2500\u2500\u25c8\u2500\u2500\u2727`,
  (n) => `\u2570\u2500\u2500\u2500 \u2740 ${n} \u2740 \u2500\u2500\u2500\u256d`,
  (n) => `\u1D31\u02b3\u1d49\u1d43\u1d50 \u25c6 ${n} \u25c6 \u1D33\u1d52\u1d48`,
  (n) => `\u{1F31F}\u0361\u0361 ${n} \u0361\u0361\u{1F31F}`,
  (n) => `\u2500\u2504\u2508 ${n} \u2508\u2504\u2500`,
  (n) => `\u2591\u2592\u2593 ${n} \u2593\u2592\u2591`,
  (n) => `\u{1F338} \u2765 ${n} \u2765 \u{1F338}`,
  (n) => `\u26a1 \u01c0\u01c0 ${n} \u01c0\u01c0 \u26a1`,
];

function decoratedNames(text, tagLine = "") {
  const base = [
    applyMap(MAPS["Bold Italic Serif"], text),
    applyMap(MAPS["Script"], text),
    applyMap(MAPS["Fraktur"], text),
    applyMap(MAPS["Greek Mix"], text),
    applyMap(MAPS["Small Caps"], text),
    applyMap(MAPS["Sans Bold Italic"], text),
  ];
  const out = [];
  DECOR.forEach((fn, i) => {
    const name = base[i % base.length];
    out.push(fn(name) + (tagLine ? `\n${tagLine}` : ""));
  });
  return out;
}

module.exports = { styleList, decoratedNames, applyMap, MAPS };
