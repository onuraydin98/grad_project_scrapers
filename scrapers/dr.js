const {
  launchBrowser,
  closeBrowser
} = require("../helpers");
const baseURL = "https://www.dr.com.tr";
const SCRAPING_SIZE = 3;
const PAGE_LIMIT = 45; // Max limit of products for one fetch for this website

const getCategories = async () => {
  let page;
  const browser = await launchBrowser();

  page = await browser.newPage();
  await page.goto(baseURL, {
    waitUntil: "networkidle2",
    timeout: 0,
  });

  const categoryArray = await page.evaluate(async () => {
    let div = document.createElement("div");
    let tempCategoryArray = [];

    div.innerHTML = await fetch("https://www.dr.com.tr/kategori/kitap", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "max-age=0",
          "sec-ch-ua": '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
        },
        referrer: "https://www.dr.com.tr/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include",
      })
      .then(async (response) => {
        return await response.text();
      })
      .then(async (text) => {
        return text.trim();
      })
      .catch(() => {
        console.log("Can not fetch the url!");
      });

    $(div)
      .find(".filter-area-category ul a:not(:first)")
      .each((index, data) => {
        let categoryObject = {
          URL: "",
          title: "",
        };

        categoryObject.title = data.title;
        categoryObject.URL = data.href;

        tempCategoryArray.push(categoryObject);
      });

    return tempCategoryArray;
  });

  closeBrowser(browser);

  console.log(categoryArray);
  return categoryArray;
};

const getBooks = async (scrapingSize = SCRAPING_SIZE, callback) => {
  let pages = [];
  const categories = await callback();
  const browser = await launchBrowser();

  for (let i = 0; i < categories.length; i++) {
    pages.push(await browser.newPage());
  }

  let Data = pages.map(async (page, index) => {
    return page
      .goto(`${categories[index].URL}`, {
        waitUntil: "networkidle2",
        timeout: 0,
      })
      .then(async () => {
        console.log(`Inside of this ${categories[index].URL}`);

        const outputArray = await page.evaluate(
          async (index, scrapingSize, categories, PAGE_LIMIT) => {
              let productsArray = [];
              const parentId = $(".js-facet-list-categories")
                .children(":first")
                .attr("data-id");
              const subCategoryId = $(".js-facet-list-categories")
                .find(`[data-parent=${parentId}]`)
                .attr("data-id");

              const fetchAPI = async (counter) => {
                console.log(`Fetching ${counter} of ${categories[index].URL}`);

                let data = await fetch("https://www.dr.com.tr/Catalog/AsyncCategory", {
                    headers: {
                      accept: "*/*",
                      "accept-language": "en-US,en;q=0.9",
                      "cache-control": "max-age=0",
                      "content-type": "application/json",
                      newrelic: "eyJ2IjpbMCwxXSwiZCI6eyJ0eSI6IkJyb3dzZXIiLCJhYyI6IjUxMDc5NCIsImFwIjoiMTA0NDk5MjkiLCJpZCI6IjRkMmMzMWJiYTJiNDBiNjMiLCJ0ciI6IjQ0ODY3M2YwYmE0ZTI5YThlMjlhNGRmM2VjNjQ2OTVmIiwidGkiOjE2NTcwOTkzNjc4NTN9fQ==",
                      "sec-ch-ua": '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
                      "sec-ch-ua-mobile": "?0",
                      "sec-fetch-dest": "empty",
                      "sec-fetch-mode": "cors",
                      "sec-fetch-site": "same-origin",
                      traceparent: "00-448673f0ba4e29a8e29a4df3ec64695f-4d2c31bba2b40b63-01",
                      tracestate: "510794@nr=0-1-510794-10449929-4d2c31bba2b40b63----1657099367853",
                    },
                    referrerPolicy: "strict-origin-when-cross-origin",
                    body: `{"Q":"","Brand":[],"Person":[],"Media":[],"Lang":[],"Rate":[],"Page":${counter},"Manufacturer":[],"SortType":0,"SortOrder":1,"MinPrice":0,"MaxPrice":0,"PageSize":${PAGE_LIMIT},"ProductId":0,"MinDiscount":0,"MaxDiscount":0,"Newness":false,"Attributes":null,"ShowNotForSale":true,"PriceOptionIds":null,"CategoryIds":null,"AttributeIds":null,"MainCategoryId":0,"CategoryPath":null,"ActiveCategoryId":${subCategoryId}}`,
                    method: "POST",
                    mode: "cors",
                    credentials: "include",
                  })
                  .then(async (response) => {
                    return await response.json();
                  })
                  .catch((err) => {
                    console.log("Can not fetch the url!", err);
                    return err;
                  });

                data.Result.Products.forEach((e) => { // for accessing images' URLs
                  e.ImageUrl = 'https://i.dr.com.tr' + e.ImageUrl;
                })

                return data;
              };

              for (let i = 1; i <= scrapingSize; i++) {
                try {
                  // Increase scrapingSize for more data
                  let products = await fetchAPI(i);
                  productsArray = productsArray.concat(products.Result.Products);
                } catch (e) {
                  console.log("fetchAPI could not work!", e);
                }
              }

              return productsArray;
            },
            index,
            scrapingSize,
            categories,
            PAGE_LIMIT
        );

        console.log(outputArray);
        return outputArray;
      })
      .catch((err) => {
        console.log(err);
        throw err;
      });
  });

  return Promise.all(Data).finally(async () => {
    closeBrowser(browser);
  });
};

(() => {
  console.log('Self Invoked!');
  getBooks(undefined, getCategories);
})();