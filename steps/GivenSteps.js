'use strict';
const { Given } = require('../custom-steps');


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
