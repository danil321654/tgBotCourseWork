const {Markup} = require("telegraf");
const User = require("../models/user");

module.exports = async ctx => {
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });
  await ctx.reply(  `${
      existUser.language == "RU" ? "Выберите интервал" : "Choose interval"
    }:`, {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        ...[
          [2,6,12,24].map(el =>
            Markup.callbackButton(
              `${el}`,
              `${el} hours`
            )
          )
        ],
        [Markup.callbackButton(`none`, `-1`)]
      ]
    })
  });
};
