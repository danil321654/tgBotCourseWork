const axios = require("axios");
const Levenshtein = require("levenshtein");
const { Markup } = require("telegraf");
const KtoC = require("../util/temp");
const cities = require("../util/current.city.list.min");
const weatherSticker = require("../util/weatherSticker");
const translate = require("../util/translate");
const User = require("../models/user");

const citiesNamesCountries = cities.map(el => {
  return { id: el.id, name: el.name, country: el.country };
});

const windDirections = [{ en: 'north', ru: 'северный' }, { en: 'north-east', ru: 'северо-восточный' }, { en: 'east', ru: 'восточный' }, { en: 'south-east', ru: 'юго-восточный' }, { en: 'south', ru: 'южный' }, { en: 'south-west', ru: 'юго-западный' }, { en: 'west', ru: 'западный' }, { en: 'north-west', ru: 'северо-западный' }]

module.exports = async (ctx, city = undefined) => {
  let requestedCity = !city ? ctx.update.message.text : city;
  let res;

  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });
  if (requestedCity.split(" ")[0].length < 3) ctx.reply("Bad request");
  else if (requestedCity.split(" ").length == 1) {
    requestedCity = {
      city: requestedCity
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
  } else if (requestedCity.split(" ").length == 2) {
    requestedCity = {
      city: requestedCity
        .split(" ")[0]
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
      country: requestedCity.split(" ")[1].toUpperCase()
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
  } else ctx.reply("Bad request");
  if (res.length == 1) {
    let response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?id=${res[0].id}&appid=${process.env.weatherToken}`
    );
    let response2 = await axios.get(
      `https://api.weatherbit.io/v2.0/current?lat=${response.data.coord.lat}&lon=${response.data.coord.lon}&key=${process.env.weatherToken2}`
    );

    let response3 = await axios.get(
      `http://api.weatherstack.com/current?access_key=${process.env.weatherToken3}&query=${response.data.coord.lat},${response.data.coord.lon}`
    );

    let response4 = {}, provider = '', temperatures = [KtoC(
      response.data.main.temp
    ), response2.data.data[0].temp, response3.data.current.temperature];
    temperatures.sort((a, b) => a - b)

    if (KtoC(
      response.data.main.temp
    ) == temperatures[1]) {
      provider = "OpenWeather";
      response4.temperature = KtoC(response.data.main.temp);
      response4.feelsLike = KtoC(response.data.main.feels_like);
      response4.deltaTemp = `${KtoC(response.data.main.temp_min)}-${KtoC(response.data.main.temp_max)}`;
      response4.windSpeed = response.data.wind.speed;
      response4.windDirection = windDirections[Math.floor((response.data.wind.deg + 22.5) / 45)];
    }
    else if (response2.data.data[0].temp == temperatures[1]) {
      provider = "WeatherBit";
      response4.temperature = KtoC(response.data.main.temp);
      response4.feelsLike = response2.data.data[0].temp;
      response4.deltaTemp = `${KtoC(response.data.main.temp_min)}-${KtoC(response.data.main.temp_max)}`;
      response4.windSpeed = response2.data.data[0].wind_spd;
      response4.windDirection = windDirections[Math.floor((response2.data.data[0].wind_dir + 22.5) / 45)];
    }
    else {
      provider = "WeatherStack";
      response4.temperature = +response3.data.current.temperature + 0.2;
      response4.feelsLike = response3.data.current.feelsLike;
      response4.deltaTemp = `${KtoC(response.data.main.temp_min)}-${KtoC(response.data.main.temp_max)}`;
      response4.windSpeed = +response3.data.current.wind_speed + 0.5;
      response4.windDirection = windDirections[Math.floor((response3.data.current.wind_degree + 22.5) / 45)];
    }

    await ctx.reply(

      existUser.language == "RU" ?
        `Провайдеры прогноза погоды:\nOW - OpenWeather WB - WeatherBit\n\nТемпература в городе ${res[0].name} is ${KtoC(
          response.data.main.temp
        )} °С (OW) 
                                        ${
        response2.data.data[0].temp
        }°С (WB)\nЧувствуется как ${response4.feelsLike}°С\Температура в ближайшие 4 часа: ${response4.deltaTemp}°С\nСкорость ветра ${response.data.wind.speed}м/с(OW) ${response2.data.data[0].wind_spd}м/с(WB) \nНаправление ветра: ${
        windDirections[Math.floor((response.data.wind.deg + 22.5) / 45)].ru} (OW) ${
        windDirections[Math.floor((response2.data.data[0].wind_dir + 22.5) / 45)].ru} (WB)`
        :
        `Forecast provider:\n${provider}\n\nTemperature in ${res[0].name} is ${response4.temperature
        } °С\nFeels like ${response4.feelsLike
        }°С\nTemperature in near 4 hours: ${
        response4.feelsLike}°С\nWind speed ${response4.windSpeed}m/s\nWind direction: ${
        response4.windDirection.en}`
    );
    await ctx.reply(
      existUser.language == "RU" ?
        await translate(response.data.weather[0].description[0].toUpperCase() +
          response.data.weather[0].description.substr(
            1,
            response.data.weather[0].description.length
          ), "ru")
        : response.data.weather[0].description[0].toUpperCase() +
        response.data.weather[0].description.substr(
          1,
          response.data.weather[0].description.length
        )
    );
    await Promise.all(
      weatherSticker(response.data).map(
        async sticker => await ctx.replyWithSticker(sticker)
      )
    );
  } else if (res.length > 1) {
    await ctx.reply("Choose right city:", {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          ...res.map(el => [
            Markup.callbackButton(
              `${el.name} ${el.country}`,
              `${el.name} ${el.country}`
            )
          ]),
          [Markup.callbackButton(`go back`, `-1`)]
        ]
      })
    });
  } else
    ctx.reply(
      existUser.language == "RU"
        ? "У меня нет информации об этом городе."
        : "I don't have information about such city."
    );
};
