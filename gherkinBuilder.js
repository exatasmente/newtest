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

            console.log(this)
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
    const expressions = {
        '$getElAttr' : { 
            attributes : ['selector', 'attribute'],
            separator : ';',
        },
        '$findText' : ['text'],
        '$xPath' : ['xpath'],
        '$pos' : {
            attributes : ['x', 'y'],
            separator : ';'
        },
    }

    return {
        make(name, values) {
            let params = expressions[name]
            let separator = ';'

            if (!params) {
                throw new Error(`Expression ${name} not found`)
            }

            const isObject = params.length === undefined

            if (isObject) {
                separator = params.separator
                params = params.attributes
            }

            
console.log(params, values)
            let result = name + '('
            for (let i = 0; i < params.length; i++) {
                const param = params[i]
                const value = values[param]
                result = result + `${value}` + (i < params.length - 1 ? separator : '')
            }

            result = result + ')'

            return result
        }
    }
}
const gherkinFactory = () => {
    const browserGherkin = (config) => {
        const action = config.action
        let text = ''
        if (action === 'navigate') {
            text = `I navigate to "{url}"`
        } else if (action === 'emulate') {
            text = `I emulate "{device}"`
        } else if (action === 'resize') {
            text = `I resize the window to {width} x {height}`
    
            return gherkinBuilder()
                .when(text, config)
                .build()
                
        } else {
            text = `I take a${config.fullPage ? " full" : " "}screenshot "{path}"`
    
            return gherkinBuilder()
                .then(text, config)
                .build()
    
        }
        
        return gherkinBuilder()
            .given(text, config)
            .build()
    }

    const verificationGherkin = (config) => {
        const action = config.action
        const actionType = config.actionType
        const assertType = config.assertType
        let text = ''
    
        if (actionType === 'request' || actionType === 'response') {
            config.method = config.method.toUpperCase()
    
            return gherkinBuilder()
                .then(`I expect ${actionType} "{method}" to "{url}" ${actionType === 'response' ? `with status code "{statuscode}"` : ''}`, config)
                .build()
        }
        
        let expression = null
        if (config['selectorType'] === 'text') {
            expression = expressionsFactory()
                .make('$findText', { text: config.selector })
        } else if (config['selectorType'] === 'xpath') {
            expression = expressionsFactory()
                .make('$xPath', { selector: config.selector })
        }
        
    
        if (config.showAttribute && config.attributeValue) {     
            expression = `$getElAttr(${expression ?? '{selector}'};${config.attributeValue})`
        }
    
        if (expression) {
            text = `I expect "${expression}"`
        } else {
            text = `I expect "{selector}"`	
        }
    
        
        if (assertType === 'equals') {
            text += ` equals to "{value}" ${config['case-sensitive'] ? 'case sensitive' : ''}`
        } else if (assertType === 'contains') {
            text += ` contains "{value}" ${config['case-sensitive'] ? 'case sensitive' : ''}`
        } else if (assertType === 'not-contains') {
            text += ` not contains "{value}" ${config['case-sensitive'] ? 'case sensitive' : ''}`
        } else if (assertType === 'exists') {
            text += ' exists'
        } else if (assertType === 'not-exists') {
            text += ' not exists'
        } else if (assertType === 'visible') {
            text += ' is visible'
        } else if (assertType === 'not-visible') {
            text += ' is not visible'
        } else {
            text += ' is valid'
        }
        
        return gherkinBuilder()
            .then(text, config)
            .build()
    }

    const inputGherkin =  (config) => {
        const action = config.action
        let text = ''    
    
        if (action === 'type') {
            let expression = ''
            if (config['selectorType'] === 'text') {
                expression = '$findText'
            } else if (config['selectorType'] === 'xpath') {
                expression = '$xPath'
            }
            
            if (expression) {
                text = `I type "{text}" ${expression}("{selector}")`
            } else {
                text = `I type "{text}" "{selector}"`
            }
            
        } else if (action === 'clear') {
            text = `I clear "{selector}"`
        } else if (action === 'press') {
            text = `I press "{key}"`
        } else {
            text = `"I type {text}" "{selector}"`
        }
    
        return gherkinBuilder()
            .when(text, config)
            .build()
    }
    

    const mouseGherkin = (config) => {
        const action = config.action
        let text = ''
        let selector = config.selector
    
        if (config.selectorType === 'text') {
            selector = `$findText(${selector})`
        } else if (config.selectorType === 'xpath') {
            selector = `$xPath("${selector}")`
        } else if (config.selectorType === 'position') {
            selector = `$pos(${config.x},${config.y})`
        }
    
        if (action === 'click') {
            text = `I click "{selector}"`
        } else if (action === 'doubleClick') {
            text = `I double click "{selector}"`
        } else if (action === 'rightClick') {
            text = `I right click "{selector}"`
        } else if (action === 'move') {
            text = `I move to "{selector}"`
        } else if (action === 'hold') {
            text = `I hold "{button}"`
        } else if (action === 'release') {
            text = `I release "{button}"`
        } else {
            text = `I hover "{selector}"`
        }
    
    
        config.selector = selector
        
        return gherkinBuilder()
            .when(text, config)
            .build()
    }
    

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
}