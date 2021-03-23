const {Markup} = require("telegraf");
const User = require("../models/user");

module.exports = async (ctx, callback) => {
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });
  await ctx.reply(
    `${existUser.language == "RU" ? "/start - настроить бота\nВыберите действие" : "/start - to setup bot\nChoose action"}:`,
    {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            ...["weather", "currencies", "news"].map(el =>
              Markup.callbackButton(el, `${el}!`)
            )
          ]
        ]
      })
    }
  );
};
