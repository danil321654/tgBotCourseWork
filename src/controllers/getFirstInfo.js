const User = require("../models/user");

module.exports = async ctx => {
  let existUser = await User.findOne({
    chatId: ctx.update.message.chat.id
  });
  if (!existUser) {
    existUser = new User({
      chatId: ctx.update.message.chat.id,
      username: ctx.update.message.chat.username,
      settingsPos: "language",
      city: " ",
      country: " "
    });
    await existUser.save();
  }
};
