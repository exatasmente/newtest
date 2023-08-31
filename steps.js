'use strict';

const { Given, When, Then, Expression, App } = require('./custom-steps');

Expression('$not:{string}', (value) => {
    return `not ${value}`;
});

Expression('$xPath:{string}', async (xpath, Page) => {

    const ids = await Page.evaluate(xpath => {
        function getElementByXpath(path) {
            return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        }

        const element = getElementByXpath(xpath);
        if (!element) {
            return null;
        }
        const id = Math.random().toString(36).substring(7);
        element.setAttribute('data-autokin', id);

        return id;
    }, xpath);


    return `[data-autokin="${ids}"]`

}, ';');

Expression('$getElAttr:{selector};{attribute}', async (selector, attribute, Page) => {
   const value = await Page.$eval(selector, (el, attribute) => {
        return el[attribute] || el.getAttribute(attribute);
    }, attribute);
    
    if (value === null) {
        throw new Error(`Attribute ${attribute} does not exists on ${selector}`);
    }

    return value;
    
}, ';');

const openPage = async (url, WebBuilder) => {
    await WebBuilder.host(url);
    await WebBuilder.page.goto(url);

};

Given('I on page {string}', async (page, WebBuilder) => {
    await openPage(page, WebBuilder);   
});

Given('I open page {string}', async (page, WebBuilder) => {
    await openPage(page, WebBuilder);
});

Given('I open {string}', async (page, WebBuilder) => {
    await openPage(page, WebBuilder);
});

Given('I navigate to {string}', async (page, WebBuilder) => {
    await openPage(page, WebBuilder);
});

Given('I navigate {string}', async (page, WebBuilder) => {
    await WebBuilder.page.goto(page);
});


Given('I mock response {string}', async (selector, WebBuilder) => {
    const [method, url, value] = selector.split(',');
    await WebBuilder.mock({
        method,
        url,
        value,
    });
})

Given('I use the session {string}', async (sessionName, WebBuilder, Store) => {
    const fs = require('fs');
    try {
        const json = JSON.parse(fs.readFileSync(`./sessions/${sessionName}.json`));
        Object.keys(json).forEach(key => {
            Store.set(sessionName + ':'+key, json[key]);
        });
    } catch (error) {
        throw new Error(`Session ${sessionName} does not exists`);
    }


    await WebBuilder.restoreSession(sessionName);
});


When('I click {string}', async (selector, WebBuilder) => {
    const xpath = selector.startsWith('xpath');
    selector = xpath ? selector.split('xpath ')[1] : selector;
    await WebBuilder.click(selector, xpath);
    
});

When('I press {string}', async (value, WebBuilder) => {
    await WebBuilder.page.keyboard.press(value);
})

When('I type {string} {string}', async (value, selector, WebBuilder) => {
    await WebBuilder.type(selector, value);

});    

When('I select {string} {string}', async (value, selector, WebBuilder) => {
    await WebBuilder.select(selector, value);
});


When('I wait for networkidle0', async (WebBuilder) => {
    await WebBuilder.page.waitForNavigation({
        waitUntil: 'networkidle0',
    });
});

Then('I store the session {string}', async (sessionName, WebBuilder) => {
    const json = await WebBuilder.storeSession(sessionName)

    const fs = require('fs');
    fs.writeFileSync(`./sessions/${sessionName}.json`, JSON.stringify(json));
});

Then('I store the html {string}', async (path, WebBuilder) => {
    const html = await WebBuilder.page.content();
    const fs = require('fs');

    fs.writeFileSync(path + '.html', html);
});
Then('I wait for element {string}', async (selector, WebBuilder) => {
    const xpath = selector.startsWith('xpath');
    selector = xpath ? selector.split('xpath ')[1] : selector;
    await (new  Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            const exists = await WebBuilder.exists(selector, xpath);
            if (exists) {
                resolve();
                clearTimeout(timeout);
                clearInterval(interval);
            }
        }, 500);


        const timeout = setTimeout(() => {
            clearInterval(interval);
            reject();
            throw new Error(`Timeout waiting for ${selector}`);
        }, 10000);
    }));


});

Then('I take screenshot {string}', async (path, WebBuilder) => {
    await WebBuilder.screenshot(path);
});

Then('I should see text {string}', async (selector, WebBuilder) => {

    const xpath = "//*[contains(text(), '" + selector + "')]"
    const exists = await WebBuilder.exists(xpath, true);

    if (!exists) {
        throw new Error(`Expected to see ${selector} but it does not exists`);
    }
    
});

Then('I should see {string}', async (selector, WebBuilder) => {
    const xpath = selector.startsWith('xpath');
    selector = xpath ? selector.split('xpath ')[1] : selector;
    const exists = await WebBuilder.exists(selector, xpath);
    
    await WebBuilder.screenshot('test');
    if (!exists) {
        throw new Error(`Expected to see ${selector} but it does not exists`);
    }
    
});

Then('I should be on {string}', async (url, WebBuilder) => {
    const currentUrl = await WebBuilder.page.url();
    if (currentUrl !== url) {
        throw new Error(`Expected to be on ${url} but it is on ${currentUrl}`);
    }
});


Then('I should not see {string}', async (selector, WebBuilder) => {
    const xpath = selector.startsWith('xpath');
    selector = xpath ? selector.split('xpath ')[1] : selector;
    const exists = await WebBuilder.exists(selector, xpath);
    
    
    if (exists) {
        throw new Error(`Expected to not see ${selector} but it exists`);
    }
    
});

