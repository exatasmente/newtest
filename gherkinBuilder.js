const {FunctionsStorage, getExpession} = require('./custom-steps');

const getGherkin = (type, config) => {
    let result = {valid : false, vars : {}};
    
    for (func of Object.keys(FunctionsStorage)) {
        result = FunctionsStorage[func](config);
        if (result.valid) {
            result.step = func;
            break;
        }
    }

    if (!result.valid) {
        return ''
    }

    
    const {vars} = result;
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
    return gherkinBuilder()
        [type](step, config)
        .build()
}
const browserGherkin = (config) => {
    const action = config.action
    let type = 'given'
    
    if (action === 'screenshot') {
        type = 'then'
    }
    
    return getGherkin(type, config);
}

const inputGherkin =  (config) => {
    return getGherkin('when', config);
}


const mouseGherkin = (config) => {
    return getGherkin('when', config);
}


const verificationGherkin = (config) => {
    config.method = config.method ?  config.method.toUpperCase() : config.method;
    return getGherkin('then', config);
    
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
            const expression = getExpession(name)
            if (!expression) {
                throw new Error(`Expression ${name} not found`)
            }

            let separator = expression.attributeSeparator
            let attributes = expression.variables
            
            let result = name + '('
            for (let i = 0; i < attributes.length; i++) {
                let param = attributes[i]
                if (typeof values === 'array') {
                    param = i
                }


                const value = values[param] || ''
                result = result + `${value}` + (i < attributes.length - 1 ? separator : '')
            }

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
        'Navegador' :  browserGherkin,
        'Verificação' : verificationGherkin,
        'Entrada' : inputGherkin,
        'mouse' : mouseGherkin,
    }
    return {
        make(type, config) {
            const factory = gherkin[type]

            if (!factory) {
                throw new Error(`Gherkin ${type} not found`)
            }

            return factory(config)
                
        }
    }
}



module.exports = {
    gherkinFactory,
    expressionsFactory,
    varsBuilder,
}