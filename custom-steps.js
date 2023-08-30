'use strict';
const { Given, When, Then, defineParameterType } = require('cucumber');

const ExpressionsStoreage = {
};



const Store = require('./lib/autokin-store');
const {WebBuilder} = require('./lib/web/autokin-web');



const NewGiven = (pattern, fn) =>{
    const fnArgs = fn.toString().match(/\((.*?)\)/)[1].split(',').map(arg => arg.trim());
    if (fnArgs.length === 1 && fnArgs[0] === '') {
        fnArgs.pop();
    }
    let callback = fn;

    if (fnArgs.length > 0) {
        let applyArgsStr = `const args = [];`
        fnArgs.map((arg, index) => {
            applyArgsStr += `args.push(ApplyExpression(${arg}));`
        });
        const callbackStr = `async (${fnArgs.join(',')}) => { ${applyArgsStr} await fn.apply(this, args); }`
        callback = eval(callbackStr);
    }

    Given(pattern, callback);
};

const NewThen = (pattern, fn) => {
    const fnArgs = fn.toString().match(/\((.*?)\)/)[1].split(',').map(arg => arg.trim());
    if (fnArgs.length === 1 && fnArgs[0] === '') {
        fnArgs.pop();
    }
    let callback = fn;

    if (fnArgs.length > 0) {
        let applyArgsStr = `const args = [];`
        fnArgs.map((arg, index) => {
            applyArgsStr += `args.push(ApplyExpression(${arg}));`
        });
        const callbackStr = `async (${fnArgs.join(',')}) => { ${applyArgsStr} await fn.apply(this, args); }`
        callback = eval(callbackStr);
    }
    
    Then(pattern, callback);
};

const NewWhen = (pattern, fn) => {
    const fnArgs = fn.toString().match(/\((.*?)\)/)[1].split(',').map(arg => arg.trim());
    if (fnArgs.length === 1 && fnArgs[0] === '') {
        fnArgs.pop();
    }
    let callback = fn;

    if (fnArgs.length > 0) {
        let applyArgsStr = `const args = [];`
        fnArgs.map((arg, index) => {
            applyArgsStr += `args.push(ApplyExpression(${arg}));`
        });
        const callbackStr = `async (${fnArgs.join(',')}) => { ${applyArgsStr} await fn.apply(this, args); }`
        callback = eval(callbackStr);
    }
    
    When(pattern, callback);
};

const Expression = (pattern, fn) => {
    // example of pattern: $xPath:{string}
    // another example: $fixture:{string}

    
    let variablesStr = pattern.split(':', 2)[1];

    const expression = {
        regex: null,
        variables: [],
        callback: fn,
    }


    if (variablesStr) {
        variablesStr = variablesStr.split(',');
        expression.variables = variablesStr.reduce((result, variable) => {
            variable.split(',').map(v => {
                result.push(v);
            });
            return result;
        }, []); 
    
    }
    
    const regex = pattern.split(':')[0] + ':(.*)' ;
    expression.regex = new RegExp(regex);

    ExpressionsStoreage[pattern] = expression;
}

const ApplyExpression = (pattern) => {
    // example of use in step: Then I should see $xPath:$fixture:file.attribute_name
    const [expressionName, ...variables] = pattern.split(':', 2);
    
    const expressionKey = Object.keys(ExpressionsStoreage).find(key => {
        return key.split(':')[0] === expressionName;
    });
    
    const contaisExpression = pattern.lastIndexOf('$') > 0;
    if (contaisExpression) {
        const newPattern =  pattern;
        console.log('newPattern', newPattern);
        pattern = newPattern.match(/(\$[a-zA-Z0-9:,.]+)/g).reduce((result, match) => {
            const expression = ApplyExpression(match);
            console.log('match', match, expression);
    
            result = result.replace(match, expression);
            return result;
        }, pattern);
        console.log('pattern', pattern);
        return ApplyExpression(pattern);
    } else if (expressionKey) {
        console.log('expressionName', pattern);    
        const expression = ExpressionsStoreage[expressionKey];

        const result = expression.callback(...variables);
        if (result) {
            return ApplyExpression(result);
        }
    }
    
    return pattern;
}

const parsePattern = (pattern) => {
    return pattern.split(' ').map(part => {
        return ApplyExpression(part);
    }).join(' ');
}


Expression('$fixture:{string}', (fixture) => {
    // example of fixture value: name_of_fixture_file.attribute_name
    // another example: name_of_fixture_file.attribute_name,another_attribute_name
    
    const [fixtureName, ...attributes] = fixture.split('.');
    let value = Store.storage[fixtureName];
    if (!value) {
        try {
        const fixtureFile = require('./fixtures/' + fixtureName + '.json');
        Store.set(fixtureName, fixtureFile);
        value = fixtureFile
        } catch (e) {
            console.log('Fixture file not found', fixtureName);
        }
    }

    return attributes.reduce((result, attribute) => {
        return result[attribute];
    }, value);
})

    

module.exports = {
    Given : NewGiven,
    When : NewWhen,
    Then : NewThen,
    Expression : Expression,
    ApplyExpression : ApplyExpression,
    Store : Store,
    WebBuilder : WebBuilder
}