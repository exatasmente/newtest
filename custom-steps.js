'use strict';
const { Given, When, Then } = require('cucumber');

const ExpressionsStoreage = {
};

const FunctionsStorage = {
};

const ResolvedExpressions = {
};

const getResolvedExpressionValue = (expression) => {
    if (ResolvedExpressions[expression]) {
        return ResolvedExpressions[expression];
    }
    
    return expression;
}

const setResolvedExpressionValue = (expression, value) => {

        
    if (expression.startsWith('$') === false ) {
        return;
    }   

    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        return 
    }

    ResolvedExpressions[expression] = value;
}


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
        let applyArgsStr = `const args = []; let expValue = '';`
        let newArgs = [];
        fnArgs.map((arg, index) => {
            if (app.has(arg)) {
                applyArgsStr += `args.push(app.get('${arg}'));`
            } else {
                applyArgsStr += `expValue = await ApplyExpression(${arg}); if (expValue !== ${arg}) { setResolvedExpressionValue(${arg}, expValue);} args.push(expValue);`
                newArgs.push(`${arg}`);
            }
        });
        const callbackStr = `async (${newArgs.join(',')}) => { ${applyArgsStr} await fn.apply(this, args); }`
        callback = eval(callbackStr);
    }

    return callback;

}

const registerFunction = (pattern,type, {match, vars, order, id}) => {
    if (!match || !vars) {
        return
    }
    id = id || JSON.stringify(match) + JSON.stringify(vars) + order;

    FunctionsStorage[pattern] = (config) => {
        if (typeof match === 'function') {
            const valid = match(config);
            
            return {valid, vars, order, id, type}
        }

        const matchKeys = Object.keys(match);
        const valid = matchKeys.filter((key) => {
            const value = match[key];
            const configValue = config[key];
            return value === configValue;
        }).length === matchKeys.length;

        return {valid, vars, order, id, type}
    }
}

const NewGiven = (pattern, fn) =>{
    try {
    const callback = dependencyInjectionCallback(fn);
    Given(pattern, callback);
    } catch (e) {
    
    }
};

const NewThen = (pattern, fn) => {
    try {
    const callback = dependencyInjectionCallback(fn);
    Then(pattern, callback);
    } catch (e) {
    
    }
};

const NewWhen = (pattern, fn) => {
   
    try {
    const callback = dependencyInjectionCallback(fn);
    When(pattern, callback);
    } catch (e) {

    }
};

const Expression = (pattern, fn, attributeSeparator = ',', handleExpressionArg = false) => {
    // example of pattern: $xPath:{string}
    // another example: $fixture:{string}

    
    let [name, variablesStr] = pattern.split(':', 2);
    name = name.trim();

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

    ExpressionsStoreage[name] = expression;
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

const extractVariables = async (pattern, expression) => {
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

    for(let i = 0; i < variables.length; i++) {
        if (!expression.handleExpressionArg && variables[i].startsWith('$')) {
            variables[i] = await ApplyExpression(variables[i]);
        }
    }
    return variables;
    
}

const getExpression = (expressionName) => {
    return ExpressionsStoreage[expressionName];
}

const ApplyExpression = async (pattern, maxLoops = 100) => {
    if (maxLoops === 0) {
        throw new Error('Max loops reached ' + pattern);
    }
    
    if (!pattern || !pattern.split || pattern.startsWith('$') === false) {
        return pattern;
    }
    
    const expressionName = pattern.substring(0, pattern.indexOf('('));
    const variablesStr = pattern.substring(pattern.indexOf('(') + 1, pattern.lastIndexOf(')'));
    const expression = getExpression(expressionName);
    
    

    if (!expression) {
        return pattern;
    }


    
    let variables = await extractVariables(variablesStr, expression);    
    const callbackVariables = expression.callback.toString().match(/\((.*?)\)/)[1].split(',').map(arg => arg.trim());

    callbackVariables.map((variable) => {
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


const steps = {
    Given : {},
    When : {},
    Then : {}
}

const addStep = (type, step, {callback, handler}) => {
    if (!steps[type]) {
        throw new Error(`Invalid step type ${type}`);
    }

    if (steps[type][step]) {
        throw new Error(`Step ${step} already exists`);
    }

    registerFunction(step, type, handler);
    
    steps[type][step] = callback
}

const registerStep = (type, step, callback) => {
    switch (type) {
        case 'Given':
            return NewGiven(step, callback);
        case 'When':
            return NewWhen(step, callback);
        case 'Then':
            return NewThen(step, callback);   
    }

    throw new Error(`Invalid step type ${type}`);
            
}



const registerSteps =  () => {
    for (const type in steps) {
        for (const step in steps[type]) {
            const callback = steps[type][step];
            registerStep(type, step, callback);
        }
    }
}

module.exports = {
    Given : (pattern, callback, handler = {}) => {
        addStep('Given', pattern, {callback, handler});
    },
    When : (pattern, callback, handler = {}) => {
        addStep('When', pattern, {callback, handler});
    },
    Then : (pattern, callback, handler = {}) => {
        addStep('Then', pattern, {callback, handler});
    },
    Expression : Expression,
    ApplyExpression : ApplyExpression,
    FunctionsStorage : FunctionsStorage,
    ResolveExpressions : (step) => {
        // example of step: I wait until $xPath(//div[@id='id'])
        // first we need to extract the arguments from the step
        // the result of this function should be: ['$xPath(//div[@id='id'])']
        // to do that we need find the index of '$<expression>(' and find the closing parenthesis

        const expressions = Object.keys(ExpressionsStoreage);
        const args = [];
        let resolvedStep = step;
        for (let i = 0; i < expressions.length; i++) {
            const pattern = expressions[i].split(':')[0];
            const index = step.indexOf(pattern + '(');
            if (index === -1) {
                continue;
            }

            let expressionStr = step.substring(index, step.lastIndexOf(')') + 1);
            expressionStr = removeExtraParenthesis(expressionStr);

            const result = {
                expression: expressionStr,
                value : getResolvedExpressionValue(expressionStr),
            };

            args.push(result);

            resolvedStep = resolvedStep.replace(expressionStr, expressionStr + ' -> ' + result.value);
        }

        return {step : resolvedStep, args};
        
    },
    getExpression,
    registerSteps : registerSteps,
    App : app,
}