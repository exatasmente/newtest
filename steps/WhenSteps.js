'use strict';
const { When } = require('../custom-steps');


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


When('I clear {string}', async (selector, WebBuilder) => {

});

When('I press {string} {string}', async (key, selector, WebBuilder) => {
    
});