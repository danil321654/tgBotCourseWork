const axios = require("axios");
const User = require("../models/user");

module.exports = async ctx => {
  try {
    let existUser = await User.findOne({
      chatId: ctx.update.message
        ? ctx.update.message.chat.id
        : ctx.update.callback_query.message.chat.id
    });
    let res = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=${existUser.country}&apiKey=${process.env.newsApi}`
    );
    let resReserve = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=${existUser.language=="EN" ? "US" : existUser.language}&apiKey=${process.env.newsApi}`
    );
    res = (res.data.articles.length > 0 ? res.data.articles : resReserve.data.articles)
      .map(a => ({ sort: Math.random(), value: a }))
      .sort((a, b) => a.sort - b.sort)
      .map(a => a.value)
      .slice(3, 6);

    console.log(res);
    await Promise.all(
      res.map(async el => {
        await ctx.reply(
          `${el.title}\n${
          existUser.language == "RU" ? "Больше информации" : "More info"
          }: ${el.url}`
        );
        return el;
      })
    );
  } catch (e) { }
};
