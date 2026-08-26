// Session string generator — channel scanner ke liye ek baar chalao.
// Steps:
//   1) https://my.telegram.org → API Development Tools → app banao → api_id + api_hash lo
//   2) npm install
//   3) node gen-session.js
//   4) Jo SESSION_STRING mile use Heroku config me SESSION_STRING ke roop me set karo
//      (ye string account ka full access deti hai — kisi ko mat dena, kahi commit mat karna)
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

(async () => {
  const apiId = parseInt(await input.text("API_ID (my.telegram.org se): "), 10);
  const apiHash = await input.text("API_HASH: ");
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
  await client.start({
    phoneNumber: async () => await input.text("Phone number (+91... ke sath): "),
    password: async () => await input.text("2FA password (agar on hai, warna enter): "),
    phoneCode: async () => await input.text("Telegram se aaya code: "),
    onError: (err) => console.error(err.message),
  });
  console.log("\n✅ Login ho gaya! Ye SESSION_STRING hai — secretly save karo:\n");
  console.log(client.session.save());
  console.log("\nHeroku:  heroku config:set API_ID=xxx API_HASH=xxx SESSION_STRING=<upar wali string>");
  await client.disconnect();
  process.exit(0);
})();
