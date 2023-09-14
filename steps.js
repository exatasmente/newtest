const {registerSteps} = require('./custom-steps');
const givenSteps = require('./steps/GivenSteps');
const whenSteps = require('./steps/WhenSteps');
const thenSteps = require('./steps/ThenSteps');
const expressions = require('./steps/Expression');

const {WebBuilder} = require('./lib/web/autokin-web');


const {After} = require('cucumber');

After(async function () {
    const result = await WebBuilder.screenshot('screenshot');
    await WebBuilder.close();
});



registerSteps()
module.exports = {
    givenSteps,
    whenSteps,
    thenSteps,
    expressions
}
