const {Markup} = require("telegraf");
const User = require("../models/user");

module.exports = async ctx => {
  console.log("here");
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });
  if (!ctx.update.callback_query) {
    await ctx.reply(
      `${
        existUser.language == "RU" ? "Выберите валюты" : "Choose currencies"
      }:`,
      {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [...existUser.currencies.map(el => Markup.callbackButton(el, el))],
            [Markup.callbackButton(`go back`, `$end$`)]
          ]
        })
      }
    );
  } else {
    await User.findOneAndUpdate(
      {
        chatId: ctx.update.callback_query.message.chat.id
      },
      {
        $set: {
          currencies: existUser.currencies.map(el =>
            el == ctx.update.callback_query.data &&
            ctx.update.callback_query.data[0] != `✓`
              ? `✓${el}`
              : el == ctx.update.callback_query.data
              ? el
                  .split("")
                  .slice(1)
                  .join("")
              : el
          )
        }
      }
    );
    existUser = await User.findOne({
      chatId: ctx.update.callback_query.message.chat.id
    });
    await ctx.editMessageText(
      "Choose currencies:",
      ctx.update.callback_query.message.message_id
    );
    await ctx.editMessageReplyMarkup(
      JSON.stringify({
        inline_keyboard: [
          [...existUser.currencies.map(el => Markup.callbackButton(el, el))],
          [Markup.callbackButton(`next`, `$end$`)]
        ]
      }),
      ctx.update.callback_query.message.message_id
    );
  }
};
