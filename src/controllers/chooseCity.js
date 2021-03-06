const axios = require("axios");
const Levenshtein = require("levenshtein");
const { Markup } = require("telegraf");
const KtoC = require("../util/temp");
const cities = require("../util/current.city.list.min");
const weatherSticker = require("../util/weatherSticker");
const User = require("../models/user");
const translate = require("../util/translate");

const citiesNamesCountries = cities.map(el => {
  return !el.langs
    ? { id: el.id, name: el.name, country: el.country }
    : el.langs.filter(x => x.ru).length > 0
      ? {
        id: el.id,
        name: el.name,
        country: el.country,
        ruName: el.langs.filter(x => x.ru)[0].ru
      }
      : { id: el.id, name: el.name, country: el.country };
});
const ruNames = citiesNamesCountries.filter(el => el.ruName);

console.log(cities[0])

module.exports = async (ctx, city = undefined) => {
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });

  let requestedCity = !city ? ctx.update.message.text : city;
  let res;
  let requestedCitySplit = requestedCity.split("_");
  console.log(requestedCitySplit);
  if (/ростов-на-дону/i.test(requestedCitySplit[0]))
    requestedCitySplit[0] = "rostov-na-donu";
  else if (/санкт-петербург/i.test(requestedCitySplit[0]))
    requestedCitySplit[0] = "Saint Petersburg";
  else if (ruNames.map(el => el.ruName).includes(requestedCitySplit[0]))
    requestedCitySplit[0] =
      ruNames[
        ruNames.map((el => el.ruName)).indexOf(requestedCitySplit[0])
      ].name;

  else if (ruNames.map(el => el.ruName.toLowerCase()).includes(requestedCitySplit[0]))
    requestedCitySplit[0] =
      ruNames[
        ruNames.map((el => el.ruName.toLowerCase())).indexOf(requestedCitySplit[0])
      ].name;
  else if (/[а-яА-ЯЁё]/.test(requestedCitySplit[0]))
    requestedCitySplit[0] = await translate(requestedCitySplit[0], {
      from: "ru",
      to: "en"
    });
  console.log(await translate(requestedCitySplit[0], { from: "ru", to: "en" }));
  if (requestedCitySplit[0].length < 3)
    ctx.reply(existUser.language == "RU" ? "Неверный запрос" : "Bad request");
  else if (requestedCitySplit.length == 1) {
    requestedCity = {
      city: requestedCitySplit[0]
        .toLowerCase()
        .split("-")
        .map(
          cityPart =>
            cityPart[0].toUpperCase() +
            cityPart
              .split("")
              .slice(1, cityPart.length)
              .join("")
        )
        .join("-")
    };
    res = citiesNamesCountries
      .map(el => {
        return {
          ...el,
          diffCity: Levenshtein(el.name, requestedCity.city)
        };
      })
      .filter(el => el.diffCity < 2)
      .sort((a, b) => a.diffCity - b.diffCity);
  } else if (requestedCitySplit.length == 2) {
    requestedCity = {
      city: requestedCitySplit[0]
        .toLowerCase()
        .split("-")
        .map(
          cityPart =>
            cityPart[0].toUpperCase() +
            cityPart
              .split("")
              .slice(1, cityPart.length)
              .join("")
        )
        .join("-"),
      country: requestedCitySplit[1].toUpperCase()
    };
    res = citiesNamesCountries
      .map(el => {
        return {
          ...el,
          diffCity: Levenshtein(el.name, requestedCity.city),
          diffCountry: Levenshtein(el.country, requestedCity.country)
        };
      })
      .filter(el => el.diffCity < 2 && el.diffCountry === 0)
      .sort((a, b) => a.diffCity + a.diffCountry - b.diffCity - b.diffCountry);
    if (res[0].diffCity == 0)
      res = [res[0]]
  } else
    ctx.reply(existUser.language == "RU" ? "Неверный запрос" : "Bad request");
  console.log(res);
  console.log(ctx.update);
  if (res.length == 1) {
    let existUser1 = await User.findOneAndUpdate(
      {
        chatId: ctx.update.message
          ? ctx.update.message.chat.id
          : ctx.update.callback_query.message.chat.id
      },
      {
        $set: {
          city: res[0].name,
          country: res[0].country,
          settingsPos: "currencies"
        }
      }
    );

    return;
  } else if (res.length > 1) {
    await ctx.replyWithMarkdown(
      existUser.language == "RU" ? "Выберите город" : "Choose city:",
      {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            ...res.map(el => [
              Markup.callbackButton(
                `${el.name} ${el.country}`,
                `${el.name}_${el.country}`
              )
            ]),
            [Markup.callbackButton(`go back`, `-1`)]
          ]
        })
      }
    );
  } else
    await ctx.reply(
      existUser.language == "RU"
        ? "У меня нет информации об этом городе."
        : "I don't have information about such city."
    ); //  return -1;
};
