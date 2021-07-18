let fs = require('fs');
let path = require('path');
let http = require('http');

let getMimeType = require('./mime');

let pluginCaller = require('./plugin');

let { logger, httpMessage } = require('./utils');

/////////////////////////////////////////////////////////////
// parse config

let WEBOX_ROOT = path.resolve(process.env.WEBOX_ROOT || 'webroot');

let WEBOX_HOST = process.env.WEBOX_HOST || '127.0.0.1';
let WEBOX_PORT = process.env.WEBOX_PORT || 80;

/////////////////////////////////////////////////////////////
// create server

let httpServer = http.createServer(function (request, response) {
    logger('Request URL:', request.url);
    //调用插件
    let pdata = {
        reqfile: '', realpath: ''
    };
    if (pluginCaller(pdata, request, response)) {
        return true;
    }
    //找不到文件
    if (pdata.realpath === '') {
        httpMessage(response, 404, pdata.reqfile);
        return true;
    }
    //尝试读取文件
    fs.createReadStream(pdata.realpath)
        .on('error', function (err) {
            httpMessage(response, 503, pdata.reqfile);
        })
        .on('data', function (chunk) {
            response.writeHead(200, {
                'Content-Type': getMimeType(pdata.realpath)
            });
            response.write(chunk);
        })
        .on('end', function () {
            response.end();
        });
});

httpServer.on('error', function (err) {
    if (err.code == 'EADDRINUSE') {
        logger('IP-Port in use:', WEBOX_HOST, WEBOX_PORT);
        logger('Failover:', WEBOX_HOST, ++WEBOX_PORT, '\n');
        httpServer.listen(WEBOX_PORT, WEBOX_HOST, 1024);
    }
});

httpServer.on('listening', function () {
    let host = WEBOX_HOST === '0.0.0.0' ? '127.0.0.1' : WEBOX_HOST;
    let port = WEBOX_PORT === '80' ? '' : ':' + WEBOX_PORT;
    logger('Server started:', 'http://' + host + port);
    logger('Root Directory:', WEBOX_ROOT, '\n');
});

/////////////////////////////////////////////////////////////
// start server

httpServer.listen(WEBOX_PORT, WEBOX_HOST, 1024);
