const mongoose = require("mongoose");
const {
    Schema
} = mongoose;

const BookSchema = new Schema({
    price: Number,
    title: String,
    img: String,
    author: String,
    URL: String,
    publisher: String,
    rating: Number,
    providedURL: String
});

module.exports = mongoose.model("Books", BookSchema);