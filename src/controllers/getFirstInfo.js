const User = require("../models/user");

module.exports = async ctx => {
  let existUser = await User.findOne({
    chatId: ctx.update.message.chat.id
  });
  console.log(ctx.update.message.chat);
  if (!existUser) {
    existUser = new User({
      chatId: ctx.update.message.chat.id,
      username: ctx.update.message.chat.first_name,
      settingsPos: "language",
      city: " ",
      country: " "
    });
    await existUser.save();
  }
};
