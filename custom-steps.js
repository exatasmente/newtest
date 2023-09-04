'use strict';
const { Given, When, Then } = require('cucumber');

const ExpressionsStoreage = {
};

const FunctionsStorage = {
};



const Store = require('./lib/autokin-store');
const {WebBuilder} = require('./lib/web/autokin-web');

class DependencyInjectionContainer {
    constructor(callback = null) {
        this.container = {};
        this.set('AppContainer', this);
    
        if (callback) {
            callback(this);
        }
    }

    set(name, instance) {
        this.container[name] = instance;
    }

    singleton(name, instance) {
        this.container[name] = instance;
    }

    has(name) {
        return this.container[name] !== undefined;
    }

    get(name) {
        if (!this.has(name)) {
            throw new Error(`Dependency ${name} not found`);
        }

        const value = this.container[name];

        if (typeof value === 'function') {
            return value();
        }

        return value;
    }

    setConfig(name, value) {
        this.container[name] = value;
    }
}

const app = new DependencyInjectionContainer((appContainer) => {
    
    appContainer.set('WebBuilder',() => WebBuilder);
    appContainer.set('Store', () => Store);
    appContainer.set('Page', () => appContainer.get('WebBuilder').page);
})

const dependencyInjectionCallback = (fn) => {
    const fnArgs = fn.toString().match(/\((.*?)\)/)[1].split(',').map(arg => arg.trim());
    if (fnArgs.length === 1 && fnArgs[0] === '') {
        fnArgs.pop();
    }
    let callback = fn;

    if (fnArgs.length > 0) {
        let applyArgsStr = `const args = [];`
        let newArgs = [];
        fnArgs.map((arg, index) => {
            if (app.has(arg)) {
                applyArgsStr += `args.push(app.get('${arg}'));`
            } else {
                applyArgsStr += `args.push(await ApplyExpression(${arg}));`
                newArgs.push(`${arg}`);
            }
        });
        const callbackStr = `async (${newArgs.join(',')}) => { ${applyArgsStr} await fn.apply(this, args); }`
        callback = eval(callbackStr);
    }

    return callback;

}

const NewGiven = (pattern, fn) =>{
    const callback = dependencyInjectionCallback(fn);
    Given(pattern, callback);
};

const NewThen = (pattern, fn) => {
    const callback = dependencyInjectionCallback(fn);
    Then(pattern, callback);
};

const NewWhen = (pattern, fn) => {
    const callback = dependencyInjectionCallback(fn);
    When(pattern, callback);
};

const Expression = (pattern, fn, attributeSeparator = ',', handleExpressionArg = false) => {
    // example of pattern: $xPath:{string}
    // another example: $fixture:{string}

    
    let variablesStr = pattern.split(':', 2)[1];

    const expression = {
        regex: null,
        variables: [],
        callback: fn,
        attributeSeparator: attributeSeparator,
        handleExpressionArg: handleExpressionArg,
    }


    if (variablesStr) {
        variablesStr = variablesStr.split(attributeSeparator).map(v => v.trim());
        expression.variables = variablesStr.reduce((result, variable) => {
            variable.split(attributeSeparator).map(v => {
                result.push(v);
            });
            return result;
        }, []); 
    
    }
    
    const regex = pattern.split(':')[0] + ':(.*)' ;
    expression.regex = new RegExp(regex);

    ExpressionsStoreage[pattern] = expression;
}

const VarsStorage = {
};

const generateTempVarName = () => {
    return '@tempVar:' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const removeExtraParenthesis = (expression, maxLoops = 100) => {
    if (maxLoops === 0) {
        throw new Error('Max loops reached');
    }
    const openParenthesisCount = (expression.match(/\(/g) || []).length;
    const closeParenthesisCount = (expression.match(/\)/g) || []).length;
    if (openParenthesisCount === closeParenthesisCount) {
        return expression;
    }

    if (openParenthesisCount < closeParenthesisCount) {
        expression = expression.substring(0, expression.lastIndexOf(')'))
    }


    return removeExtraParenthesis(expression, maxLoops - 1);

}

const extractVariables = (pattern, expression) => {
    // example of pattern: $mask(##/08/####,$regexReplace(digits-only,($getElAttr(#dia-topo;innerText))))'
    // variables have parenthesis, so we need to extract them following the parenthesis rules
    // the result of this function should be: ['##/08/####', '$regexReplace(digits-only,($getElAttr(#dia-topo;innerText)))']

    const variables = [];
    let variable = '';
    let parenthesisCount = 0;
    let lastChar = '';
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (char === '(') {
            parenthesisCount++;
        }

        if (char === ')') {
            parenthesisCount--;
        }

        if (char === expression.attributeSeparator && parenthesisCount === 0) {
            variables.push(variable);
            variable = '';
            continue;
        }

        variable += char;
        lastChar = char;
    }

    if (variable !== '') {
        variables.push(variable);
    }

    return variables;
    
}
const ApplyExpression = async (pattern, maxLoops = 100) => {
    if (maxLoops === 0) {
        throw new Error('Max loops reached ' + pattern);
    }
    //example of pattern: $mask(##/08/####,$regexReplace(digits-only,($getElAttr(#dia-topo;innerText))))
    // must resolve the inner expression first, uing the following steps:
    // get the most inner expression 
    
    if (!pattern || !pattern.split || pattern.startsWith('$') === false) {
        return pattern;
    }
    
    const expressionName = pattern.substring(0, pattern.indexOf('('));
    const variablesStr = pattern.substring(pattern.indexOf('(') + 1, pattern.lastIndexOf(')'));
    const expressionKey = Object.keys(ExpressionsStoreage).find(key => {
        return key.split(':')[0] === expressionName;
    });
    
    

    if (!expressionKey) {
        return pattern;
    }


    const expression = ExpressionsStoreage[expressionKey];

    if (!expression.handleExpressionArg && pattern.lastIndexOf('$') > 0) {
        const newPattern = pattern.substring(pattern.indexOf('(') + 1, pattern.lastIndexOf(')'));
        const lastIndexOfDollar = newPattern.lastIndexOf('$');
        const lastIndexOfParenthesis = newPattern.lastIndexOf(')');
        let innerExpression = newPattern.substring(lastIndexOfDollar, lastIndexOfParenthesis + 1);
        
        innerExpression = removeExtraParenthesis(innerExpression);

        if (!innerExpression.endsWith(')')) {
            innerExpression = innerExpression.substring(0, innerExpression.lastIndexOf(')') + 1);
        }

        const innerExpressionResult = await ApplyExpression(innerExpression, maxLoops - 1);
    
            if (typeof innerExpressionResult !== 'string') {
            const tempVarName = generateTempVarName();
            VarsStorage[tempVarName] = innerExpressionResult;
            pattern = pattern.replace(innerExpression, tempVarName);
        } else {
            pattern = pattern.replace(innerExpression, innerExpressionResult);
        }

        return await ApplyExpression(pattern, maxLoops - 1);
    }
    
    let  variables = extractVariables(variablesStr, expression);
    const callbackVariables = expression.callback.toString().match(/\((.*?)\)/)[1].split(',').map(arg => arg.trim());

    callbackVariables.map((variable, index) => {
        if (app.has(variable)) {
            variables.push(app.get(variable));
        }
    });

    variables = variables.map((variable) => {
        if (VarsStorage[variable]) {
            return VarsStorage[variable];
        }

        return variable;
    });

    const result = await expression.callback(...variables);
    return await ApplyExpression(result, maxLoops - 1);
    
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
            throw new Error(`Fixture ${fixtureName} not found`);
        }
    }

    return attributes.reduce((result, attribute) => {
        return result[attribute];
    }, value);
})

Expression('$upper:{string}', (value) => {
    return value.toUpperCase();
})

Expression('$lower:{string}', (value) => {
    return value.toLowerCase();
})

Expression('$mask:{mask};{value}', (mask, value) => {

    const maskChars = mask.split('');
    const valueChars = value.split('');
    let result = '';
    let valueIndex = 0;
    for (let i = 0; i < maskChars.length; i++) {
        if (maskChars[i] === '#') {
            result += valueChars[valueIndex];
            valueIndex++;
        } else {
            result += maskChars[i];
        }
    }

    return result;

}, ';')

Expression('$asString:{value}', (value) => {
    return value.toString();
})

Expression('$str:{value};{action};{options}', (value, action, options) => {
    if (action === 'replace') {
        const [search, replace] = options.split(',');
        return value.replace(search, replace);
    }

    if (action === 'split') {
        const [separator, index] = options.split(',');
        return value.split(separator)[index];
    }

    if (action === 'trim') {
        return value.trim();
    }

    if (action === 'substr') {
        const [start, end] = options.split(',');
        return value.substr(start, end);
    }

    if (action === 'substring') {
        const [start, end] = options.split(',');
        return value.substring(start, end);
    }

    if (action === 'length') {
        return value.length;
    }

    if (action === 'concat') {
        const [str1, str2] = options.split(',');
        return str1 + value + str2;
    }

    if (action === 'startsWith') {
        return value.startsWith(options);
    }

    if (action === 'endsWith') {
        return value.endsWith(options);
    }

    if (action === 'includes') {
        return value.includes(options);
    }

    if (action == 'contains') {
        console.log('contains', value, options);
        return value.includes(options);
    }

    if (action === 'manipulate') {
        const [manipulation, ...args] = options.split(',');
        return value[manipulation](...args);
    }
}, ';')

Expression('$regexReplace:{regex};{value}', (regex, value) => {
    if (!value) {
        return value;
    }

    if (regex === 'digits-only') {
        return value.replace(/\D/g, '');
    }

    const regexParts = regex.split('/');
    const regexPattern = regexParts[1];
    const regexFlags = regexParts[2];
    const regexObj = new RegExp(regexPattern, regexFlags);
    return value.replace(regexObj, '');
}, ';')

Expression('$regexMatch:{regex},{value}', (regex, value) => {
    const regexParts = regex.split('/');
    const regexPattern = regexParts[1];
    const regexFlags = regexParts[2];
    const regexObj = new RegExp(regexPattern, regexFlags);
    return value.match(regexObj);
})

Expression('$log:{value}', (value) => {
    console.log(`\n ---------- \n ${value} \n ---------- \n`);
    return value;
})

Expression('$call:{object};{attribute}', async (object, fn) => {
    if (typeof object[fn] === 'function') {
        return await object[fn]();
    }

    return object[fn];
}, ';')

Expression('$concat:{string},{string}', (a, b) => {
    return a + b;
}, ';')


Expression('$get:{attribute}', (attribute) => {
    return Store.get(attribute);
})

Expression('$set:{attribute};{value}', (attribute, value) => {
    Store.set(attribute, value);
    return value;
}, ';')


Expression('$wait:{expression};{timeout}', async (expression, timeout) => {
  

    return new Promise(async(resolve, reject) => {
        const interval = setInterval( async () => {
            const value = await ApplyExpression(expression)
            console.log('value', value, expression);
            if (value) {
                clearInterval(interval);
                resolve(value);
            }
        }, 1000);

        setTimeout(() => {
            clearInterval(interval);
            reject(new Error(`Timeout reached for expression ${expression}`));
        }, timeout);
    });
}, ';', true)


Expression('$date:{string}', (value) => {
    if (value === 'now') {
        return new Date();
    }

    value = parseInt(value);
    
    return new Date(value);
})


Expression('$obj:{json}', (json) => {
    return JSON.parse(json);
})



Expression('$dateTimestamp:{string}', (value) => {
    return new Date(value).getTime();
})

module.exports = {
    Given : NewGiven,
    When : NewWhen,
    Then : NewThen,
    Expression : Expression,
    App : app,
}