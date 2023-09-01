const fs = require('fs');
const path = require('path');
const Store = require('../autokin-store');
const { chromium, devices, firefox } = require('playwright');

class PlaywrightWebBuilder {
    constructor() {
        this.browserType = {
            chromium,
            firefox,
        };
        this.currentBrowser = 'chromium';
        this.hostUrl = '';
        this.browser = null;
        this.page = null;
        this.httpMocks = {};
    }

    async host(hostUrl) {
        this.hostUrl = Store.sanitize(hostUrl);
        this.browser = await this.browserType[this.currentBrowser].launch();
        this.page = await this.browser.newPage({
            recordVideo: {
                dir: 'videos/',
                size: { width: 800, height: 600 },
            },
        });

        const self = this;

        await this.page.route('**/*', (route, request) => {
            const requestKey = `${request.method()}_${request.url()}`;

            if (!self.httpMocks[requestKey]) {
                return route.continue();
            }

            const mockData = self.httpMocks[requestKey];

            if (mockData.body) {
                return request.fulfill({
                    status: mockData.status,
                    contentType: 'application/json',
                    body: JSON.stringify(mockData.body),
                });
            }
        });
    }

    rgb(color) {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        color = color.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        return result
            ? {
                red: parseInt(result[1], 16),
                green: parseInt(result[2], 16),
                blue: parseInt(result[3], 16),
            }
            : null;
    }

    generateImage(image) {
        const jpeg = require('jpeg-js');
        let frameData = Buffer.alloc(image.width * image.height * 4);
        let i = 0;
        while (i < frameData.length) {
            frameData[i++] = this.rgb(image.background).red;
            frameData[i++] = this.rgb(image.background).green;
            frameData[i++] = this.rgb(image.background).blue;
            frameData[i++] = 0xff;
        }
        const rawImageData = {
            data: frameData,
            width: image.width,
            height: image.height,
        };
        return jpeg.encode(rawImageData, 50).data;
    }

    async windowSize(width, height) {
        await this.page.setViewportSize({
            width,
            height,
        });
    }

    async select(selector, value) {
        await this.page.select(Store.sanitize(selector), Store.sanitize(value));
    }


    async sanitizeWindowSize(options) {
        let [w, h] = Store.sanitize(options).split(',');
        let width = parseInt(w) || 1400;
        let height = parseInt(h) || 800;
        await this.page.setViewportSize({
            width,
            height,
        });
    }

    async emulate(device) {
        const mobileDevice =
            devices[Store.sanitize(device)] || devices['iPhone X'];
        const context = await this.browser.newContext({
            ...mobileDevice,
        });
        this.page = await context.newPage();
    }

    async mock(data) {
        const mockData = Store.sanitizeJson(JSON.parse(data));
        this.httpMocks[`${mockData.method}_${mockData.url}`] = mockData;
    }

    async navigate(urlPath) {
        await this.page.goto(`${this.hostUrl}${Store.sanitize(urlPath)}`, {
            waitUntil: 'networkidle',
        });
    }

    async close() {
        await this.page.close();
        await this.browser.close();
    }

    async screenshot(path) {
        await this.page.screenshot({
            path: `${Store.sanitize(path)}.png`,
            fullPage: true,
        });
    }

    async type(selector, value) {
        await this.page.click(Store.sanitize(selector));
        await this.page.type(Store.sanitize(selector), Store.sanitize(value));
    }

    async typeThruDocument(selector, value) {
        await this.page.evaluate(
            ([selector, value]) => {
                let els = document.querySelectorAll(selector);
                els[0].value = value;
            },
            [Store.sanitize(selector), value]
        );
    }

    async click(selector, xpath) {
        if (xpath) {
            await this.page.evaluate((selector) => {
                function getElementByXpath(path) {
                    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                }
                const el = getElementByXpath(selector);
                if (el)
                    el.click();

            }, selector)
        } else {
            await this.page.click(Store.sanitize(selector));
        }
    }

    async mouseClick(x, y = null) {
        let coords = { x, y, width: 10, height: 10 };
        if (y === null) {
            const selector = x;
            const el = await this.page.$$(selector);
            coords = await el[0].boundingBox();
        }

        await this.page.mouse.move(
            coords.x + coords.width / 2,
            coords.y + coords.height / 2
        );
        await this.page.mouse.down();
    }

    async clickThruDocument(selector) {
        await this.page.evaluate((selector) => {
            let els = document.querySelectorAll(selector);
            els[0].click();
        }, Store.sanitize(selector));
    }

    async getElementsByXPath(xpath) {
        const elements = await this.page.evaluate((xpath) => {
            const results = [];
            const query = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            for (let i = 0, length = query.snapshotLength; i < length; ++i) {
                results.push(query.snapshotItem(i));
            }
            return results;
        }, xpath);

        return Promise.resolve(elements);
    }

    async getElementByXPath(xpath) {
        const elements = await this.getElementsByXPath(xpath);
        return elements && elements.length > 0 ? elements[0] : null;
    }

    async exists(selector, xpath = false) {
        if (xpath) {
            let exists = await this.getElementByXPath(selector);
            return Promise.resolve(exists !== null);
        }

        let exists = await this.page.evaluate((selector) => {
            let els = document.querySelectorAll(selector);
            return els.length > 0;
        }, Store.sanitize(selector));

        return Promise.resolve(exists);
    }
    

    async waitUntil() {
        await this.page.waitForNavigation({
            waitUntil: 'networkidle',
        });
    }

    async waitFor(microseconds) {
        await this.page.waitForTimeout(microseconds);
    }

    async text(selector) {
        const text = await this.page.$eval(
            Store.sanitize(selector),
            (elm) => elm.textContent
        );
        return text;
    }

    async hover(selector) {
        await this.page.hover(Store.sanitize(selector));
    }

    async value(selector) {
        const value = await this.page.$eval(
            Store.sanitize(selector),
            (elm) => elm.value
        );
        return value;
    }

    async clearValue(selector) {
        await this.page.$eval(
            Store.sanitize(selector),
            (el) => (el.value = '')
        );
    }

    async reload() {
        await this.page.reload({
            waitUntil: 'domcontentloaded',
        });

        
    }

    async mockWith(filePath) {
        const target = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(target)) {
            return;
        }

        let mockConfig = fs.readFileSync(target);
        await this.mock(mockConfig);
    }

    async setBrowserType(browser) {
        this.currentBrowser = browser;
    }

    async keep(key, selector) {
        let val = await this.value(selector);
        Store.set(key, val);
        return this;
    }

    async storeSession(key) {
        await this.storeCookies(key);
        await this.storeLocalStorage(key);
        await this.storeSessionStorage(key);

        return {
            cookies: Store.get(key + ':cookies', []),
            localStorage: Store.get(key + ':localStorage', {}),
            sessionStorage: Store.get(key + ':sessionStorage', {}),
        }
    }
    
    async restoreSession(key) {
        await this.restoreCookies(key);
        await this.restoreLocalStorage(key);
        await this.restoreSessionStorage(key);
    }

    async storeCookies(key) {
        const cookies = await this.page.context().cookies();
        Store.set(key + ':cookies', cookies);
    }

    async restoreCookies(key) {
        const cookies = Store.get(key + ':cookies', []) ;
        await this.page.context().addCookies(cookies);
    }


    async storeLocalStorage(key) {
        const localStorage = await this.page.evaluate(() => {
            const json = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                json[key] = localStorage.getItem(key);
            }
            return json;
        });
        Store.set(key + ':localStorage', localStorage);

    }

    async restoreLocalStorage(key) {
        const values = Store.get(key + ':localStorage');
        await this.page.evaluate((values) => {
            localStorage.clear();
            for (let key in values) {
                localStorage.setItem(key, values[key]);
            }
        }, values);

    }

    async storeSessionStorage(key) {
        const sessionStorage = await this.page.evaluate(() => {
            const json = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                json[key] = sessionStorage.getItem(key);
            }
            return json;
        });

        Store.set(key + ':sessionStorage', sessionStorage);
    }

    async restoreSessionStorage(key) {
        const values = Store.get(key + ':sessionStorage');
        await this.page.evaluate((values) => {
            sessionStorage.clear();
            for (let key in values) {
                sessionStorage.setItem(key, values[key]);
            }
        }, values);
    }

        
}

module.exports.PlaywrightWebBuilder = PlaywrightWebBuilder;
