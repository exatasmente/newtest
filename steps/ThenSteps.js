'use strict';
const { Then } = require('../custom-steps');

Then('I expect content {string} is visible', async (selector, WebBuilder) => {

});

Then('I expect content {string} is not visible', async (selector, WebBuilder) => {

});

Then('I expect content {string} exists', async (selector, WebBuilder) => {

});

Then('I expect content {string} not exist', async (selector, WebBuilder) => {

});

Then('I expect content {string} equals to {string}', async (selector,value, WebBuilder) => {
});

Then('I expect content {string} contains {string}', async (selector,value, WebBuilder) => {
});

Then('I expect content {string} not contains {string}', async (selector,value, WebBuilder) => {

});

Then('I expect request {string} to {string}', async (method, url, WebBuilder) => {

});

Then('I expect response {string} to {string} with status code {string}', async (method, url, status, WebBuilder) => {
    const ok = await WebBuilder.waitForResponse({
        method,
        url,
        status,
    });

    if (!ok) {
        throw new Error(`Expected response ${method} ${url} with status code ${statusCode} but it was not found`);
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


Then('I wait for content {string}', async (selector, WebBuilder) => {
    await (new  Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            const exists = await WebBuilder.exists(selector);
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

Then('I take a screenshot {string}', async (path, WebBuilder) => {
    await WebBuilder.screenshot(path);
});

Then('I take a fullscreenshot {string}', async (path, WebBuilder) => {
    await WebBuilder.screenshot({
        fullPage: true,
        path,
    });
});

Then('I should see text {string}', async (selector, WebBuilder) => {

    const xpath = "//*[contains(text(), '" + selector + "')]"
    const exists = await WebBuilder.exists(xpath, true);

    if (!exists) {
        throw new Error(`Expected to see ${selector} but it does not exists`);
    }
    
});

Then('I expect {string} exists', async (selector, WebBuilder) => {
    const exists = await WebBuilder.exists(selector);
    
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

Then('I expect {string} is visible', async (selector, WebBuilder) => {
    const result = await WebBuilder.page.$eval(selector, el => {
        const computedStyle = window.getComputedStyle(el);
        return computedStyle && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';
    }, selector);

    if (!result) {
        throw new Error(`Expected ${selector} to be visible`);
    }



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