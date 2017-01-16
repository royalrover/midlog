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
    cacheSize: 5 * 1024 * 1024,
    flushTimeout: 15000
  }/*,{
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
}*/]
});

logger.info('i am the global logger');

app.use(firstValve);

app.use(function*( next){
  this.logger.info(this.url+' this is the first valve!! ');
  yield next;
});

app.use(function*(){
  this.logger.info(this.url+' this is the 2cd valve!! ');
  this.body = '<h1>hello yuxiu</h1>';
});


app.listen(8888);