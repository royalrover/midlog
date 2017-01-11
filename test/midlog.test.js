'use strict';
/**
 * 针对midlog做百万级压测
 */
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
  }]
});
console.time('midlog press');
for(let i =0;i<1000000;i++){
  logger.info('this is the '+ i + ' test case!');
}
console.timeEnd('midlog press');
