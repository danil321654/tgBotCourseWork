const axios = require("axios");
const User = require("../models/user");

let currencyFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 5,
  minimumIntegerDigits: 1
});

module.exports = async ctx => {
  let existUser = await User.findOne({
    chatId: ctx.update.message
      ? ctx.update.message.chat.id
      : ctx.update.callback_query.message.chat.id
  });

  let currencies = existUser.currencies
    .filter(el => el[0] == "✓")
    .map(el => el.slice(3));
  let currencyMatrix = [];
  let currencyMatrixReply = ``;

  for (var i = 0; i < currencies.length; i++) {
    currencies.map((item, j) => {
      let requestCurrency = `${currencies[i]}_${item}`;
      if (currencies[i] != item) currencyMatrix.push(requestCurrency);
      return item;
    });
  }

  let res = await axios.get(
    `http://data.fixer.io/api/latest?access_key=${process.env.currApi}&symbols=${currencies.toString()}&format=1`
  );
  console.log(res);
  await Promise.all(
    currencies.map(async (item, j) => {
      await Promise.all(
        currencies.map(async (item1, i) => {
          console.log(res.data.rates);
          if (item != item1)
            currencyMatrixReply += `\t${item1}/${item} <b>${currencyFormat.format(
              item1 != "EUR" ? res.data.rates[item] / res.data.rates[item1] : res.data.rates[item]
            )}</b>\n`;
          return item;
        })
      );
    })
  );

  console.log(currencyMatrixReply);
  currencyMatrixReply = currencyMatrixReply.split('\n');
  currencyMatrixReply.sort();
  currencyMatrixReply = currencyMatrixReply.join('\n------------------\n');
  currencyMatrixReply = currencyMatrixReply + '\n------------------\n';

  if (currencyMatrixReply != "") await ctx.reply(`<pre>${currencyMatrixReply}</pre>`, { parse_mode: "HTML" });
};
