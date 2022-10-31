const { launchBrowser, closeBrowser } = require('../helpers')
const { performance } = require('perf_hooks')
const baseURL = 'https://www.idefix.com'
const SCRAPING_SIZE = 3
const FETCH_PER_PAGE = 10
const PAGE_LIMIT = 60 // Max limit of products for one fetch for this website

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

        div.innerHTML = await fetch('https://www.idefix.com/kategori/kitap', {
            headers: {
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'accept-language': 'en-US,en;q=0.9',
                'sec-ch-ua':
                    '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
                'sec-ch-ua-mobile': '?0',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
            },
            referrerPolicy: 'strict-origin-when-cross-origin',
            body: null,
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
        })
            .then(async (response) => {
                return await response.text()
            })
            .then(async (text) => {
                return text.trim()
            })
            .catch(() => {
                console.log('Can not fetch the url!')
            })

        div.querySelectorAll('.categoryContainer ul a').forEach((node) => {
            let categoryObject = {
                URL: '',
                title: '',
            }

            categoryObject.title = node.title
            categoryObject.URL = node.href

            tempCategoryArray.push(categoryObject)
        })

        return tempCategoryArray
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
    const categories = await callback()
    const browser = await launchBrowser()

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
                    async (index, scrapingSize, parsedArray, PAGE_LIMIT) => {
                        let productsArray = []
                        let totalSoFar = 0 // Variable that holds the threshold value
                        let paginationFlag = 1

                        const parentId = document
                            .querySelector('#items > [class = item]')
                            .getAttribute('data-categoryid')

                        // Sub category id's for this specific site given static because of the structure of website!!
                        const subCategoryIds = [
                            11762, 12032, 11802, 11703, 11943, 11751, 15271,
                            11923, 11872, 11878, 11727, 11750, 11904, 11908,
                            11758, 11938,
                        ]
                        const fetchAPI = async (counter, subCategoryIndex) => {
                            console.log(
                                `Fetching ${counter} of Category-${subCategoryIds[subCategoryIndex]}`
                            )

                            return fetch(
                                'https://www.idefix.com/kategori/ekitap',
                                {
                                    headers: {
                                        accept: '*/*',
                                        'accept-language':
                                            'en-US,en;q=0.9,tr;q=0.8',
                                        'content-type':
                                            'application/x-www-form-urlencoded; charset=UTF-8',
                                        newrelic:
                                            'eyJ2IjpbMCwxXSwiZCI6eyJ0eSI6IkJyb3dzZXIiLCJhYyI6IjUxMDc5NCIsImFwIjoiMTYxNjYwNzciLCJpZCI6IjY5ZGViNzQ4YTAxYTBhZGUiLCJ0ciI6IjIwZjE3YmRjYjg4ZTQzNzc1ODY0YzY1MTRkOGIwMGFlIiwidGkiOjE2NjM4ODI2MTIwMTZ9fQ==',
                                        'sec-ch-ua':
                                            '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
                                        'sec-ch-ua-mobile': '?0',
                                        'sec-ch-ua-platform': '"Windows"',
                                        'sec-fetch-dest': 'empty',
                                        'sec-fetch-mode': 'cors',
                                        'sec-fetch-site': 'same-origin',
                                        traceparent:
                                            '00-20f17bdcb88e43775864c6514d8b00ae-69deb748a01a0ade-01',
                                        tracestate:
                                            '510794@nr=0-1-510794-16166077-69deb748a01a0ade----1663882612016',
                                        'x-newrelic-id': 'UQcHVl9XGwIGVVdRDgAF',
                                        'x-requested-with': 'XMLHttpRequest',
                                    },
                                    body: `URLRoot=kategori&RequestType=1&MainCategoryId=${parentId}&ActiveCategoryId=${subCategoryIds[subCategoryIndex]}&Page=${counter}&PageSize=60&ShowNotForSale=true&ExcludeEbooks=true&FreeShipping=false&Discount=false&Campaing=false&Newness=false&SortType=soldcount&SortOrder=desc&MinPrice=0&MaxPrice=0&MinDiscount=0&MaxDiscount=0`,
                                    method: 'POST',
                                    mode: 'cors',
                                    credentials: 'include',
                                }
                            )
                                .then(async (response) => {
                                    return await response.json()
                                })
                                .catch((err) => {
                                    console.log('Can not fetch the url!')
                                    return err
                                })
                        }

                        const scrapeProducts = async (productObject) => {
                            let div = document.createElement('div')
                            let tempArray = []

                            div.innerHTML = productObject.Products
                            div.querySelectorAll(
                                '.row .itemlittleProduct .cart-product-box-view'
                            ).forEach((node) => {
                                let obj = {
                                    rating:
                                        parseInt(
                                            node
                                                .querySelector(
                                                    '.product-info .rating'
                                                )
                                                .getAttribute('data-rating')
                                        ) || 0,
                                    URL:
                                        node.querySelector(
                                            '.product-info .box-title > a'
                                        ).href || '',
                                    title:
                                        node.querySelector(
                                            '.product-info .box-title > a'
                                        ).title || '',
                                    author:
                                        node.querySelector(
                                            '.product-info .pName > .who'
                                        ).title || '',
                                    publisher:
                                        node.querySelector(
                                            '.product-info .manufacturerName > .who2'
                                        ).title || '',
                                    price:
                                        parseFloat(
                                            node
                                                .querySelector(
                                                    '.product-info .box-line-4 > .price'
                                                )
                                                .getAttribute('data-price')
                                                .replace(',', '.')
                                        ) || 0,
                                    img:
                                        node
                                            .querySelector('.product-image img')
                                            .getAttribute('data-src') || '',
                                    providedURL: 'idefix',
                                }

                                tempArray.push(obj)
                            })

                            if (
                                div.querySelectorAll(
                                    '.row .itemlittleProduct .product-info'
                                ).length < PAGE_LIMIT
                            )
                                paginationFlag = 0

                            return tempArray
                        }

                        parsedArray.slice(0, index + 1).forEach((value) => {
                            totalSoFar += value
                        })

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
                                    // Increase SCRAPING_SIZE for more data
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
                    PAGE_LIMIT
                )

                //console.log(outputArray) // Console final data array
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
//     console.log('Self Invoked!')
//     let start = performance.now()
//     let end
//     getBooks().then(() => {
//         end = performance.now()

//         console.log(
//             `Call to getBooks took ${((end - start) / 60000).toFixed(
//                 6
//             )} minutes, total file => ${totalFileSize}`
//         )
//     })
// })()

module.exports = {
    init: getBooks,
}
