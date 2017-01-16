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
    cacheSize: 5*1024*1024,
    flushTimeout: 3000
  }]
});
/*var heapdump = require('heapdump')
var dump = function(){
  var d = new Date();
  var name = d.getDate() + '-' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
  var p = name + '.heapsnapshot';
  heapdump.writeSnapshot(p,function(err, filename){
    console.log('dump written to ' + filename);
  });
  return p;
};
dump();*/
console.time('midlog press');
for(let i =0;i<1000000;i++){
  /*if(i == 500000 || i == 100000 || i == 999999){
    dump();
  }*/
  process.nextTick(function(){
    logger.info('this is the '+i+' test case!');
  })

}

/*setTimeout(function(){
  logger.info('11111');
},30000)*/
console.timeEnd('midlog press');
