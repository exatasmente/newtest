/*
 * Copyright 2018 Aries Beltran <ariesbe@icloud.com>
 * Licensed under the MIT license. See LICENSE.
 * 
 * Autokin - Puppeteer Web Builder - PuppeteerWebBuilder
 */
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const Store = require('../autokin-store');
const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');

class PuppeteerWebBuilder {
    constructor() {
        if (process.env.AUTOKIN_VARS) {
            try {
                const autokinVars = require(path.resolve(process.cwd(), process.env.AUTOKIN_VARS));
                Store.merge(autokinVars);
            }
            catch (error) {
                process.stdout.write(colors.red(`Autokin Variables not loaded. Please check file path provided. (${colors.white(process.env.AUTOKIN_VARS)})\n\n`));
            }
        }
        this.hostUrl = '';
        this.browser = null;
        this.page = null;
        this.httpMocks = {};
    }

    async host(hostUrl) {
        this.hostUrl = Store.sanitize(hostUrl);
        this.browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--headless=false',
                
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
            ignoreHTTPSErrors: true
        });

        this.page = await this.browser.newPage();
        let self = this;
        await this.page.on('request', request => {
            const requestKey = `${request.method()}_${request.url()}`;
            if (self.httpMocks.hasOwnProperty(requestKey)) {
                let mockData = self.httpMocks[requestKey];

                if (mockData.body) {
                    request.respond({
                        status: mockData.status,
                        contentType: 'application/json',
                        body: JSON.stringify(mockData.body)
                    });
                } else {
                    // image
                    let imageBuffer = self.generateImage(mockData.image);
                    request.respond({
                        status: mockData.status,
                        contentType: 'application/octet-stream',
                        body: imageBuffer
                    });

                }

            }
            else {
                request.continue();
            }
        });
    }

    rgb(color) {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        color = color.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        return result ? {
            red: parseInt(result[1], 16),
            green: parseInt(result[2], 16),
            blue: parseInt(result[3], 16)
        } : null;
    }

    generateImage(image) {
        const jpeg = require('jpeg-js');
        let frameData = Buffer.alloc(image.width * image.height * 4);
        let i = 0;
        while (i < frameData.length) {
            frameData[i++] = this.rgb(image.background).red;
            frameData[i++] = this.rgb(image.background).green;
            frameData[i++] = this.rgb(image.background).blue;
            frameData[i++] = 0xFF;
        }
        const rawImageData = {
            data: frameData,
            width: image.width,
            height: image.height
        };
        return jpeg.encode(rawImageData, 50).data;
    }

    async windowSize(width, height) {
        await this.page.setViewport({
            width,
            height
        });
    }

    async sanitizeWindowSize(options) {
        let [w, h] = Store.sanitize(options).split(',');
        let width = parseInt(w) || 1400;
        let height = parseInt(h) || 800;
        await this.page.setViewport({
            width,
            height
        });
    }

    async emulate(device) {
        const mobileDevice = devices[Store.sanitize(device)] || devices['iPhone X'];
        await this.page.emulate(mobileDevice);
    }

    async switchMode(mode, options) {
        if (Store.sanitize(mode) == 'mobile') {
            await this.emulate(options);
        } else {
            await this.sanitizeWindowSize(options);
        }
    }

    async navigate(urlPath) {
        await this.page.goto(`${this.hostUrl}${Store.sanitize(urlPath)}`, { waitUntil: 'networkidle0' });
    }

    async screenshot(path) {
        await this.page.screenshot({
            path: `${Store.sanitize(path)}.png`,
            fullPage: true
        });
    }

    async type(selector, value) {
        await this.page.focus(Store.sanitize(selector));
        await this.page.keyboard.type(Store.sanitize(value));
    }

    async click(selector) {
        await this.page.click(Store.sanitize(selector));
    }

    async waitUntil() {
        await this.page.waitForNavigation({
            waitUntil: 'networkidle0',
        });
    }

    async waitFor(microseconds) {
        await this.page.waitFor(microseconds);
    }

    async text(selector) {
        const elm = await this.page.$(Store.sanitize(selector));
        const text = await this.page.evaluate(elm => elm.textContent, elm);
        return text;
    }

    async hover(selector) {
        await this.page.hover(Store.sanitize(selector));
        await this.page.waitFor(50);
    }

    async value(selector) {
        const elm = await this.page.$(Store.sanitize(selector));
        const text = await this.page.evaluate(elm => elm.value, elm);
        return text;
    }

    async clearValue(selector) {
        await this.page.$eval(Store.sanitize(selector), el => el.value = '');
    }   

    async reload() {
        await this.page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });
    }

    async mock(data) {
        await this.page.setRequestInterception(true);
        const mockData = Store.sanitizeJson(JSON.parse(data));
        this.httpMocks[`${mockData.method}_${mockData.url}`] = mockData;
    }

    async mockWith(filePath) {
        const target = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(target)) {
            return;
        }

        let mockConfig = fs.readFileSync(target);
        await this.mock(mockConfig);
    }

    async close() {
        await this.page.close();
        await this.browser.close();
    }

}

module.exports.PuppeteerWebBuilder = PuppeteerWebBuilder;
