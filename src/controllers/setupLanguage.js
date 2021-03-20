const {Markup} = require("telegraf");
const User = require("../models/user");

module.exports = async ctx => {
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });
  if (ctx.update.message) {
    if (existUser.settingsPos == "language")
      await ctx.reply(`Выберите язык/Choose language`, {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            ...[
              (existUser.language == "RU"
                ? ["✓RU", "EN"]
                : ["RU", "✓EN"]
              ).map(el => Markup.callbackButton(`${el}`, `${el}-language`))
            ]
          ]
        })
      });
  } else {
    let choosedLang = ctx.update.callback_query.data.split("-")[0];
    try {
      if(choosedLang == "RU" || choosedLang == "EN" || choosedLang == "✓RU" || choosedLang == "✓EN")
      await ctx.editMessageReplyMarkup(
        JSON.stringify({
          inline_keyboard: [
            ...[
              ((choosedLang == "RU" || choosedLang == "✓RU") 
                ? ["✓RU", "EN"]
                : ["RU", "✓EN"]
              ).map(el => Markup.callbackButton(`${el}`, `${el}-language`))
            ]
          ]
        }),
        ctx.update.callback_query.message.message_id
      );
    } catch (e) {
    } finally {
    }
    await User.findOneAndUpdate(
      {
        chatId: ctx.update.message
          ? ctx.update.message.chat.id
          : ctx.update.callback_query.message.chat.id
      },
      {
        $set: {
          settingsPos: "city",
          language: (choosedLang == "RU" ||  choosedLang == "✓RU") ? "RU" : "EN"
        }
      }
    );
  }
};
