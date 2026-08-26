# 👑 Fancy Font Name Bot

Telegram bot jo kisi bhi naam ko **65+ stylish fonts** aur **decorated fancy names** me bana deta hai — har naam 12-15 styles me, **ek-ek message me**, sirf naam + apna watermark (`#naam@FontsxWorld`).

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/oyevipthoma88/Fontnamebot)

## Features
- **65+ font styles**: bold, italic, script, fraktur, double-struck, monospace, circled, squared, fullwidth, small caps, superscript/subscript, greek/cyrillic/tribal/runic/asian/thai mix, currency, flag letters, strike, underline, overline, wavy, heartify, starify + combos
- **Direct delivery**: naam bhejo → 12-15 decorated names **ek-ek alag message** me, sirf naam + `#naam@FontsxWorld` watermark. Data me naam na mile to engine khud bana deta hai.
- **👑 Owner button** — sabke liye owner info; owner ko **Owner Panel**:
  - 📊 **Bot Stats** — total users, requests, font styles, collected names, ornaments, scanned channels, uptime
  - 📡 **Scan Name Channel** — chat id / @username bhejo (ek sath multiple, space/comma se), us channel ke saare name fonts scan ho ke add ho jayenge. **Duplicate names aur pehle scanned channels auto-skip.** Kisi channel ka naam/@username/link/watermark store nahi hota — sirf name styles aur ornaments.
  - ♻️ **Force Rescan** — scanned channel ko dobara scan (`!@channel` ya panel button)
- User tracking + request stats (JSON data store)
- Page navigation (Back / Next) for the full font list, tap-and-hold copy friendly

## Commands
| Command | Kaam |
| --- | --- |
| `/start` | Bot start + buttons |
| `/fancy Kabir` | 12-15 decorated names, ek-ek msg me |
| `/fonts Kabir Singh` | 65+ font styles (pagination) |
| `/tutorial` | Use karne ka tarika |
| `/help` | Madad |
| `/owner` `/stats` `/scan` | Owner only |

Ya seedha naam type karke bhej do — bot turant bana dega.

## Env vars
| Var | Required | Kya hai |
| --- | --- | --- |
| `BOT_TOKEN` | ✅ | @BotFather se |
| `OWNER_ID` | ✅ (panel ke liye) | Apni numeric Telegram id — [@userinfobot](https://t.me/userinfobot) se lo |
| `OWNER_USERNAME` | optional | Owner button me contact dikhane ke liye (bina @) |
| `CHANNEL_USERNAME` | optional | watermark + channel button (default `FontsxWorld`) |
| `TUTORIAL_URL` | optional | |
| `API_ID` / `API_HASH` | scanner ke liye | https://my.telegram.org → API Development Tools |
| `SESSION_STRING` | scanner ke liye | `npm run gen-session` se banao (neeche dekho) |
| `DATA_DIR` | optional | data store ka folder (default `./data`) |

## Scanner setup (Scan Name Channel feature)
Bot API se channel history nahi padhi ja sakti, isliye scanner ek **user account session** (GramJS/MTProto) use karta hai:

```bash
npm install
npm run gen-session   # phone + code se login, SESSION_STRING milega
```

Phir env set karo:
```bash
heroku config:set API_ID=12345 API_HASH=abcdef SESSION_STRING=1ApW... OWNER_ID=123456789
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
