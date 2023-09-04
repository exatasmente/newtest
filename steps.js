'use strict';

const { Given, When, Then, Expression, App } = require('./custom-steps');

Expression('$not:{string}', (value) => {
    return `not ${value}`;
});

Expression('$xPath:{string}', async (xpath, Page) => {
    const id = await Page.evaluate(xpath => {
        function getElementByXpath(path) {
            return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        }
        
        const element = getElementByXpath(xpath);
        
        if (!element) {
            return null;
        }

        let id = element.getAttribute('data-autokin');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            element.setAttribute('data-autokin', id);
        }

        return id;
    }, xpath);

    if (!id) {
        throw new Error(`Element with xpath ${xpath} does not exists`);
    }

    return `[data-autokin="${id}"]`

}, ';');

Expression('$getElAttr:{selector};{attribute}', async (selector, attribute, WebBuilder) => {

   if (WebBuilder.scrollToInteract) {
         await WebBuilder.scrollTo(selector);
   }
   
   let value = await WebBuilder.page.$eval(selector, async (el, attribute) => {
        return attribute.split('.').reduce((el,attr) => { 
            if (el[attr] !== undefined) {
                el = el[attr];
            } else if (el.getAttribute) {
                el = el.getAttribute(attr);
            } 

            return el
        }, el);
        
    }, attribute);
    
    return value;
    
}, ';');

const openPage = async (url, WebBuilder) => {
    await WebBuilder.host(url);
    await WebBuilder.page.goto(url);

};

Given('I on page {string}', async (page, WebBuilder) => {
    await openPage(page, WebBuilder);   
});

Given('I emulate device {string}', async (device, WebBuilder) => {
    await WebBuilder.emulate(device);
});

Given('I set the config {string} to {string}', async (setting, value, WebBuilder) => {
    WebBuilder.setConfig(setting, value);
});

Given('I use the config file {string}', async (configFile, WebBuilder) => {
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync(configFile));
    WebBuilder.setConfigs(config);
});

Given('I use the config', async (config, WebBuilder) => {
    WebBuilder.setConfigs(JSON.parse(config));
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

Given('I define the variables', async (variables, Store) => {
    const vars = JSON.parse(variables);
    Object.keys(vars).forEach(key => {
        Store.set(key, vars[key]);
    });
    
})


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

When('I wait until {string}', async (expression) => {
    await expression;
})


When('I click {string}', async (selector, WebBuilder) => {
    await WebBuilder.click(selector);
});

When('I mouse click {int} {int}', async (x, y, WebBuilder) => {
    await WebBuilder.mouseClick(x, y);
});


When('I click document {string}', async (selector, WebBuilder) => {
    await WebBuilder.clickThruDocument(selector);
});

When('I setTimeout of {int} secs', async (seconds) => {
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
})

When('I setTimeout of {int} ms', async (ms) => {
    await new Promise(resolve => setTimeout(resolve, ms));
})

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

When('I wait for response', async (json, WebBuilder) => {
    const response = await WebBuilder.waitForResponse(json);

    if (!response) {
        throw new Error(`Response ${json} not found`);
    }


});


Then('I save the video {string}', async (path, WebBuilder) => {
    await WebBuilder.saveVideo(path);
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

Then('I expect {string} be empty', async (string) => {
    if (string) {
        throw new Error(`Expected ${string} to be empty`);
    }
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

Then('I expect to {string} be visible', async (selector, WebBuilder) => {

});

Then('I expect to {string} be hidden', async (selector, WebBuilder) => {
});


Then('I expect {string} to be {string}', async (a, b) => {
    if (a !== b) {
        throw new Error(`Expected ${a} to be ${b}`);
    }
});

Then('I expect {string} to be eq {string}', async (a, b) => {
    if (a !== b) {
        throw new Error(`Expected ${a} to be ${b}`);
    }
});

Then('I expect {string} contains {string}', async (a, b) => {
    if (!a.includes(b)) {
        throw new Error(`Expected ${a} to contains ${b}`);
    }
});


Then('I expect {string} to not be {string}', async (a, b) => {
    if (a === b) {
        throw new Error(`Expected ${a} to not be ${b}`);
    }
});

Then('I expect {string} to not be eq {string}', async (a, b) => {
    if (a === b) {
        throw new Error(`Expected ${a} to not be ${b}`);
    }
});

Then('I expect {string} to be greater than {string}', async (a, b) => {
    if (a <= b) {
        throw new Error(`Expected ${a} to be greater than ${b}`);
    }
})

Then('I expect {string} to be gt {string}', async (a, b) => {
    if (a <= b) {
        throw new Error(`Expected ${a} to be greater than ${b}`);
    }
})

Then('I expect {string} to be less than {string}', async (a, b) => {
    if (a >= b) {
        throw new Error(`Expected ${a} to be less than ${b}`);
    }
})

Then('I expect {string} to be lt {string}', async (a, b) => {
    if (a >= b) {
        throw new Error(`Expected ${a} to be less than ${b}`);
    }
})

Then('I expect {string} to be greater than or equal to {string}', async (a, b) => {
    if (a < b) {
        throw new Error(`Expected ${a} to be greater than or equal to ${b}`);
    }
})

Then('I expect {string} to be gte to {string}', async (a, b) => {
    if (a < b) {
        throw new Error(`Expected ${a} to be greater than or equal to ${b}`);
    }
})

Then('I expect {string} to be less than or equal to {string}', async (a, b) => {
    if (a > b) {
        throw new Error(`Expected ${a} to be less than or equal to ${b}`);
    }
})

Then('I expect {string} to be lte to {string}', async (a, b) => {
    if (a > b) {
        throw new Error(`Expected ${a} to be less than or equal to ${b}`);
    }
})