'use strict';
const { defineParameterType } = require('cucumber');
const { Given, When, Then, Expression, Store, WebBuilder, ApplyExpression } = require('./custom-steps');

/**
 *  const app = require('./container');	
 *  Expression('$randomString', () => {
 *      return Math.random().toString(36).substring(7);
 *  })
 * 
 *  Given('I set $randomString to input element with {string} selector', async (value, selector) => {
 *      const WebBuilder = app.get('WebBuilder');
 *  })
 * 
* */


Expression('$generator:{type}', (type) => {
    console.log(type);
})

Expression('$not:{string}', (value) => {
    return `not ${value}`;
});

Expression('$xPath:{string}', (value) => {
    return `xpath ${value}`;
});

const openPage = async (url) => {
    await WebBuilder.host(url);
    await WebBuilder.page.goto(url);

};

Given('I on page {string}', async (page) => {
    await openPage(page);   
});

Given('I open page {string}', async (page) => {
    await openPage(page);
});

Given('I open {string}', async (page) => {
    await openPage(page);
});

Given('I navigate to {string}', async (page) => {
    await openPage(page);
});

Given('I navigate {string}', async (page) => {
    await WebBuilder.page.goto(page);
});


Given('I mock response {string}', async (selector) => {
    const [method, url, value] = selector.split(',');
    await WebBuilder.mock({
        method,
        url,
        value,
    });
})

Given('I use the session {string}', async (sessionName) => {
    const fs = require('fs');
    try {
        const json = JSON.parse(fs.readFileSync(`./sessions/${sessionName}.json`));
        Object.keys(json).forEach(key => {
            Store.set(sessionName + ':'+key, json[key]);
        });

        console.log('json', json);
    } catch (error) {
        console.log('error', error);
    }


    await WebBuilder.restoreSession(sessionName);
});


When('I click {string}', async (selector) => {
    const xpath = selector.startsWith('xpath');
    selector = xpath ? selector.split('xpath ')[1] : selector;
    await WebBuilder.click(selector, xpath);
    
});

When('I press {string}', async (value) => {
    await WebBuilder.page.keyboard.press(value);
})

When('I type {string} {string}', async (value, selector) => {
    await WebBuilder.type(selector, value);

});    

When('I wait for networkidle0', async () => {
    await WebBuilder.page.waitForNavigation({
        waitUntil: 'networkidle0',
    });
});

Then('I store the session {string}', async (sessionName) => {
    const json = await WebBuilder.storeSession(sessionName)

    const fs = require('fs');
    fs.writeFileSync(`./sessions/${sessionName}.json`, JSON.stringify(json));
});

Then('I store the html {string}', async (path) => {
    const html = await WebBuilder.page.content();
    const fs = require('fs');

    fs.writeFileSync(path + '.html', html);
});
Then('I wait for element {string}', async (selector) => {
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

Then('I take screenshot {string}', async (path) => {
    console.log('path', path);
    await WebBuilder.screenshot(path);
});

Then('I should see text {string}', async (selector) => {

    const xpath = "//*[contains(text(), '" + selector + "')]"
    const exists = await WebBuilder.exists(xpath, true);

    if (!exists) {
        throw new Error(`Expected to see ${selector} but it does not exists`);
    }
    
});

Then('I should see {string}', async (selector) => {
    const xpath = selector.startsWith('xpath');
    selector = xpath ? selector.split('xpath ')[1] : selector;

    console.log('selector', selector, xpath);
    const exists = await WebBuilder.exists(selector, xpath);
    
    await WebBuilder.screenshot('test');
    if (!exists) {
        throw new Error(`Expected to see ${selector} but it does not exists`);
    }
    
});

Then('I should be on {string}', async (url) => {
    const currentUrl = await WebBuilder.page.url();
    if (currentUrl !== url) {
        throw new Error(`Expected to be on ${url} but it is on ${currentUrl}`);
    }
});


Then('I should not see {string}', async (selector) => {
    const xpath = selector.startsWith('xpath');
    selector = xpath ? selector.split('xpath ')[1] : selector;

    console.log('selector', selector, xpath);
    const exists = await WebBuilder.exists(selector, xpath);
    
    
    if (exists) {
        throw new Error(`Expected to not see ${selector} but it exists`);
    }
    
});

