const {FunctionsStorage, getExpression} = require('./custom-steps');
const getOrder = (type) => {
    switch (type) {
        case 'Given':
            return 2;
        case 'When':
            return 1;
        case 'Then':
            return 0;
    }
}
const getGherkin = (config, ids = []) => {
    const steps = [];
    
    for (func of Object.keys(FunctionsStorage)) {
        const result = FunctionsStorage[func](config);
        if (result.valid) {
            console.log(result)
            result.step = func;
            steps.push({
                step : func,
                order : result.order ?? getOrder(result.type),
                vars : result.vars,
                type : result.type,
            });
        }
    }

    if (steps.length === 0) {
        return {
            gherkins : [],
            ids,
        };
    }

    
    const gherkins = steps.map(result => {;

        const {vars, order, type} = result;
        let step = result.step;

        vars.forEach(({search, replace})=> {
            if (typeof replace !== 'function'){
                if (typeof replace === 'string') {
                    replace =`"{${replace}}"`
                }
            } else {        
                replace = replace(config)

                if (typeof replace === 'string') {
                    replace =`"${replace}"`
                }
                
            }

            

            step = step.replace(`{${search}}`, replace);
        });
        return {
            step :  gherkinBuilder()
                [type.toLowerCase()](step, config)
                .build(),
            order,
        }
    });

    return {gherkins, ids};
}
const verificationGherkin = (config, ids) => {
    config.method = config.method ?  config.method.toUpperCase() : config.method;
    return getGherkin(config, ids);
    
}




const gherkinBuilder = () => {
    return {
        type : '',
        text : [],
        attributes : [],

        given( text, attributes = [] ) {
            if (this.type === 'Given') {
                return this.and(text, attributes)
            }
            
            this.type = 'Given'
            this.attributes = attributes
            this.text = text
            

            return this;
        },
        when( text, attributes = [] ) {
            if (this.type === 'When') {
                return this.and(text, attributes)
            }

            this.type = 'When'
            this.text = text
            this.attributes = attributes
            return this;
        },
        then( text, attributes = [] ) {
            if (this.type === 'Then') {
                return this.and(text, attributes)
            }

            this.type = 'Then'
            this.text = text
            this.attributes = attributes
            return this;
        },
        and( text, attributes = [] ) {
            this.type = 'And'
            this.text = text
            this.attributes = attributes
            return this;
        },

        build() {
            const attributes = this.__extractAttributes()

            let result = this.text
            for (let i = 0; i < attributes.length; i++) {
                const attr = attributes[i]
                const value = this.attributes[attr]
                result = result.replace(`{${attr}}`, value)
            }

            return `${this.type} ${result}`

            
        },

        __extractAttributes() {
            const textAttributes = this.text.match(/\{.*?\}/g)
            const attributes = []
            if (textAttributes) {
                for (let i = 0; i < textAttributes.length; i++) {
                    const attr = textAttributes[i]
                    const name = attr.replace('{', '').replace('}', '')
                    attributes.push(name)
                }
            }

            return attributes
        }


    }

}
const expressionsFactory = () => {
    return {
        make(name, values) {
            const expression = getExpression(name)
            if (!expression) {
                throw new Error(`Expression ${name} not found`)
            }

            let separator = expression.attributeSeparator
            let attributes = expression.variables
            const getValue = (param, attribute) => {
                if (values.push && typeof values.push === 'function') {
                    return values[param]
                } 
                
                if (attribute.startsWith('{') && attribute.endsWith('}')) {
                    attribute = attribute.substring(1, attribute.length - 1)
                }

                console.log(attribute, param, values)
                
                
                return values[attribute]
            }
            let result = name + '('
            for (let i = 0; i < attributes.length; i++) {
                const value = getValue(i, attributes[i])

                if (!value) {
                    throw new Error(`Expression ${name} param ${i} not found`)
                }
                result = result + `${value}` + (i < attributes.length - 1 ? separator : '')
            }

            console.log(result, attributes, values)
            result = result + ')'

            return result
        }
    }
}

const varsBuilder = () => {
    return {
        search(name) {
            this._search = name
            return this
        },
        replace(replace) {
            this._replace = replace
            return this
        },


        build() {
            return {
                search : this._search,
                replace : this._replace,
            }
        }
    }
}


const gherkinFactory = () => {
    

    const gherkin = {
        'Navegador' :  getGherkin,
        'Verificação' : verificationGherkin,
        'Entrada' : getGherkin,
        'mouse' : getGherkin,
    }
    return {
        make(type, config, ids) {
            const factory = gherkin[type]

            if (!factory) {
                throw new Error(`Gherkin ${type} not found`)
            }

            return factory(config, ids)
                
        }
    }
}



module.exports = {
    gherkinFactory,
    expressionsFactory,
    varsBuilder,
}