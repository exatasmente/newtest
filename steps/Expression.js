'use strict'

const { Expression, ApplyExpression, App } = require('../custom-steps');


Expression('$not:{string}', (value) => {
    return `not ${value}`;
});

Expression('$xPath:{string}', async (xpath,WebBuilder) => {
    const exception = false;
    let id = null;
    try {
    id = await WebBuilder.page.evaluate(xpath => {
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
    } catch (e) {
    } finally {
    
        if (!id) {
            if (exception) {
                throw new Error(`Element with xpath ${xpath} does not exists`);
            }

            return '';
        }

        return `[data-autokin="${id}"]`
    }

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


const waitFor = async (callback, timeoutMs) => {
    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            const result = await callback();
            if (result.valid) {
                resolve(result.value);
                clearTimeout(timeout);
                clearInterval(interval);
                
            } else if (result === true) {
                resolve(result);
                clearTimeout(timeout);
                clearInterval(interval);
                
            }
        }, 500);

        const timeout = setTimeout(() => {
            clearInterval(interval);
        
            reject(new Error(`Timeout of ${timeoutMs}ms exceeded`));
        }, timeoutMs);

    })

}

Expression('$wait:{expression};{timeout}', async (expression, timeout) => {

    const result = await waitFor(async () => {
        
        const value = await ApplyExpression(expression);
        return {
            value,
            valid :  value
        }
    }, parseInt(timeout) ?? 15000);



    return result;
}, ';', true)

Expression('$elementValue:{selector}', async (selector, WebBuilder) => {
    const value = await waitFor(async () => {
        const value = await WebBuilder.page.evaluate((selector) => {
            const el = document.querySelector(selector);

            if (!el) {
                return null;
            }
            
            if (el.tagName === 'INPUT') {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    return el.checked;
                }

                return el.value || el.innerText;
            } 
            

            return el.innerText
        }, selector);


        return {
            value,
            valid :  value  !== null
        }
    }, 15000);

    if (!value) {
        throw new Error(`Element with selector ${selector} does not exists`);
    }

    return value
}, ';');


Expression('$findText:{text}', async (text, WebBuilder) => {
    const xpath = "//*[contains(text(), '" + text + "')]";
    const result = await ApplyExpression(`$xPath(${xpath})`)
    
    
    return result
}, ';');