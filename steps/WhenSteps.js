'use strict';
const { config } = require('chai');
const { When } = require('../custom-steps');


When('I click {string}', async (selector, WebBuilder) => {
    await WebBuilder.click(selector);
}, {
    match : {
        action: 'click',
    },
    vars : [
        { 
            search : 'string', 
            replace : ({selector, selectorType, x, y}) => {
                if (selectorType === 'text') {
                    return `$findText(${selector})`
                } else if (selectorType === 'xpath') {
                    return `$xPath(${selector})`
                } else if (selectorType === 'position') {
                    return `$pos(${x},${y})`
                }

                return selector;

            } 
        },
    ]
});

When('I set file {string} to input {string}', async (filePath, selector, WebBuilder) => {
    await WebBuilder.setFile(selector, filePath);
}, {
    match : {
        action: 'setFile',
    },
    vars : [
        { search : 'string', replace : 'text' },
        { search : 'string', replace : ({selector, selectorType}) => {
            if (selectorType === 'text') {
                return `$findText({selector})`
            } else if (selectorType === 'xpath') {
                return `$xPath({selector})`
            }

            return selector;
        } },
    ]
});

When('I mouse click {int} {int}', async (x, y, WebBuilder) => {
    await WebBuilder.mouseClick(x, y);
}, );

When('I resize the window to {string} x {string}', async (width, height, WebBuilder) => {
    await WebBuilder.windowSize(width, height);
}, {
    match : {
        action: 'resize',
    },
    vars : [
        { search : 'string', replace : 'width' },
        { search : 'string', replace : 'height' },
    ]
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
}, {
    match : {
        action: 'press',
    },
    vars : [
        { search : 'string', replace : 'value' },
    ]
})

When('I type {string} {string}', async (value, selector, WebBuilder) => {
    await WebBuilder.type(selector, value);

}, {
    match : {
        action: 'type',
    },
    vars : [
        { 
            search : 'string', 
            replace : 'text',
        },
        {
            search : 'string',
            replace : ({selector, selectorType }) => {
                
                if (selectorType === 'text') {
                    return `$findText(${selector})`
                } else if (selectorType === 'xpath') {
                    return `$xPath(${selector})`
                }

                return selector;
            }
        },
    ]
});    

When('I select {string} in {string}', async (value, selector, WebBuilder) => {
    await WebBuilder.select(selector, value);
}, {
    match : {
        action: 'select',
    },
    vars : [
        { search : 'string', replace : 'text' },
        {
            search : 'string',
            replace : (config) => {
                if (config.selectorType === 'text') {
                    return `$findText(${config.selector})`
                } else if (config.selectorType === 'xpath') {
                    return `$xPath(${config.selector})`
                }

                return config.selector;
            }
        },
    ]
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