/**
 * 请求容器，存储每个请求中打点的日志信息，并传递给strategyManager做刷新决策
 */
var os = require('os');
var util = require('./lib/util.js');
var strategyManager = require('./strategyManager');
var layout = require('./lib/layout');
var libLoggerInstance;
var Env;
var LOG_TYPES = [];

// 默认每个缓冲最大容量为10kB
var MAXCACHESIZE = 10 * 1024;
// 默认刷新缓冲超时为10s
var FLUSHTIMEOUT = 10000;

function Log(options) {
  var env = options.env || process.env.NODE_ENV || "development";
  var appender = options.appender;
  var manager = {};
  var layer = {};
  LOG_TYPES = [];

  appender.forEach(function(config){
    var type = config.type.toLowerCase();
    LOG_TYPES.push({
      type: type
    });

    manager[type] = strategyManager({
      logdir: config.logdir,
      rollingFile: config.rollingFile,
      name: config.name,
      nameformat: config.nameformat,
      mkdir: true,
      cacheSize: typeof config.cacheSize == 'number' ? config.cacheSize : MAXCACHESIZE,
      flushTimeout: typeof config.flushTimeout == 'number' ? config.flushTimeout : FLUSHTIMEOUT
    });
    // 创建layout实例
    layer[type] = layout.patternLayout(config.pattern,config.tokens);
  });

  // str: 写入的数据
  // level: 日志级别
  // mode: 是否刷新缓冲
  function _write(str,level,mode) {
    //only development env will output to console
    if (env === 'development') {
      console[level] && console[level](str.toString()) ||
      console.dir(level,str.toString());
      return;
    }
    if(Array.isArray(str)){
      str = str.join(os.EOL);
    }
    manager[level.toLowerCase()].write(str + os.EOL);
    if(mode == 'flush'){
      manager[level.toLowerCase()].close();
    }
  }

  // 根据传入的参数判断是否需要缓存每个请求的日志信息
  function _generateLogger(cache) {
    var logger = {};

    LOG_TYPES.forEach(function(typeObj) {

      logger[typeObj.type] = function(msg) {
        if (!msg)
          return;
        msg = layer[typeObj.type.toLowerCase()]({
          data: msg,
          level: typeObj.type.toUpperCase(),
          startTime: new Date(),
          pid: process.pid
        });

        if (cache) {
          cache[typeObj.type].push(msg);
        } else {
          _write(msg,typeObj.type);
        }

      }
    });

    // cache一定是个数组
    if (cache) {
      logger.flush = function() {
        LOG_TYPES.forEach(function(log){
          _write(cache[log.type],log.type,'flush');
        });
      }
    }

    return logger;
  }

  return {
    //如果有cache代表需要做异步处理
    generate: function(cache) {
      return _generateLogger(cache);
    }
  }
}

var firstValve = function*(next){
  //记录基础的请求时间,跳过静态资源
  var ctx = this;
  var start = new Date;
  //logs缓存，打log不会真的输出，而是记录
  var logsMemory = {
    info: [],
    trace: [],
    error: []
  };

  ctx.logger = libLoggerInstance.generate(logsMemory);
  ctx.logger.info('------request start------')
  try{
    yield* next;
  }catch(err){

    this.logger.error(util.error2string(err));
    this.logger.flush();

    //告诉全局的error监控，此错误已经处理过了
    err.hasHandled = true;
    //抛出去 方便其他程序监控
    ctx.throw(err);
  }

  // todo: delete
  var res = this.res;

  var onfinish = done.bind(null, 'finish');
  var onclose = done.bind(null, 'close');
  res.once('finish', onfinish);
  res.once('close', onclose);

  function done(event) {
    res.removeListener('finish', onfinish);
    res.removeListener('close', onclose);

    ctx.logger.info('******request end******');
    ctx.logger.flush();

  }

}

module.exports = function(options) {
  options = options || {};
  Env = options.env || process.env.NODE_ENV || "development";

  libLoggerInstance = Log({
    env: Env,
    appender: options.appender
  });

  var globalLogger = libLoggerInstance.generate();

  //暴露logger到全局
  if (options.exportGlobalLogger) {
    global.logger = globalLogger;
  }

  return firstValve;
};
