require("dotenv").config();
const fs = require("fs");
const {Markup} = require("telegraf");

const schedule = require("node-schedule");

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

let job;

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

const sendJob = async function(ctx) {
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });
  await replyWithWeather(ctx, `${existUser.city} ${existUser.country}`);
  await replyWithCurrency(ctx);
  await replyWithNews(ctx);
};

bot.start(async ctx => {
  await getFirstInfo(ctx);
  await User.findOneAndUpdate(
    {
      chatId: ctx.update.message
        ? ctx.update.message.chat.id
        : ctx.update.callback_query.message.chat.id
    },
    {
      $set: {
        settingsPos: "language"
      }
    }
  );

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
    let existUser2 = await User.findOne({
      chatId: ctx.update.message
        ? ctx.update.message.chat.id
        : ctx.update.callback_query.message.chat.id
    });
    if (existUser2.settingsPos == "currencies") await setupCurrency(ctx);
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

  await replyWithWeather(ctx, `${existUser.city} ${existUser.country}`);
  await replyWithCurrency(ctx);
  await replyWithNews(ctx);

  await runAsker(ctx, sendJob);

  job = schedule.scheduleJob(
    `0 0 ${ctx.update.callback_query.data.split(" ")[0]} * * *`,
    async () => {
      await delMenu(ctx);
      await sendJob(ctx);
      await runAsker(ctx);
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

  await runAsker(ctx, sendJob);
};

bot.action(/weather!/, async ctx => {
  delMenu(ctx);
  await getWeather(ctx);
});

bot.command("weather", async ctx => await getWeather(ctx));

const getCurrencies = async ctx => {
  await replyWithCurrency(ctx);
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

  await runAsker(ctx, sendJob);
};
bot.action(/currencies!/, async ctx => {
  delMenu(ctx);
  await getCurrencies(ctx);
});

bot.command("currencies", async ctx => await getCurrencies(ctx));

const getNews = async ctx => {
  await replyWithNews(ctx);
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
  await runAsker(ctx, sendJob);
};

bot.action(/news!/, async ctx => {
  delMenu(ctx);
  await getNews(ctx);
});
bot.command("news", async ctx => await getNews(ctx));

bot.command("unsubscribe", async () => job.cancel());

bot.command("subscribe", async ctx => {
  try {
    job.cancel();

    let existUser = await User.findOne({
      chatId: ctx.update.message
        ? ctx.update.message.chat.id
        : ctx.update.callback_query.message.chat.id
    });
    job = schedule.scheduleJob(
      `0 0 ${existUser.timerHours} * * *`,
      async () => {
        await delMenu(ctx);
        await sendJob(ctx);
        await runAsker(ctx);
      }
    );
  } catch {}
});

bot.launch();
