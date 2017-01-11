'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');
var cfork = require('cfork');
var cpus = require('os').cpus().length;
var pids = [];
var count = 0;
var midlog = require('./../reqContainer');
// 暴露全局logger
midlog({
  env: 'online',
  SkipStatic: true,
  exportGlobalLogger: true,
  appender: [{
    type: 'INFO',
    logdir: '/Users/showjoy/github/midlog',
    pattern: '%d %r %x{name}:%z %p - %m%n',
    rollingFile: false,
    name: 'info.log',
    nameformat: null,
    mkdir: true,
    tokens: {
      name: 'MidProxy'
    },
    cacheSize: 10240,
    flushTimeout: 1000
  },{
    type: 'ERROR',
    logdir: '/Users/showjoy/github/midlog',
    pattern: '%d %r %x{name}:%z %p - %m%n',
    rollingFile: false,
    name: 'error.log',
    nameformat: null,
    mkdir: true,
    tokens: {
      name: 'MidProxy'
    },
    cacheSize: 10240,
    flushTimeout: 10000
  }]
});

var _start = function(){
  var cluster = cfork({
    exec: path.join(__dirname, './app.js'),
    duration: 60000,
    args: [process.argv[3],process.argv[4]] // midProxy运行环境  cmd: node bin/exec.js -e dev online(mock)
  })
    .on('fork', function (worker) {
      var pid = worker.process.pid;
      if(pids.indexOf(pid) == -1){
        pids.push(pid);
      }

      logger.info('[' + Date() + '] [worker:' + pid + '] new worker start');

      if(count == cpus){
        fs.writeFile('tmp/pids',JSON.stringify(pids),'utf8',function(err){
          if(err){
            logger.error('[' + Date() + '] [worker:' + pid + '] pid serialize error when fork state');
          }
        });
      }
    })
    .on('listening', function (worker, address) {
      logger.info('[' + Date() + '] [worker:'+ worker.process.pid +'] listening on '+ address.port);
    })
    .on('disconnect', function (worker) {
      logger.info('[' + Date() + '] [master:' + process.pid + '] worker:' + worker.process.pid + ' disconnect, suicide: '+ worker.suicide +', state: '+ worker.state +'.');
    })
    .on('exit', function (worker, code, signal) {
      var exitCode = worker.process.exitCode;
      var cid = worker.process.pid,ind = pids.indexOf(cid);
      if(ind !== -1){
        pids.splice(ind,1);
      }

      fs.writeFile('tmp/pids',JSON.stringify(pids),'utf8',function(err){
        if(err){
          logger.error('[' + Date() + '] [worker:' + pid + '] pid serialize error when exit state');
        }
      });
      var err = new Error(util.format('worker '+ cid +' died (code: '+ exitCode +', signal: '+ signal +', suicide: '+ worker.suicide +', state: '+ worker.state +')'));
      err.name = 'WorkerDiedError';
      logger.error('['+ Date() +'] [master:'+ process.pid +'] worker exit: '+ err.stack);
    });

};

_start();

process.once('SIGTERM', function () {
  // todo: 需要遍历子进程一次关闭
  for(let i in process.workers){
    let worker = process.workers[i];
    // In a worker, this function will close all servers, wait for the 'close' event on those servers,
    // and then disconnect the IPC channel.
    worker.disconnect();
  }
  process.exit(0);
});