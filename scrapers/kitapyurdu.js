const { launchBrowser, closeBrowser } = require('../helpers')
const { performance } = require('perf_hooks')
const baseURL = 'https://www.kitapyurdu.com'
const SCRAPING_SIZE = 7
const FETCH_PER_PAGE = 5
const PAGE_LIMIT = 100

let totalFileSize = 0 // Total file size for observing

const getCategories = async () => {
    let page
    const browser = await launchBrowser()

    page = await browser.newPage()
    await page.goto(baseURL, {
        waitUntil: 'networkidle2',
        timeout: 0,
    })

    const categoryArray = await page.evaluate(async () => {
        let div = document.createElement('div')
        let tempCategoryArray = []
        let categoryIdArray = []

        div.innerHTML = await fetch(
            'https://www.kitapyurdu.com/index.php?route=product/category',
            {
                headers: {
                    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'accept-language': 'en-US,en;q=0.9,tr;q=0.8',
                    'cache-control': 'max-age=0',
                    'sec-ch-ua':
                        '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                },
                body: null,
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
            }
        )
            .then(async (response) => {
                return await response.text()
            })
            .catch((e) => {
                console.log('Can not fetch the url!', e)
            })

        div.querySelectorAll('#content > .grid_5 > a').forEach((node) => {
            let categoryObject = {
                URL: '',
                title: '',
            }

            categoryObject.title = node.text.split('(')[0].trim()
            categoryObject.URL = node.href

            categoryIdArray.push(
                node.href.split('/').slice(-1)[0].split('.')[0]
            )

            tempCategoryArray.push(categoryObject)
        })

        return [tempCategoryArray, categoryIdArray]
    })

    closeBrowser(browser)

    console.log(categoryArray)
    return categoryArray
}

const getBooks = async (
    scrapingSize = SCRAPING_SIZE,
    callback = getCategories
) => {
    let pages = []
    let parsedArray = []
    let categoriesArray = await callback()
    const browser = await launchBrowser()
    const categories = categoriesArray[0]
    const categoriesIDs = categoriesArray[1]

    for (let i = 0; i < Math.floor(categories.length / FETCH_PER_PAGE); i++) {
        parsedArray.push(FETCH_PER_PAGE)
    }
    parsedArray.push(categories.length % FETCH_PER_PAGE)

    for (let j = 0; j < parsedArray.length; j++) {
        pages.push(await browser.newPage()) // Pages array, length for determine how many tabs working on URL in parallel, value for parser
    }

    let Data = pages.map(async (page, index) => {
        return page
            .goto(`${baseURL}`, {
                waitUntil: 'networkidle2',
                timeout: 0,
            })
            .then(async () => {
                const outputArray = await page.evaluate(
                    async (
                        index,
                        scrapingSize,
                        parsedArray,
                        categoriesIDs,
                        PAGE_LIMIT
                    ) => {
                        let productsArray = []
                        let totalSoFar = 0 // Variable that holds the threshold value
                        let paginationFlag = 1

                        const scrapeProducts = async (htmlText) => {
                            let div = document.createElement('div')
                            let tempArray = []

                            div.innerHTML = htmlText || ''

                            div.querySelectorAll(
                                '.product-grid > .product-cr'
                            ).forEach((node) => {
                                let obj = {
                                    img:
                                        node.querySelector('.cover img').src ||
                                        null,
                                    rating: node.querySelectorAll(
                                        '.rating i.active'
                                    ).length,
                                    URL:
                                        node.querySelector('.name > a').href ||
                                        '',
                                    title:
                                        node.querySelector('.name > a').title ||
                                        '',
                                    author:
                                        node
                                            .querySelector('.author > span')
                                            ?.textContent.trim() || '',
                                    publisher:
                                        node
                                            .querySelector('.publisher')
                                            ?.textContent.trim() || '',
                                    price:
                                        parseFloat(
                                            node
                                                .querySelector(
                                                    '.price > :not(.price-passive)'
                                                )
                                                ?.textContent.split(':')[1]
                                                .trim()
                                                .replace(',', '.')
                                        ) || 0,
                                    providedURL: 'kitapyurdu',
                                }

                                tempArray.push(obj)
                            })

                            if (
                                div.querySelector('.product-grid').children
                                    .length < PAGE_LIMIT
                            )
                                paginationFlag = 0

                            return tempArray
                        }

                        const fetchAPI = async (counter, categoryID) => {
                            console.log(
                                `Fetching ${counter} of Category-${categoryID}`
                            )

                            return fetch(
                                `https://www.kitapyurdu.com/index.php?route=product/category/&filter_category_all=true&category_id=${categoriesIDs[categoryID]}&sort=purchased_365&order=DESC&filter_in_stock=1&page=${counter}&limit=${PAGE_LIMIT}`,
                                {
                                    headers: {
                                        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                                        'accept-language':
                                            'en-US,en;q=0.9,tr;q=0.8',
                                        'cache-control': 'no-cache',
                                        pragma: 'no-cache',
                                        'sec-ch-ua':
                                            '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
                                        'sec-ch-ua-mobile': '?0',
                                        'sec-ch-ua-platform': '"Windows"',
                                        'sec-fetch-dest': 'document',
                                        'sec-fetch-mode': 'navigate',
                                        'sec-fetch-site': 'same-origin',
                                        'sec-fetch-user': '?1',
                                        'upgrade-insecure-requests': '1',
                                    },
                                    body: null,
                                    method: 'GET',
                                    mode: 'cors',
                                    credentials: 'include',
                                }
                            )
                                .then(async (response) => {
                                    return await response.text()
                                })
                                .catch((err) => {
                                    console.log('Can not fetch the url!', err)
                                    return err
                                })
                        }

                        parsedArray.slice(0, index + 1).forEach((value) => {
                            totalSoFar += value
                        })

                        //console.log('totalsofar', totalSoFar);
                        let scrapedProductArray = []

                        for (
                            let i = totalSoFar - parsedArray[index];
                            i < Math.ceil(totalSoFar);
                            i++
                        ) {
                            for (
                                let j = 1;
                                j <= scrapingSize && paginationFlag;
                                j++
                            ) {
                                try {
                                    // Increase scrapingSize for more data
                                    scrapedProductArray = await scrapeProducts(
                                        await fetchAPI(j, i)
                                    )
                                    productsArray =
                                        productsArray.concat(
                                            scrapedProductArray
                                        )
                                } catch (e) {
                                    console.log('fetchAPI could not work!', e)
                                }
                            }
                            paginationFlag = 1
                        }

                        return productsArray
                    },
                    index,
                    scrapingSize,
                    parsedArray,
                    categoriesIDs,
                    PAGE_LIMIT
                )
                //console.log(outputArray); // Console final data array
                totalFileSize = totalFileSize + outputArray.length
                return outputArray
            })
            .catch((err) => {
                console.log(err)
                throw err
            })
    })

    return Promise.all(Data).finally(async () => {
        closeBrowser(browser)
    })
}

// Self Invoke Function

// (() => {
//     console.log('Self Invoked!');
//     let start = performance.now();
//     let end;

//     getBooks().then(() => {
//       end = performance.now();

//       console.log(`Call to getBooks took ${((end - start) / 60000).toFixed(6)} minutes, total file => ${totalFileSize}`)
//     });

//   })();

module.exports = {
    init: getBooks,
}
