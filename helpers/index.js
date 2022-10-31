const puppeteer = require('puppeteer')

const launchBrowser = async () => {
    return await puppeteer.launch({
        headless: true,
        devtools: true,
        //slowMo: 100, // Will be removed at last
        defaultViewport: null,
    })
}

const closeBrowser = async (browser) => {
    return await browser.close()
}

module.exports = {
    launchBrowser,
    closeBrowser,
}
