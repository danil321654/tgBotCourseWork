const {Markup} = require("telegraf");
const User = require("../models/user");

module.exports = async ctx => {
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });
  await ctx.reply(  `${
      existUser.language == "RU" ? "Выберите время информирования" : "Choose time to get info"
    }:`, {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        ...[
          [8,12,16,22].map(el =>
            Markup.callbackButton(
              `${el}:00`,
              `${el} hours`
            )
          )
        ],
        [Markup.callbackButton(`none`, `-1`)]
      ]
    })
  });
};
