#!/usr/bin/env node

'use strict';

var path = require('path');
var http = require('http');
var url = require('url');
var fs = require('fs');

// set title
process.title = 'Webox - HTTP Server';

// set env var for ORIGINAL cwd
process.env.INIT_CWD = process.cwd();

// exit with 0 or 1
var failed = false;
process.once('exit', function (code) {
    webox.log('Service Stopped');
    if (code === 0 && failed) {
        process.exit(1);
    }
});

/////////////////////////////////////////////////////////////
// code from www.anrip.com

var mime = require('./mime');

// parse config

var config = process.argv.slice(2);
var wbroot = config[1] || 'webroot';
var listen = config[0] ? config[0].split(':') : [];

listen[0] = listen[0] || '0.0.0.0';
listen[1] = listen[1] > 0 ? parseInt(listen[1]) : 80;

// create server

var webox = http.createServer(function (request, response) {
    //解析请求参数
    var pathTemp = request.url.match(/\/$|^\/\?/) ? '/index.html' : request.url;
    var pathName = url.parse(pathTemp).pathname;
    var realPath = path.join(wbroot, pathName);
    webox.log('Request file: ' + realPath);
    //尝试查找文件
    fs.exists(realPath, function (exists) {
        //找不到文件
        if (!exists) {
            response.writeHead(404, {
                'Content-Type': mime['txt']
            });
            response.write('File not found: ' + pathName);
            response.end();
            return;
        }
        //获取扩展名
        var ext = path.extname(realPath);
        ext = ext ? ext.slice(1) : 'unknown';
        //发送头信息
        response.writeHead(200, {
            'Content-Type': mime[ext] || 'application/octet-stream'
        });
        //尝试读取文件
        fs.createReadStream(realPath)
            .on('error', function (error) {
                response.writeHead(500, {
                    'Content-Type': mime['txt']
                });
                response.write('Server internal error: ' + pathName);
                response.end();
            })
            .on('data', function (chunk) {
                response.write(chunk);
            })
            .on('end', function () {
                response.end();
            });
    });
});

webox.log = function () {
    var arg1 = ['[' + dateFormat('hh:mm:ss') + ']', 'Webox -'];
    var arg2 = Array.prototype.slice.call(arguments);
    console.log.apply(null, arg1.concat(arg2));
};

webox.on('error', function (e) {
    if (e.code == 'EADDRINUSE') {
        webox.log('Port is occupied:', listen[0], listen[1], '\n');
        webox.log('Try other port:', listen[0], ++listen[1]);
        webox.listen(listen[1], listen[0], 1024);
    }
});

webox.on('listening', function () {
    var host = listen[0] === '0.0.0.0' ? '127.0.0.1' : listen[0];
    webox.log('Service started:', 'http://' + host + ':' + listen[1], '\n');
});

// start server

webox.listen(listen[1], listen[0], 1024);

/////////////////////////////////////////////////////////////

function dateFormat(fmt) {
    var d = new Date();
    var o = {
        'M+': d.getMonth() + 1, //月
        'd+': d.getDate(), //日
        'h+': d.getHours(), //时
        'm+': d.getMinutes(), //分
        's+': d.getSeconds(), //秒
        'q+': Math.floor((d.getMonth() + 3) / 3), //季度
        'S': d.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) { //年
        fmt = fmt.replace(RegExp.$1, (d.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp('(' + k + ')').test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
        }
    }
    return fmt;
}
