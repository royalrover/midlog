var koa = require('koa');
var app = koa();
var midlog = require('./../reqContainer');
var firstValve = midlog({
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
    flushTimeout: 10000
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

logger.info('i am the global logger');

app.use(firstValve);

app.use(function*(){
  this.logger.info(this.url);
  this.body = '<h1>hello yuxiu</h1>';
});

app.listen(8888);