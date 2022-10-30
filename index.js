require("dotenv").config();
const mongoose = require("mongoose");
const scraperList = require("./scraperList");
const Book = require("./models/books");


const scrapingJob = async () => {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("Database connected");

    // Practice -- will change
    let data = await scraperList["Idefix"].init();

    data.map((datum) => {
        Book.insertMany(datum).then(console.log) // For monitoring
    })
}


// Self Invoke -- will change
(() => {
    scrapingJob();
})();