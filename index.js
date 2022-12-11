require('dotenv').config()
const mongoose = require('mongoose')
const scraperList = require('./scraperList')
const Book = require('./models/books')

const scrapingJob = async () => {
    await mongoose.connect(process.env.DATABASE_URL)
    console.log('Database connected')

    // Practice -- will change
    //////let data = await scraperList['DR'].init();
    
    let drData = await scraperList['DR'].init();
    let idefixData = await scraperList['Idefix'].init();
    let bkmData = await scraperList['BKMKitap'].init();
    let kitapyurduData = await scraperList['KitapYurdu'].init();
    
    drData.flat(1);
    idefixData.flat(1);
    bkmData.flat(1);
    kitapyurduData.flat(1);

    var x = drData.concat(idefixData);
    var y = bkmData.concat(kitapyurduData);
    var t = x.concat(y);

    const mergedData = t.flat(1);
    const groupedBooks = groupByTitle(mergedData);
    const finalObject = {};

    Object.keys(groupedBooks).forEach(bookName => {
        const bookInfo = JSON.parse(JSON.stringify(groupedBooks[bookName]));
        
        finalObject[bookName] = JSON.parse(JSON.stringify(bookInfo[0]));

        delete finalObject[bookName].price;
        delete finalObject[bookName].URL;
        delete finalObject[bookName].providedURL;
        
        finalObject[bookName].prices = {};
        finalObject[bookName].URLs = {};
        
        bookInfo.forEach(book => {
            finalObject[bookName].prices[book.providedURL] = book.price;
            finalObject[bookName].URLs[book.providedURL] = book.URL;
        });
    });

    //console.log(Object.values(finalObject));

    Object.values(finalObject).forEach(bookData => {
        Book.insertMany(bookData);
    });
}

const groupByTitle = products => {
    return products.reduce((group, product) => {
        const { title } = product;

        group[title] = group[title] ?? [];
        group[title].push(product);

        return group;
    }, {});
}

// Self Invoke -- will change
;
(() => {
    scrapingJob()
})()