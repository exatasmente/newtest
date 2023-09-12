const givenSteps = require('./steps/GivenSteps');
const whenSteps = require('./steps/WhenSteps');
const thenSteps = require('./steps/ThenSteps');
const expressions = require('./steps/Expression');

const {WebBuilder} = require('./lib/web/autokin-web');


const {After} = require('cucumber');

After(async function () {
    await WebBuilder.screenshot('screenshot');
});


module.exports = {
    givenSteps,
    whenSteps,
    thenSteps,
    expressions
}
