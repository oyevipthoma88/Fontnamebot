# 👑 Fancy Font Name Bot

Telegram bot jo kisi bhi naam ko **65+ stylish fonts** aur **decorated fancy names** me bana deta hai — har naam 12-15 styles me, **ek-ek message me**, sirf naam + apna watermark (`#naam@FontsxWorld`).

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/oyevipthoma88/Fontnamebot)

## Features
- **65+ font styles**: bold, italic, script, fraktur, double-struck, monospace, circled, squared, fullwidth, small caps, superscript/subscript, greek/cyrillic/tribal/runic/asian/thai mix, currency, flag letters, strike, underline, overline, wavy, heartify, starify + combos
- **Direct delivery**: naam bhejo → 12-15 decorated names **ek-ek alag message** me, sirf naam + `#naam@FontsxWorld` watermark. Data me naam na mile to engine khud bana deta hai.
- **Viral engine (channel-level)** — top name-font channels jaisi heavy decorated styles: 👑 crown frames, letter-spaced rare glyphs (𝛂 𑜼 ꪱ ༏ 𒁹…), royal tails (↝ 🚩, ⏤⃝ ⚡, ᡣ𐭩𝆆…) aur halki combining-mark chhite. Har naam ke top results me viral styles sabse upar aate hain, aur **👑 Viral** theme button se sirf viral names milte hain.
- **Premium name engine (v3)** — `namegen.js`: font coverage check (adhoore/box fonts reject), theme-matched ornament pairs (royal / aesthetic / dark / cute / gamer / spiritual / minimal / viral), quality scoring (length, ornament ratio, symmetry, no zalgo) aur variety filter — sirf **top-ranked** names bhejta hai. Theme buttons se ek hi style ke aur names milte hain.
- **Personalized** — koi hardcoded example naam nahi: welcome, tutorial, demo aur `/fonts` `/fancy` usage sab me **user ka apna Telegram naam** use hota hai.
- **👑 Owner button aur ⚙️ Owner Panel alag-alag** — `👑 Owner` dabane par owner ki **profile seedha khulti hai** (`OWNER_USERNAME` ya numeric id se). `⚙️ Owner Panel` sirf owner ko dikhta hai:
  - 📊 **Bot Stats** — total users, requests, font styles, collected names, ornaments, scanned channels, uptime
  - 📡 **Scan Name Channel** — chat id / @username bhejo (ek sath multiple, space/comma se), us channel ke saare name fonts scan ho ke add ho jayenge. **Duplicate names aur pehle scanned channels auto-skip.** Kisi channel ka naam/@username/link/watermark store nahi hota — sirf name styles aur ornaments.
  - ♻️ **Force Rescan** — scanned channel ko dobara scan (`!@channel` ya panel button)
  - 👤 **Accounts** — scam/name channel scan ke liye owner apna Telegram account **number se login** (phone → OTP → 2FA) karke add karta hai. Multiple accounts, active account switch, delete. Session **AES-256-GCM** se encrypt hoke `data/accounts.json` me jati hai aur OTP wala message chat se auto-delete ho jata hai.
    > ⚠️ Ye flow sirf `OWNER_ID` ke liye khulta hai. Sirf **apna** account add karo — dusron ka number/OTP maangna Telegram ToS ke against hai aur account ban karwa deta hai.
- User tracking + request stats (JSON data store)
- Page navigation (Back / Next) for the full font list, tap-and-hold copy friendly

## Commands
| Command | Kaam |
| --- | --- |
| `/start` | Bot start + buttons |
| `/fancy <apna naam>` | 12 decorated names, ek-ek msg me (viral + premium) |
| `/fonts <apna naam>` | 65+ font styles (pagination) |
| `/tutorial` | Use karne ka tarika |
| `/help` | Madad |
| `/owner` | Owner ki profile (sabke liye) |
| `/panel` `/admin` `/stats` `/scan` `/accounts` | Owner only |

Ya seedha naam type karke bhej do — bot turant bana dega.

## Env vars
| Var | Required | Kya hai |
| --- | --- | --- |
| `BOT_TOKEN` | ✅ | @BotFather se |
| `OWNER_ID` | ✅ (panel ke liye) | Apni numeric Telegram id — [@userinfobot](https://t.me/userinfobot) se lo |
| `OWNER_USERNAME` | optional | 👑 Owner button se profile kholne ke liye (bina @) |
| `SESSION_KEY` | optional | Accounts session encryption key (na do to `BOT_TOKEN` use hota hai) |
| `CHANNEL_USERNAME` | optional | watermark + channel button (default `FontsxWorld`) |
| `TUTORIAL_URL` | optional | |
| `API_ID` / `API_HASH` | scanner ke liye | https://my.telegram.org → API Development Tools |
| `SESSION_STRING` | optional | Purana single-account tarika; naya tarika Owner Panel → Accounts |
| `DATA_DIR` | optional | data store ka folder (default `./data`) |

## Scanner setup (Scan Name Channel feature)
Bot API se channel history nahi padhi ja sakti, isliye scanner ek **user account session** (GramJS/MTProto) use karta hai.

**Naya (recommended) tarika — bot ke andar se:**
1. `heroku config:set API_ID=12345 API_HASH=abcdef OWNER_ID=123456789 SESSION_KEY=<koi lamba random string>`
2. Bot me `/panel` → 👤 **Accounts** → ➕ **Add Account**
3. Number bhejo → Telegram ka OTP bhejo → (2FA on ho to password) → account add ✅

**Purana tarika (optional):**
```bash
npm install
npm run gen-session   # phone + code se login, SESSION_STRING milega
```

> ⚠️ `SESSION_STRING` account ka full access deti hai — kisi ko mat do, git me commit mat karo.
> Wo account jis channels ko scan karna hai unka member hona chahiye (public channels ke liye member hona zaroori nahi).

## Local run
```bash
git clone https://github.com/oyevipthoma88/Fontnamebot
cd Fontnamebot
npm install
BOT_TOKEN=xxx OWNER_ID=123456789 node bot.js
```

## Heroku deploy (manual)
```bash
heroku create my-font-bot
heroku config:set BOT_TOKEN=xxxx OWNER_ID=123456789 CHANNEL_USERNAME=FontsxWorld
git push heroku main
heroku ps:scale worker=1
```
> Bot polling mode me chalta hai, isliye `worker` dyno use hota hai (web nahi).
> Heroku ka disk ephemeral hai — dyno restart pe `data/` reset ho sakta hai. Permanent stats chahiye to `DATA_DIR` ko persistent storage pe point karo ya baad me DB lagao.

MIT License
