const {Telegraf, Telegram} = require("telegraf");
require("dotenv").config();
module.exports = {
  bot: new Telegraf(process.env.token),
  telegram: new Telegram(process.env.token)
};
