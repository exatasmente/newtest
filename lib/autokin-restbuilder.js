/*
 * Copyright 2018 Aries Beltran <ariesbe@icloud.com>
 * Licensed under the MIT license. See LICENSE.
 * 
 * Autokin - RestBuilder
 */
const request = require('request');
const Utils = require('./utilities');
const jp = require('jsonpath');
const diff = require('deep-diff');
const path = require('path');
const fs = require('fs');
const colors = require('colors');
const Store = require('./autokin-store');
const Measure = require('./autokin-measure');
const { uuid } = require('./utilities/generators');

class Response {
    constructor(response) {
        this.resp = response;
    }

    hasHeader(name) {
        let headers = this.resp.headers;
        return (name.toLowerCase() in headers);
    }

    headerValue(name) {
        return this.resp.headers[name.toLowerCase()];
    }

    statusCode() {
        return this.resp.statusCode;
    }

    Body() {
        return new Body(this.resp.body);
    }

    responseTime() {
        return this.resp.timingPhases.total;
    }
}

class Body {
    constructor(body) {
        this.body = body;
    }

    isJSON() {
        return Utils.isJSON(this.body);
    }

    asJSON() {
        return Utils.asJSON(this.body);
    }

    asText() {
        return this.body;
    }

    hasPath(path) {
        let data = jp.query(this.asJSON(), path);
        return data.length > 0;
    }

    pathValue(path) {
        let data = jp.value(this.asJSON(), path);
        return data;
    }

    query(path) {
        let data = jp.query(this.asJSON(), path);
        return data;
    }

    filter(path, target) {
        const data = jp.query(this.asJSON(), path);

        const match = (obj, value) => {
            const objs =
                typeof obj == 'object' ? JSON.stringify(obj) : obj.toString();
            return objs.indexOf(value) >= 0;
        };

        const matches = data.filter((d) => match(d, target));
        return matches;
    }

    filterObjectKeys(path, searchObject) {
        const data = jp.query(this.asJSON(), path);

        const match = (obj, value) => {
            if (typeof obj != 'object') return false;

            let foundMatch = true;
            Object.keys(value).forEach((s) => {
                const j = jp.value(obj, s);
                const k = value[s];
                if (!j) {
                    foundMatch = false;
                } else {
                    if (j != k) foundMatch = false;
                }
            });

            return foundMatch;
        };

        const matches = data.filter((d) => match(d, searchObject));
        return matches;
    }

    isSameAs(docJSON) {
        let changes = diff(docJSON, this.asJSON());
        return changes == undefined;
    }
}

class RestBuilder {
    constructor() {
        this.id = uuid();
        this.count = 0;
        this.reqbody = {};
        this.requestTimeout = 10000;
        this.cookiejar = request.jar();
        this.resp = new Response();
        this.testCase = undefined;
        this.followRedirect = true;

        if (process.env.AUTOKIN_VARS) {
            try {
                const autokinVars = require(path.resolve(process.cwd(), process.env.AUTOKIN_VARS));
                Store.merge(autokinVars);
            }
            catch(error) {
                process.stdout.write(colors.red(`Autokin Variables not loaded. Please check file path provided. (${colors.white(process.env.AUTOKIN_VARS)})\n\n`));
            }
        }
    }

    reset(testCase) {
        this.id = uuid();
        this.count = 0;
        this.reqbody = {};
        this.cookiejar = request.jar();
        this.resp = null;
        this.followRedirect = true;
        this.testCase = testCase;
    }

    host(domain, https = true) {
        this.reqbody.https = https;
        this.reqbody.domain = Store.sanitize(domain);
        return this;
    }

    timeout(timeoutValueInSeconds) {
        this.requestTimeout = Store.sanitize(timeoutValueInSeconds) * 1000;
        return this;
    }

    header(name, value) {
        this.reqbody.headers = !this.reqbody.headers ? {} : this.reqbody.headers;
        this.reqbody.headers[Store.sanitize(name)] = Store.sanitize(value);
        return this;
    }

    query(name, value) {
        this.reqbody.qs = !this.reqbody.qs ? {} : this.reqbody.qs;
        this.reqbody.qs[Store.sanitize(name)] = Store.sanitize(value);
        return this;
    }

    form(name, value, formKey) {
        this.reqbody[formKey] = !this.reqbody[formKey] ? {} : this.reqbody[formKey];
        this.reqbody[formKey][Store.sanitize(name)] = Store.sanitize(value);
        return this;
    }

    body(body) {
        const newBody = Store.sanitizeJson(JSON.parse(body));
        this.reqbody.body = JSON.stringify(newBody);
        return this;
    }

    cookie(cookie) {
        this.cookiejar.setCookie(request.cookie(Store.sanitize(cookie)), this.reqbody.domain);
        return this;
    }

    basicAuthentication(username, password) {
        username = Store.sanitize(username);
        password = Store.sanitize(password);

        const auth = Buffer.from(username.concat(':').concat(password)).toString('base64');
        return this.header('Authorization', 'Basic ' + auth);
    }
    
    followRedirection(option) {
        this.followRedirect = option;
    }

    keep(key, value) {
        Store.set(key, value);
        return this;
    }

    snapshotKey() {
        return `${this.count}-${this.id}`;
    }

    Response() {
        return this.resp;
    }

    build(uri, method = 'GET') {
        uri = (this.reqbody.https ? 'https://' : 'http://') + this.reqbody.domain + uri;
        let buildProcessArgs = {
            method,
            uri,
            qs: this.reqbody.qs,
            headers: this.reqbody.headers,
            time: true,
            timeout: this.requestTimeout,
            followRedirect: this.followRedirect
        };

        if (this.reqbody.body) {
            buildProcessArgs['body'] = this.reqbody.body;
        }

        if(this.reqbody.form) {
            buildProcessArgs['form'] = this.reqbody.form;
        }

        if (this.reqbody.formData) {
            buildProcessArgs['formData'] = this.reqbody.formData;
        }

        return buildProcessArgs;
    }

    errorify(error) {
        if (error.code === 'ESOCKETTIMEDOUT') {
            return `Request timed out and it is more than ${this.requestTimeout / 1000} seconds to complete.`;
        }

        return error;
    }

    process(uri, callback, method = 'GET') {
        let self = this;
        request(this.build(Store.sanitize(uri), method), function (error, response) {
            if (error) {                
                return callback(self.errorify(error));
            }

            self.resp = new Response(response);
            Measure.add(response);

            // save snapshot of response
            self.count++;
            if(Utils.isJSON(response.body)) {
                let jsonBody = JSON.parse(response.body);
                Store.set(`__response-${self.snapshotKey()}`, jsonBody);
                fs.writeFileSync(`reports/snapshots/${self.snapshotKey()}.json`, JSON.stringify(jsonBody, null, 4));
            } else {
                fs.writeFileSync(`reports/snapshots/${self.snapshotKey()}.response`, response.body);
            }
            callback(null, response);
        });
    }
}

module.exports.RestBuilder = RestBuilder;
module.exports.Response = Response;
module.exports.Body = Body;