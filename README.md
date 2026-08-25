# 👑 Fancy Font Name Bot

Telegram bot jo kisi bhi naam ko **50+ stylish fonts** aur **decorated fancy names** me bana deta hai.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/oyevipthoma88/Fontnamebot)

## Features
- 47+ font styles: bold, italic, script, fraktur, double-struck, monospace, circled, squared, fullwidth, small caps, superscript, greek/cyrillic/tribal/runic mix, strike, underline, wavy, heartify, starify + combos
- 👑 Decorated fancy name templates (symbols wale premium names)
- Inline buttons: Tutorial, All Fonts Demo, Fancy Names, Channel, Help
- Page navigation (Back / Next) for the full font list
- Tap-and-hold copy friendly (`code` formatting)

## Commands
| Command | Kaam |
| --- | --- |
| `/start` | Bot start + buttons |
| `/fonts Kabir Singh` | Saare font styles |
| `/fancy Kabir` | Decorated fancy names |
| `/tutorial` | Use karne ka tarika |
| `/help` | Madad |

Ya seedha naam type karke bhej do — bot turant bana dega.

## Local run
```bash
git clone https://github.com/oyevipthoma88/Fontnamebot
cd Fontnamebot
npm install
cp .env.example .env   # BOT_TOKEN daalo
BOT_TOKEN=xxx node bot.js
```

## Heroku deploy (manual)
```bash
heroku create my-font-bot
heroku config:set BOT_TOKEN=xxxx CHANNEL_USERNAME=FontsxWorld
git push heroku main
heroku ps:scale worker=1
```
> Bot polling mode me chalta hai, isliye `worker` dyno use hota hai (web nahi).

## Env vars
- `BOT_TOKEN` (required) — @BotFather se
- `CHANNEL_USERNAME` (optional) — hashtag/channel button ke liye
- `TUTORIAL_URL` (optional)

MIT License
