'use strict';
const { Given, When, Then } = require('cucumber');

const ExpressionsStoreage = {
};



const Store = require('./lib/autokin-store');
const {WebBuilder} = require('./lib/web/autokin-web');

class DependencyInjectionContainer {
    constructor(defaults = []) {
        this.container = {};
        defaults.map((item) => {
            if (item.singleton === true) {
                this.singleton(item.name, item.instance);
            } else {
                this.set(item.name,  item.instance);
            }
        });

        this.set('AppContainer', this);
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

}

const app = new DependencyInjectionContainer([
    {
        name: 'WebBuilder',
        instance: () => WebBuilder,
        singleton: true,
    },
    {
        name: 'Store',
        instance: () => Store,
        singleton: true,
    },

])
app.set('Page', () => {
    return app.get('WebBuilder').page;
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

const Expression = (pattern, fn, attributeSeparator = ',') => {
    // example of pattern: $xPath:{string}
    // another example: $fixture:{string}

    
    let variablesStr = pattern.split(':', 2)[1];

    const expression = {
        regex: null,
        variables: [],
        callback: fn,
        attributeSeparator: attributeSeparator,
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

let callLimit = 100;
const ApplyExpression = async (pattern) => {
    if (callLimit === 0) {
        throw new Error('Call limit reached');
    }
    callLimit--;
    // example of use in step: Then I should see $xPath:$fixture:file.attribute_name
    if (!pattern || !pattern.split || pattern.startsWith('$') === false) {
        return pattern;
    }

    const expressionName = pattern.substring(0, pattern.indexOf(':'));
    const variablesStr = pattern.substring(pattern.indexOf(':') + 1);
    const expressionKey = Object.keys(ExpressionsStoreage).find(key => {
        return key.split(':')[0] === expressionName;
    });
    
    if (!expressionKey) {
        return pattern;
    }

    const expression = ExpressionsStoreage[expressionKey];
    const variables = variablesStr.split(expression.attributeSeparator);
        
    
    const callbackVariables = expression.callback.toString().match(/\((.*?)\)/)[1].split(',').map(arg => arg.trim());
    
    for (let i = 0; i < variables.length; i++) {
        let variable = variables[i];
        variable = await ApplyExpression(variable);
        variables[i] = variable;

    }
    callbackVariables.map((variable, index) => {
        if (app.has(variable)) {
            variables.push(app.get(variable));
        }
    });

    

    const result = await expression.callback(...variables);
    if (result) {
        return await ApplyExpression(result);
    }

    return pattern;
}

Expression('$fixture:{string}', (fixture) => {
    // example of fixture value: name_of_fixture_file.attribute_name
    // another example: name_of_fixture_file.attribute_name,another_attribute_name
    console.log('fixture', fixture);
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

    

module.exports = {
    Given : NewGiven,
    When : NewWhen,
    Then : NewThen,
    Expression : Expression,
    App : app,
}