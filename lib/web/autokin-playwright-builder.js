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
        this.config = {};
        this.scrollToInteract = true;
    }

    setConfig(key, value) {
        this.config[key] = value;
    }

    getConfig(key) {
        return this.config[key];
    }

    setConfigs(configs) {
        this.config = { ...this.config, ...configs };
    }

    getBrowserConfigs() {
        const allowedConfigs = {
            headless : (value) => {
                return {key : 'headless', value}
            },
            slowMo : (value) => {
                return {key : 'slowMo', value : parseInt(value) || 0}
            },
            devtools : (value) =>  {
                return {key : 'devtools', value : value === 'true' ? true : false}
            },
            ignoreHTTPSErrors : (value) => {
                return {key : 'ignoreHTTPSErrors', value : value === 'true' ? true : false}
            },
            args : (value, current = null) => {
                value = value.split(',');
                if (current) {
                    value = [...current, ...value];
                }
                return {key : 'args', value}
            },
            maximize : value => {
                return {key : 'args', value : ['--start-maximized'] }
            },
            viewport : (value) => {
                
                return {key : 'viewport', value }
            },
            userAgent : (value) => {
                return {key : 'userAgent', value}
            },
            ignoreDefaultArgs : (value, current = null) => {
                value = value.split(',');
                if (current) {
                    value = [...current, ...value];
                }
                return {key : 'ignoreDefaultArgs', value}
            },
            executablePath : (value) => {
                return {key : 'executablePath', value}
            },
            emulate : (value) => {
                return {key : 'emulate', value}
            },
            recordVideo : (value) => {
                return {key : 'recordVideo', value}
            }
        };
        
        const browserConfigs = {};
        for (let key in this.config) {
    
            if (allowedConfigs[key]) {
                const config = allowedConfigs[key](this.config[key], browserConfigs[key]);
                browserConfigs[config.key] = config.value;
            }
        }

        return browserConfigs;
    }

    async listenRequest(method, url, callback) {
        this.httpMocks[`${method}_${url}`] = callback;
    }

    async host(hostUrl) {
        this.hostUrl = Store.sanitize(hostUrl);
        const broserConfig = this.getBrowserConfigs();
        this.scrollToInteract = this.config.scrollToInteract || false;
        this.browser = await this.browserType[this.currentBrowser].launch(broserConfig);
        
        

        const emulate = (broserConfig.emulate ? devices[broserConfig.emulate] : []);
        const pageConfig = [{
            viewport:  emulate ? emulate.viewport : (broserConfig.viewport ? broserConfig.viewport : { width: 800, height: 600 }),
        }];


        if (broserConfig.recordVideo) {
            let width = emulate.viewport ? emulate.viewport.width : (broserConfig.viewport ? broserConfig.viewport.width : 800);
            let height = emulate.viewport ? emulate.viewport.height : (broserConfig.viewport ? broserConfig.viewport.height : 600);
            if (width > 1920) {
                width = 1920;
            } else if (width < 420) {
                width = 420;
            }

            if (height > 1080) {
                height = 1080;
            } else if (height < 800) {
                height = 800;
            }

            
            pageConfig.recordVideo = {
                    dir: 'videos/',
                    size: { width, height},
            };
        }
        this.page = await this.browser.newPage({...pageConfig, ...emulate});

        const self = this;

        await this.page.route('**/*', (route, request) => {
            const requestKey = `${request.method()}_${request.url()}`;

            if (!self.httpMocks[requestKey]) {
                return route.continue();
            }

            const mockData = self.httpMocks[requestKey];

            if (typeof mockData === 'function') {
                return mockData(request, route);
            }

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

    async setFile(selector, filePath) {
        const fileChooserPromise = this.page.waitForEvent('filechooser');

        await this.click(selector);
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(Store.sanitize(filePath));
    }

    async select(selector, value) {
        if (this.scrollToInteract) {
            await this.scrollTo(selector);
        }
        await this.page.select(Store.sanitize(selector), Store.sanitize(value));
    }

    async scrollTo(selector) {
        // need to scroll to the element before interacting with it
        // the scroll must have to be smooth

        if (typeof selector === 'object') {
            await this.page.evaluate((selector) => {
                window.scrollBy(selector.x, selector.y);
            }, selector);

            await new Promise(resolve => setTimeout(resolve, 500));
            return;
        }
        
        await this.page.evaluate((selector) => {
            const element = document.querySelector(selector);
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center',
                });
            }
        }, Store.sanitize(selector));
        await new Promise(resolve => setTimeout(resolve, 500));

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

    async saveVideo(filename) {
        await this.page.close();
        await this.browser.close();
        
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

    async waitForResponse(options) {
        const { url, method, status, timeout, body } = Store.sanitizeJson(JSON.parse(options));
        
        return await this.page.waitForResponse(async (response) => {
            if (url && !response.url().includes(url)) {
                return false;
            }

            if (method && response.request().method() !== method) {
                return false;
            }

            if (status && response.status() !== status) {
                return false;
            }

            if (body) {
                const json = await response.json();
                if (json) {
                    for (let key in body) {
                        if (json[key] !== body[key]) {
                            return false;
                        }
                    }
                }
            }


            return true;
        }, {timeout : timeout || 30000});
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
        if (this.scrollToInteract) {
            await this.scrollTo(selector);
        }

        await this.page.click(Store.sanitize(selector));
        await this.page.type(Store.sanitize(selector), Store.sanitize(value));
    }

    async typeThruDocument(selector, value) {
        if (this.scrollToInteract) {
            await this.scrollTo(selector);
        }

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
            if (this.scrollToInteract) {
                await this.scrollTo(selector);
            }

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

        if (this.scrollToInteract) {
            await this.scrollTo(coords);
        }

        await this.page.mouse.move(
            coords.x + coords.width / 2,
            coords.y + coords.height / 2
        );
        await this.page.mouse.down();
    }

    async clickThruDocument(selector) {
        if (this.scrollToInteract) {
            await this.scrollTo(selector);
        }

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
        if (this.scrollToInteract) {
            await this.scrollTo(selector);
        }

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
