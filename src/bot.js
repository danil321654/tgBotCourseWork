require("dotenv").config();
const fs = require("fs");
const {Markup} = require("telegraf");

var cron = require("node-cron");

const {bot, telegram} = require("./telegraf");
const replyWithWeather = require("./controllers/replyWithWeather");
const replyWithCurrency = require("./controllers/replyWithCurrency");
const replyWithNews = require("./controllers/replyWithNews");
const setupCurrency = require("./controllers/setupCurrency");
const setupLanguage = require("./controllers/setupLanguage");
const setupTimer = require("./controllers/setupTimer");
const getFirstInfo = require("./controllers/getFirstInfo");
const chooseCity = require("./controllers/chooseCity");
const runAsker = require("./controllers/runAsker");
const startPos = require("./util/startPos");
const db = require("./config/db");
const User = require("./models/user");
const translate = require("./util/translate");

const delMenu = async ctx => {
  try {
    console.log(ctx.update);
    await telegram.deleteMessage(
      ctx.update.message
        ? ctx.update.message.chat.id
        : ctx.update.callback_query.message.chat.id,
      ctx.update.message
        ? ctx.update.message.message_id
        : ctx.update.callback_query.message.message_id
    );
  } catch {}
};

bot.start(async ctx => {
  await getFirstInfo(ctx);
  await setupLanguage(ctx);
});

/*
await ctx.reply(
  await translate(
    "Hello! In which city do you want to know the weather?",
    "ru"
  )
);
bot.on("message", async ctx => {
  await chooseCity(ctx);
  await setupCurrency(ctx);
});*/

bot.action(/^[A-Za-z _]+$/, async ctx => {
  await chooseCity(ctx, ctx.update.callback_query.data);
  await setupCurrency(ctx);
});

bot.action(/[$€₽¥] [\w]*/, async ctx => {
  await setupCurrency(ctx);
});

bot.action(/[\w]*-language/, async ctx => {
  await setupLanguage(ctx);
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });
  await ctx.reply(
    existUser.language == "RU"
      ? "Прогноз погоды в каком городе вы хотите получать?"
      : "Hello! In which city do you want to know the weather?"
  );
  bot.on("message", async ctx => {
    await chooseCity(ctx);
    //await setupCurrency(ctx);
  });
});

bot.action("-1", async ctx => {
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });
  await ctx.reply(
    existUser.language == "RU"
      ? "Прогноз погоды в каком городе вы хотите получать?"
      : "Hello! In which city do you want to know the weather?"
  );
});

bot.action("$end$", async ctx => {
  delMenu(ctx);
  let existUser = await User.findOneAndUpdate(
    {
      chatId: ctx.update.callback_query.message.chat.id
    },
    {
      $set: {
        settingsPos: "setTimer"
      }
    }
  );
  await setupTimer(ctx);
});

bot.action(/[0-9]* hours/, async ctx => {
  await delMenu(ctx);
  let existUser = await User.findOneAndUpdate(
    {
      chatId: ctx.update.callback_query.message.chat.id
    },
    {
      $set: {
        settingsPos: "working",
        timerHours: ctx.update.callback_query.data.split(" ")[0]
      }
    }
  );
  const sendJob = async function() {
    let existUser = await User.findOne({
      chatId: ctx.update.message
        ? ctx.update.message.chat.id
        : ctx.update.callback_query.message.chat.id
    });
    await replyWithWeather(ctx, `${existUser.city} ${existUser.country}`);
    await replyWithCurrency(ctx);
    await replyWithNews(ctx);
  };

  await replyWithWeather(ctx, `${existUser.city} ${existUser.country}`);
  await replyWithCurrency(ctx);
  await replyWithNews(ctx);

  await runAsker(ctx);
  if (ctx.update.callback_query.data.split(" ")[0] != "-1")
    cron.schedule(
      `0 */${ctx.update.callback_query.data.split(" ")[0]} * * *`,
      async () => await sendJob,
      {
        scheduled: true,
        tz: "Europe/Moscow"
      }
    );
});

const getWeather = async ctx => {
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });
  await replyWithWeather(ctx, `${existUser.city} ${existUser.country}`);
  await runAsker(ctx);
};

bot.action(/weather!/, async ctx => {
  delMenu(ctx);
  await getWeather(ctx);
});

bot.command("weather", async ctx => await getWeather(ctx));

const getCurrencies = async ctx => {
  await replyWithCurrency(ctx);
  await runAsker(ctx);
};
bot.action(/currencies!/, async ctx => {
  //delMenu(ctx);
  await getCurrencies(ctx);
});

bot.command("currencies", async ctx => await getCurrencies(ctx));

const getNews = async ctx => {
  await replyWithNews(ctx);
  await runAsker(ctx);
};

bot.action(/news!/, async ctx => {
  delMenu(ctx);
  await getNews(ctx);
});
bot.command("news", async ctx => await getNews(ctx));

bot.launch();
