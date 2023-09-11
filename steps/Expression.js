'use strict'

const { Expression, ApplyExpression, App } = require('../custom-steps');


Expression('$not:{string}', (value) => {
    return `not ${value}`;
});

Expression('$xPath:{string},{exception}', async (xpath, exception, Page) => {
    exception = exception === 'true';
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
        if (exception) {
            throw new Error(`Element with xpath ${xpath} does not exists`);
        }

        return '';
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


Expression('$findText:{text}', async (text, WebBuilder) => {
    const xpath = "//*[contains(text(), '" + text + "')]";
    const result = await ApplyExpression(`$wait($xPath(${xpath};false); 10000)`, WebBuilder);
    
    if (!result) {
        throw new Error(`Expected to see ${text} but it does not exists`);
    }

    return result
}, ';');