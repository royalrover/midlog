'use strict';

var fs = require('fs');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var moment = require('moment');
var mkdirp = require('mkdirp');

var ONE_MINUTE = 60000;
var ONE_HOUR = 60 * ONE_MINUTE;
var ONE_DAY = 24 * ONE_HOUR;

/**
 * Log stream, auto cut the log file.
 *
 * log file name is concat with `prename + format + ext`.
 *
 * @param  {Object} options
 *  - {String} logdir, this dir must exists.
 *  - {String} nameformat, default is '[info.]YYYY-MM-DD[.log]',
 *    @see moment().format(): http://momentjs.com/docs/#/displaying/format/
 *    Also support '{pid}' for process pid.
 *  - {String} [encoding], default is utf-8, other encoding will encode by iconv-lite
 *  - {Number} [duration], default is one houre(24 * 3600000 ms), must >= 60s.
 *  - {String} [mode], default is '0666'.
 *  - {Number} [flushTimeout] the duration of flush buffer , default is 1000ms
 *  - {Number} [cacheSize] the maximum value of each buffer , default is 10kB
 *  - {Boolean} [mkdir] try to mkdir in each cut, make sure dir exist.
 *    useful when your nameformat like 'YYYY/MM/DD/[info.log]'.
 * return {StrategyManager}
 */
module.exports = function createStream(options) {
  return new StrategyManager(options);
};

function StrategyManager(options) {
  if (!(this instanceof StrategyManager)) {
    return new StrategyManager(options);
  }
  options = options || {};
  // 记录上次刷新缓存的时间
  this.lastFlushTimeStamp = Date.now();
  // 标记当前使用的缓冲
  this.currentBuffer = 'A';
  // 日志的路径
  this.logdir = options.logdir;
  // 是否针对文件进行分片
  this.rollingFile = options.rollingFile;
  // 日志名称，必须与rollingFile对应
  this.name = options.name;
  if (!this.rollingFile){
    if(!this.name){
      throw new TypeError('必须提供日志文件名称');
    }
  }

  // 日志分片的名称模式
  this.nameformat = options.nameformat || '[info.]YYYY-MM-DD[.log]';
  this.nameformat = this.nameformat.replace('{pid}', process.pid);
  // 日志分片间隔
  this.duration = options.duration || ONE_HOUR;
  // must >= one minute
  if (this.duration < 60000) {
    this.duration = 60000;
  }
  this.encoding = (options.encoding || 'utf-8').toLowerCase();
  if (this.encoding === 'utf8') {
    this.encoding = 'utf-8';
  }

  this.streamMode = options.mode || '0666';
  this.mkdir = options.mkdir;

  if (!this.rollingFile) {
    this.init();
  } else {
    this.cut();
    this.startTimer(this.firstDuration());
  }

  // 两个缓冲区，放弃数组结构，采用对象链表
  this._bufA = {};
  this._bufB = {};
  // 两个链表指针
  this._pA = this._bufA;
  this._pB = this._bufB;

  this._bufA.cacheSize = this._bufB.cacheSize = 0;

  // 每个缓冲的最大容量，超过该值则强制刷新
  this.cacheSize = options.cacheSize;
  // 强制刷新缓冲的时间
  this.flushTimeout = options.flushTimeout;
}

util.inherits(StrategyManager, EventEmitter);

StrategyManager.prototype.firstDuration = function () {
  var firstDuration = this.duration;
  if (this.duration > ONE_MINUTE) {
    var now = moment();
    if (this.duration < ONE_HOUR) { // in minute
      firstDuration = now.clone().add(this.duration, 'ms').startOf('minute').diff(now);
    } else if (this.duration < ONE_DAY) { // in hour
      firstDuration = now.clone().add(this.duration, 'ms').startOf('hour').diff(now);
    } else { // in day
      firstDuration = now.clone().add(this.duration, 'ms').startOf('day').diff(now);
    }
  }
  return firstDuration;
};

StrategyManager.prototype.startTimer = function (duration) {
  this._timer = setTimeout(function (self) {
    self.cut();
    self.startTimer(self.duration);
  }, duration || this.duration, this);
};

// 针对非RollingFile，做初始化
StrategyManager.prototype.init = function () {
  var name = this.name;
  var logpath = path.join(this.logdir, name);

  // make sure dir exist
  if (this.mkdir) {
    try {
      mkdirp.sync(path.dirname(logpath));
    } catch (err) {
      // ignore
    }
  }

  this._reopening = true;
  this.stream = fs.createWriteStream(logpath, {flags: 'a', mode: this.streamMode});
  this.stream
    .on("error", this.emit.bind(this, "error"))
    .on("pipe", this.emit.bind(this, "pipe"))
    .on("drain", this.emit.bind(this, "drain"))
    .on("open", function () {
      this._reopening = false;
    }.bind(this))
    .on("close", function () {
      if (!this._reopening) {
        this.emit("close");
      }
    }.bind(this));
};

StrategyManager.prototype.cut = function () {
  if (this.stream) {
    this._flush();
    this.stream.end();
    this.stream.destroySoon();
    this.stream = null;
  }
  var name = moment().format(this.nameformat);
  var logpath = path.join(this.logdir, name);

  // make sure dir exist
  if (this.mkdir) {
    try {
      mkdirp.sync(path.dirname(logpath));
    } catch (err) {
      // ignore
    }
  }

  this._reopening = true;
  this.stream = fs.createWriteStream(logpath, {flags: 'a', mode: this.streamMode});
  this.stream
    .on("error", this.emit.bind(this, "error"))
    .on("pipe", this.emit.bind(this, "pipe"))
    .on("drain", this.emit.bind(this, "drain"))
    .on("open", function () {
      this._reopening = false;
    }.bind(this))
    .on("close", function () {
      if (!this._reopening) {
        this.emit("close");
      }
    }.bind(this));
};

StrategyManager.prototype.write = function (string) {
  var chunk = this._encode(string),
    now = Date.now();
  if (this.currentBuffer == 'A') {
    this._pA.next = chunk;
    this._pA = chunk;
    this._bufA.cacheSize += Buffer.byteLength(chunk);
    if(this._bufA.cacheSize >= this.cacheSize || now - this.lastFlushTimeStamp >= this.flushTimeout){
      this.flush('A');
      this.lastFlushTimeStamp = Date.now();
    }
  }else{
    this._pB.next = chunk;
    this._pB = chunk;
    this._bufB.cacheSize += Buffer.byteLength(chunk);
    if(this._bufB.cacheSize >= this.cacheSize || now - this.lastFlushTimeStamp >= this.flushTimeout){
      this.flush('B');
      this.lastFlushTimeStamp = Date.now();
    }
  }
};

StrategyManager.prototype.flush =
  StrategyManager.prototype._flush = function (bufferName) {
    var self = this;
    var cursor;
    // 会存在一种情况，即在高并发下一部分数据始终存在_bufA或_bufB底端无法刷新，
    // 这部分数据只有等到系统处理完双缓冲才能解决，因此采用链表结构仅需更新头部指针即可
    switch(bufferName){
      case 'A':
        cursor = this._bufA;
        this.currentBuffer = 'B';
        // 重置缓冲区
        this._bufA = {};
        this._pA = this._bufA;
        this._bufA.cacheSize = 0;

        // 遍历链表
        do{
          cursor = cursor.next;
          self.stream.write(cursor);
        }while(cursor.next !== undefined);
        break;
      case 'B':
        cursor = this._bufB;
        this.currentBuffer = 'A';
        this._bufB = {};
        this._pB = this._bufB;
        this._bufB.cacheSize = 0;
        // 遍历链表
        do{
          cursor = cursor.next;
          self.stream.write(cursor);
        }while(cursor.next !== undefined);
        /*
        this._bufB.forEach(function(buf){
          self.stream.write(buf);
        });
        this._bufB = [];
        this._bufB.cacheSize = 0;
        this.currentBuffer = 'A';*/
        break;
    }
  };

StrategyManager.prototype._encode = function (string) {
  if (this.encoding === 'utf-8') {
    return new Buffer(string);
  }
  return Buffer.from(string, this.encoding);
};

StrategyManager.prototype.end = function () {
  if (this._timer) {
    clearTimeout(this._timer);
    this._timer = null;
  }

  if (this.stream) {
    if(this.currentBuffer == 'A'){
      this._flush('A');
      this._flush('B');
    }else{
      this._flush('B');
      this._flush('A');
    }

    this.stream.end();
    this.stream = null;
  }
};

StrategyManager.prototype.close = StrategyManager.prototype.end;

module.exports.StrategyManager = StrategyManager;
