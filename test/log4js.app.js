var koa = require('koa');
var app = koa();
var logger = require('../log4js/logger');
logger.info('i am the global logger');

app.use(function*( next){
  logger.info(this.url+' this is the first valve!! ');
  yield next;
});

app.use(function*(){
  logger.info(this.url+' this is the 2cd valve!! ');
  this.body = '<h1>hello yuxiu</h1>';
});


app.listen(8888);