'use strict';
const { Then } = require('../custom-steps');
const { expressionsFactory, varsBuilder } = require('../gherkinBuilder');



const waitFor = async (callback, timeoutMs) => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject();
        }, timeoutMs);

        const interval = setInterval(async () => {
            const result = await callback();
            if (result) {
                clearTimeout(timeout);
                clearInterval(interval);
                resolve(result);
            }
        }, 500);

    
    })

}


const replaceContentHandler = ({showAttribute, attributeValue, selectorType, selector}) => {
    let expression = null
    if (selectorType === 'text') {
        expression = `$findText`
    } else if (selectorType === 'xpath') {
        expression = `$xPath`
    }

    if (expression) {
        expression = expressionsFactory()
            .make(expression, [selector])
    }

    expression = expression ?? '{selector}'
    
    if (showAttribute && attributeValue) {     
        
        expression = expressionsFactory()
            .make('$getElAttr', [expression , attributeValue])
    }

    return expression
    
}

const replaceContentTimeoutHandler = (config) => {
    let expression = null
    let timeout = config.timeout
    timeout = parseInt(timeout) ?? 15000

    expression = replaceContentHandler(config)
    
    return expression !== '{selector}'
    ?  `$wait(${expression};${timeout})`
    : `$elementValue({selector};${timeout})`
    
}


Then('I expect request {string} to {string}', async (method, url, WebBuilder) => {
    Promise.resolve(setTimeout(async () => {
        const ok = await WebBuilder.listenRequest({
            method,
            url,

        });

        if (!ok) {
            throw new Error(`Expected request ${method} ${url} but it was not found`);
        }
    }, 30000));
}, {
    match : {action : 'assert', actionType : 'request'},
    vars : [
        { search : 'string', replace : 'method' },
        { search : 'string', replace : 'url' },
    ]

});

Then('I wait request {string} to {string} or timeout {int}', async (method, url, timeout, WebBuilder) => {
    Promise.resolve(setTimeout(async () => {
        const ok = await WebBuilder.listenRequest({
            method,
            url,

        });

        if (!ok) {
            throw new Error(`Expected request ${method} ${url} but it was not found`);
        }
    }, timeout ?? 30000));
}, {
    match : {action : 'wait', actionType : 'request'},
    vars : [
        { search : 'string', replace : 'method' },
        { search : 'string', replace : 'url' },
        { search : 'string', replace : ({timeout}) => timeout ?? '15000' },
    ]

});

Then('I expect response {string} to {string} with status code {string}', async (method, url, status, WebBuilder) => {
    const ok = await WebBuilder.waitForResponse(JSON.stringify({
        method,
        url,
        status,
    }));

    if (!ok) {
        throw new Error(`Expected response ${method} ${url} with status code ${statusCode} but it was not found`);
    }

}, {
    match : {action : 'assert', actionType : 'response'},
    vars : [
        { search : 'string', replace : 'method' },
        { search : 'string', replace : 'url' },
        { search : 'string', replace : 'statuscode' },
    ]
});


Then('I wait for response {string} to {string} with status code {string} or timeout {int} ms', async (method, url, status, timeout, WebBuilder) => {
    const ok = await WebBuilder.waitForResponse(JSON.stringify({
        method,
        url,
        status,
    }));

    if (!ok) {
        throw new Error(`Expected response ${method} ${url} with status code ${statusCode} but it was not found`);
    }

}, {
    match : {action : 'wait', actionType : 'response'},
    vars : [
        { search : 'string', replace : 'method' },
        { search : 'string', replace : 'url' },
        { search : 'string', replace : 'statuscode' },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
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

Then('I take a screenshot {string}', async (path, WebBuilder) => {
    await WebBuilder.screenshot(path);
}, {
    match : {action : 'screenshot'},
    vars : [
        { search : 'string', replace : 'path' },
    ]
});

Then('I expect {string} exists', async (selector, WebBuilder) => {
    const exists =  await waitFor( () => {
        return WebBuilder.exists(selector);
    }, 15000);

    if (!exists) {
        throw new Error(`Expected to see ${selector} but it does not exists`);
    }
    
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'exists'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        }
    ]
});

Then('I expect {string} not exists', async (selector, WebBuilder) => {
    const exists =  await waitFor( () => {
        return WebBuilder.exists(selector) === false;
    }, 15000);
    
    if (!exists) {
        throw new Error(`Expected to see ${selector} but it does not exists`);
    }
    
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'not-exists'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        }
    ]
});

Then('I should be on {string}', async (url, WebBuilder) => {
    const currentUrl = await WebBuilder.page.url();
    if (currentUrl !== url) {
        throw new Error(`Expected to be on ${url} but it is on ${currentUrl}`);
    }
}, {
    match : {action : 'assert', actionType : 'browser'}, 
    vars : [
        { search : 'string', replace : 'url' },
    ]
});


Then('I should not see {string}', async (selector, WebBuilder) => {
    const xpath = selector.startsWith('xpath');
    selector = xpath ? selector.split('xpath ')[1] : selector;
    const exists = await WebBuilder.exists(selector, xpath);
    
    
    if (exists) {
        throw new Error(`Expected to not see ${selector} but it exists`);
    }
    
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'not-exists'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        }
    ]
});
Then('I expect {string} is visible', async (selector, WebBuilder) => {
    const result = await waitFor(async () => {
        return await WebBuilder.page.$eval(selector, el => {
            if (!el) {
                return false;
            }

            const computedStyle = window.getComputedStyle(el);
            return computedStyle && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';
        }, selector);

    }, 15000);

    if (!result) {
        throw new Error(`Expected ${selector} to be visible`);
    }

}, {
    match : {action : 'assert', actionType : 'content', assertType : 'visible'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        }
    ]
});

Then('I expect {string} is not visible', async (selector, WebBuilder) => {
    const result = await waitFor(async () => {
        return await WebBuilder.page.$eval(selector, el => {
            if (!el) {
                return true;
            }

            const computedStyle = window.getComputedStyle(el);
            return computedStyle && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';
        }, selector) === false;

    }, 15000);

    if (!result) {
        throw new Error(`Expected ${selector} to be not visible`);
    }

},{
    match : {action : 'assert', actionType : 'content', assertType : 'not-visible'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        }
    ]
});

Then('I expect {string} equals to {string}', async (a, b) => {
    if (a !== b) {
        throw new Error(`Expected ${a} to be ${b}`);
    }
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'equals'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        },
        { search : 'string', replace : 'value' },
    ]
});

Then('I expect {string} contains {string}', async (a, b) => {
    if (!a.includes(b)) {
        throw new Error(`Expected ${a} to contains ${b}`);
    }
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'contains'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        },
        { search : 'string', replace : 'value' },
    ]
});

Then('I expect {string} not contains {string}', async (a, b) => {
    if (a.includes(b)) {
        throw new Error(`Expected ${a} to not contains ${b}`);
    }
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'not-contains'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        },
        { search : 'string', replace : 'value' },
    ]
});

Then('I expect {string} to not be eq {string}', async (a, b) => {
    if (a === b) {
        throw new Error(`Expected ${a} to not be ${b}`);
    }
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'not-equals'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        },
        { search : 'string', replace : 'value' },
    ]
});

Then('I expect {string} to be greater than {string}', async (a, b) => {
    if (a <= b) {
        throw new Error(`Expected ${a} to be greater than ${b}`);
    }
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'gt'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        },
        { search : 'string', replace : 'value' },
    ]
    
})

Then('I expect {string} to be less than {string}', async (a, b) => {
    if (a >= b) {
        throw new Error(`Expected ${a} to be less than ${b}`);
    }
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'lt'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        },
        { search : 'string', replace : 'value' },
    ]
})

Then('I expect {string} to be greater than or equal to {string}', async (a, b) => {
    if (a < b) {
        throw new Error(`Expected ${a} to be greater than or equal to ${b}`);
    }
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'gte'},
    vars : [
        {
            search : 'string',
            replace : replaceContentHandler
        },
        { search : 'string', replace : 'value' },
    ]
})

Then('I expect {string} to be less than or equal to {string}', async (a, b) => {
    if (a > b) {
        throw new Error(`Expected ${a} to be less than or equal to ${b}`);
    }
}, {
    match : {action : 'assert', actionType : 'content', assertType : 'lte'},
    vars : [
        varsBuilder()
        .search('string')
        .replace(replaceContentHandler)
        .build(),
        { search : 'string', replace : 'value' }
    ]
})


Then('I wait until be on {string} or timeout {int} ms', async (url, WebBuilder) => {
    const currentUrl = await WebBuilder.page.url();
    if (currentUrl !== url) {
        throw new Error(`Expected to be on ${url} but it is on ${currentUrl}`);
    }
}, {
    match : {action : 'assert', actionType : 'browser'}, 
    vars : [
        { search : 'string', replace : 'url' },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
});



Then('I wait until {string} is visible or timeout {int} ms', async (selector,timeout, WebBuilder) => {
    const result = await waitFor(async () => {
        return await WebBuilder.page.$eval(selector, el => {
            if (!el) {
                return false;
            }

            const computedStyle = window.getComputedStyle(el);
            return computedStyle && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';
        }, selector);

    }, timeout ?? 15000);

    if (!result) {
        throw new Error(`Timeout of ${timeout} ms reached, expected ${selector} to be visible but fail`);
    }

}, {
    match : {action : 'wait', actionType : 'content', assertType : 'visible'},
    vars : [
        { search : 'string', replace : replaceContentTimeoutHandler },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
});

Then('I wait until {string} is not visible or timeout {int} ms', async (selector, timeout, WebBuilder) => {
    timeout = parseInt(timeout) ?? 15000
    const result = await waitFor(async () => {
        return await WebBuilder.page.$eval(selector, el => {
            if (!el) {
                return true;
            }

            const computedStyle = window.getComputedStyle(el);
            return computedStyle && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';
        }, selector) === false;

    }, timeout ?? 15000);

    if (!result) {
        throw new Error(`Expected ${selector} to be not visible`);
    }

},{
    match : {action : 'wait', actionType : 'content', assertType : 'not-visible'},
    vars : [
        { search : 'string', replace : replaceContentTimeoutHandler },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
});

Then('I wait {string} contains {string}', async (a, b) => {
    if (!a.includes(b)) {
        throw new Error(`Expected ${a} to contains ${b}`);
    }
}, {
    match : {action : 'wait', actionType : 'content', assertType : 'contains'},
    vars : [
        { search : 'string', replace : replaceContentTimeoutHandler },
        { search : 'string', replace : 'value' },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
});

Then('I wait {string} not contains {string}', async (a, b) => {
    if (a.includes(b)) {
        throw new Error(`Expected ${a} to not contains ${b}`);
    }
}, {
    match : {action : 'wait', actionType : 'content', assertType : 'not-contains'},
    vars : [
        { search : 'string', replace : replaceContentTimeoutHandler },
        { search : 'string', replace : 'value' },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
});


Then('I wait until {string} equals to {string} or timeout {int} ms', async (a, b, timeout) => {
    if (a !== b) {
        throw new Error(`Expected ${a} to be ${b}`);
    }
}, {
    match : {action : 'wait', actionType : 'content', assertType : 'equals'},
    vars : [
        { search : 'string', replace : replaceContentTimeoutHandler },
        { search : 'string', replace : 'value' },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
});


Then('I wait {string} to not be eq {string}', async (a, b) => {
    if (a === b) {
        throw new Error(`Expected ${a} to not be ${b}`);
    }
}, {
    match : {action : 'wait', actionType : 'content', assertType : 'not-equals'},
    vars : [
        { search : 'string', replace : replaceContentTimeoutHandler },
        { search : 'string', replace : 'value' },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
});

Then('I wait {string} to be greater than {string}', async (a, b) => {
    if (a <= b) {
        throw new Error(`Expected ${a} to be greater than ${b}`);
    }
}, {
    match : {action : 'wait', actionType : 'content', assertType : 'lte'},
    vars : [
        { search : 'string', replace : replaceContentTimeoutHandler},
        { search : 'string', replace : 'value' },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
})

Then('I wait {string} to be less than {string}', async (a, b) => {
    if (a >= b) {
        throw new Error(`Expected ${a} to be less than ${b}`);
    }
}, {
    match : {action : 'wait', actionType : 'content', assertType : 'lte'},
    vars : [
        { search : 'string', replace : replaceContentTimeoutHandler },
        { search : 'string', replace : 'value' },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
})

Then('I wait {string} to be greater than or equal to {string}', async (a, b) => {
    if (a < b) {
        throw new Error(`Expected ${a} to be greater than or equal to ${b}`);
    }
}, {
    match : {action : 'wait', actionType : 'content', assertType : 'lte'},
    vars : [
        { search : 'string', replace : replaceContentTimeoutHandler },
        { search : 'string', replace : 'value' },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
})

Then('I wait {string} to be less than or equal to {string} until {int} ms', async (a, b) => {
    if (a > b) {
        throw new Error(`Expected ${a} to be less than or equal to ${b}`);
    }
}, {
    match : {action : 'wait', actionType : 'content', assertType : 'lte'},
    vars : [
        { search : 'string', replace : replaceContentTimeoutHandler },
        { search : 'string', replace : 'value' },
        { search : 'string', replace : ({timeout}) => timeout ?? 15000 },
    ]
})