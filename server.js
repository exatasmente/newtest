 // the server.js file is the entry point for the application to start a socket.io server
// the websocket has a few events that it listens to:
// execute: this event is triggered when the client sends a request to execute a workflow
// the server will then execute the workflow and send back the results

const {Server} = require('socket.io');
const process = require('process');

const execute  = (name,spec) => {
    const fs = require('fs');
    const specfile = './' + name + '.feature';
    let fileContent = fs.readFileSync(`./feature.feature`, 'utf8');
    fileContent = fileContent.replaceAll('{name}', name)
    fileContent = fileContent.replace('{steps}', spec);

    console.log(fileContent);
    fs.writeFileSync(specfile, fileContent);

    const { spawn } = require('child_process');
    const child = spawn('node', ['./bin/autokin', '-e', '--customSteps', 'steps.js', '--specs', specfile]);

    child.stdout.on('data', (data) => {
        
    })

    child.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    })

    child.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    })

    child.on('error', (err) => {
        console.log(`child process error ${err}`);
    })

    child.on('exit', (code) => {
        console.log(`child process exited with code ${code}`);
    })

    child.on('message', (message) => {
        console.log(`child process message ${message}`);
    })


}



const server = new Server({
    cors: {
        origin: "http://localhost:3000"
    }
});

server.listen(4341);
console.log('server listening on port 4341');

server.on('connection', (socket) => {
    console.log('client connected');
    socket.on('execute', (data) => {
        console.log('execute event received');
        execute(data.name, data.data);
    });
});