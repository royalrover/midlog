'use strict';
/**
 * 针对log4js做百万级压测
 */

var log = console.log;
var log4js = require('../log4js/logger');
console.log  = log;
console.time('case2');
for(let i =0;i<1000000;i++){
  log4js.info('this is the '+ i + ' test case!');
}
console.timeEnd('case2');