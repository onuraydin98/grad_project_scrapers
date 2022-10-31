const mongoose = require('mongoose')
const { Schema } = mongoose

const BookSchema = new Schema({
    price: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    img: String,
    author: String,
    URL: String,
    publisher: String,
    rating: Number,
    providedURL: String,
})

module.exports = mongoose.model('Books', BookSchema)
