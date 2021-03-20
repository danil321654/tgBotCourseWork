const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  chatId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  language: {
    type: String,
    required: true,
    default: "RU"
  },
  city: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  currencies: {
    type: [String],
    required: true,
    default: ["$ USD", "€ EUR", "₽ RUB", "¥ CNY"]
  },
  timerHours: {
    type: Number
  },
  settingsPos: {
    type: String,
    required: true,
    default: "language"
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("users", userSchema);
