 // the server.js file is the entry point for the application to start a socket.io server
// the websocket has a few events that it listens to:
// execute: this event is triggered when the client sends a request to execute a workflow
// the server will then execute the workflow and send back the results


const options = {
  stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
};



const {Server} = require('socket.io');
const process = require('process');

const currentExecutions = {

}

const addExecution = (name) => {
    currentExecutions[name] =  [];
}

const removeExecution = (name) => {
    delete currentExecutions[name];
}

const updateExecution = (name, options) => {
    const currentExecution = currentExecutions[name];
    if (!currentExecution) {
        return;
    }

    currentExecutions[name].push(options);

    if (options.status === 'failed' || options.status === 'passed' || options.status === 'skipped' || options.status === 'ended') {
        removeExecution(name);
        return
    }
}



const execute  = (name,spec, socket) => {
    const fs = require('fs');
    const specfile = './' + name + '.feature';
    let fileContent = fs.readFileSync(`./feature.feature`, 'utf8');
    fileContent = fileContent.replaceAll('{name}', name)
    fileContent = fileContent.replace('{steps}', spec);

    console.log(fileContent);
    fs.writeFileSync(specfile, fileContent);

    const { spawn } = require('child_process');
    const child = spawn('node', ['./bin/autokin', '-e', '--customSteps', 'steps.js', '--specs', specfile], options);
    const logs = [];
    const promise = new Promise((resolve, reject) => {
        child.on('message', (message) => {
            const {type, data} = message;

            if (type == 'test-case-started') {
                addExecution(name);
            }

            if (type === 'test-step-started') {
                data.status = 'running';
                logs.push(data);
            }

            if (type === 'test-step-finished') {
                console.log('step finished', JSON.stringify(data));
                logs.push(data);
            }

            if (type === 'test-run-finished') {
                const {success, message} = data;
                updateExecution(name, {
                    status: success ? 'ended' : 'failed',
                    message,
                });
            }

            socket.emit('update', data);

        })

        child.on('exit', (code, signal) => {
            console.log('child process exited with ' +
                        `code ${code} and signal ${signal}`);
            resolve(code);
        });

        child.on('error', (error) => {
            console.log('child process exited with ' +
                        `error ${error}`);
            reject(error);
        });
    });


    promise.then((code) => {
        socket.emit('execution', logs);
    }).catch((error) => {
        console.log(error);
    });

}



const server = new Server({
    cors: {
        origin: "*"
    }
});

server.listen(4341);
console.log('server listening on port 4341');

server.on('connection', (socket) => {
    console.log('client connected');
    socket.on('execute', (data) => {
        console.log('execute event received');
        execute(data.name, data.data, socket);
    });
});