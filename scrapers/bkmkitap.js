const {
    launchBrowser,
    closeBrowser
} = require("../helpers");
const {
    performance
} = require('perf_hooks');
const baseURL = "https://www.bkmkitap.com";
const SCRAPING_SIZE = 1;
const FETCH_PER_PAGE = 5;
const PAGE_LIMIT = 96;

let totalFileSize = 0; // Total file size for observing

/*
    Categories array given manual, corresponding site has no well structured design, some of the categories are main categories, some of not.
    It is not possible to standardize the code, even if I do it somehow, it'll cost much, it's better to give static data at this moment much more logically
*/
const categoriesURLArray = [{
        URL: `${baseURL}/edebiyat-kitaplari`,
        title: 'Edebiyat'
    },
    {
        URL: `${baseURL}/kitap/cocuk-kitaplari`,
        title: 'Çocuk'
    },
    {
        URL: `${baseURL}/egitim-kitaplari`,
        title: 'Eğitim'
    },
    {
        URL: `${baseURL}/kitap/tarih-kitaplari`,
        title: 'Tarih'
    },
    {
        URL: `${baseURL}/yabanci-dilde-kitaplar`,
        title: 'Foreign Languages'
    },
    {
        URL: `${baseURL}/dini-kitaplar`,
        title: 'Din Tasavvuf'
    },
    {
        URL: `${baseURL}/sinavlara-hazirlik-kitaplari`,
        title: 'Sınav'
    },
    {
        URL: `${baseURL}/universite-ders-kitaplari`,
        title: 'Ders (Üniversite)'
    },
    {
        URL: `${baseURL}/sanat-ve-mimarlik-kitaplari`,
        title: 'Sanat'
    },
    {
        URL: `${baseURL}/felsefe-kitaplari`,
        title: 'Felsefe'
    },
    {
        URL: `${baseURL}/hobi`,
        title: 'Hobi'
    },
    {
        URL: `${baseURL}/bilim-ve-muhendislik-kitaplari`,
        title: 'Bilim'
    },
    {
        URL: `${baseURL}/cizgi-roman-1212-kitaplari`,
        title: 'Çizgi Roman'
    },
    {
        URL: `${baseURL}/mizah-2-kitaplari`,
        title: 'Mizah'
    },
    {
        URL: `${baseURL}/inanc-ve-mitoloji-kitaplari`,
        title: 'Mitoloji'
    },
    {
        URL: `${baseURL}/efsane-ve-destan-kitaplari`,
        title: 'Efsane'
    }
]

const getBooks = async (scrapingSize = SCRAPING_SIZE) => {
    let pages = [];
    let parsedArray = [];
    const browser = await launchBrowser();

    for (let i = 0; i < Math.floor(categoriesURLArray.length / FETCH_PER_PAGE); i++) {
        parsedArray.push(FETCH_PER_PAGE);
    }
    parsedArray.push(categoriesURLArray.length % FETCH_PER_PAGE);

    for (let j = 0; j < parsedArray.length; j++) {
        pages.push(await browser.newPage()); // Pages array, length for determine how many tabs working on URL in parallel, value for parser
    }

    //console.log('parsedArray', parsedArray);

    let Data = pages.map(async (page, index) => {
        return page.goto(`${baseURL}`, {
                waitUntil: "networkidle2",
                timeout: 0,
            }).then(async () => {
                const outputArray = await page.evaluate(
                    async (index, scrapingSize, parsedArray, PAGE_LIMIT, categoriesURLArray, baseURL) => {
                            let productsArray = [];
                            let totalSoFar = 0; // Variable that holds the threshold value
                            let paginationFlag = 1;

                            parsedArray.slice(0, index + 1).forEach((value) => {
                                totalSoFar += value;
                            });

                            const scrapeProducts = async (htmlText) => {
                                let div = document.createElement("div");
                                let tempArray = [];

                                div.innerHTML = htmlText || '';

                                div.querySelectorAll('.showcaseWrap div:not(.catalogWrapper) .row .swiper-wrapper > .productItem').forEach((node) => { // Selectorlere bir daha bak! daha düzgün ilerle
                                    let regexForPrice = /[1-9][0-9]*(?:\/[1-9][0-9])*/g;
                                    let productRatingWidth = node.querySelector('.row:nth-child(2) .stars').style.width || '0%';
                                    productRatingWidth = productRatingWidth === '0%' ? 0 : Math.round(parseFloat(productRatingWidth) / 20);

                                    let obj = {
                                        img: node.querySelector('.row a img').src || null,
                                        rating: productRatingWidth,
                                        URL: node.querySelector('.row a').href || '',
                                        title: node.querySelector('.row:nth-child(2) .row > .box > .row a:first-child').title || '',
                                        author: node.querySelector('.row:nth-child(2) .row > .box > .row a:nth-child(3)').text || '',
                                        publisher: node.querySelector('.row:nth-child(2) .row > .box > .row a:nth-child(2)').title || '',
                                        price: parseFloat(node.querySelector('.row:nth-child(2) .row .productPrice .currentPrice').textContent.match(regexForPrice).join('.')) || 0,
                                    }

                                    tempArray.push(obj);
                                })

                                if (div.querySelectorAll('#katalog .catalogWrapper .productItem').length < PAGE_LIMIT) paginationFlag = 0;

                                console.log('tempArray', tempArray)

                                return tempArray;
                            };

                            const fetchAPI = async (counter, categoryIndex) => {
                                console.log(`Fetching ${counter} of ${categoriesURLArray[categoryIndex].URL}`);

                                return await fetch(`${baseURL}?pg=${counter}`, {
                                        "headers": {
                                            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                                            "accept-language": "en-US,en;q=0.9,tr;q=0.8",
                                            "sec-ch-ua": "\"Chromium\";v=\"106\", \"Google Chrome\";v=\"106\", \"Not;A=Brand\";v=\"99\"",
                                            "sec-ch-ua-mobile": "?0",
                                            "sec-ch-ua-platform": "\"Windows\"",
                                            "sec-fetch-dest": "document",
                                            "sec-fetch-mode": "navigate",
                                            "sec-fetch-site": "same-origin",
                                            "sec-fetch-user": "?1",
                                            "upgrade-insecure-requests": "1"
                                        },
                                        "body": null,
                                        "method": "GET",
                                        "mode": "cors",
                                        "credentials": "include"
                                    }).then((e) => {
                                        return e.text();
                                    })
                                    .catch((err) => {
                                        console.log("Can not fetch the url!", err);
                                        return err;
                                    });
                            };

                            //console.log('totalsofar', totalSoFar);
                            let scrapedProductArray = [];

                            for (let i = ((totalSoFar - parsedArray[index])); i < Math.ceil(totalSoFar); i++) {
                                for (let j = 1; j <= scrapingSize && paginationFlag; j++) {
                                    try {
                                        // Increase scrapingSize for more data
                                        scrapedProductArray = await scrapeProducts(await fetchAPI(j, i));
                                        productsArray = productsArray.concat(scrapedProductArray);
                                    } catch (e) {
                                        console.log("fetchAPI could not work!", e);
                                    }
                                }
                                paginationFlag = 1;
                            }

                            return productsArray;
                        },
                        index,
                        scrapingSize,
                        parsedArray,
                        PAGE_LIMIT,
                        categoriesURLArray,
                        baseURL);
                console.log(outputArray);
                totalFileSize = totalFileSize + outputArray.length;
                return outputArray;
            })
            .catch((err) => {
                console.log(err);
                throw err;
            });
    })

    return Promise.all(Data).finally(async () => {
        closeBrowser(browser);
    });
}

// (() => {
//     console.log('Self Invoked!');
//     let start = performance.now();
//     let end;

//     getBooks().then(() => {
//         end = performance.now();

//         console.log(`Call to getBooks took ${((end - start) / 60000).toFixed(6)} minutes, total file => ${totalFileSize}`)
//     });

// })();

module.exports = {
    init: getBooks,
}