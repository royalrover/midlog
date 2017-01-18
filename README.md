# 高性能koa日志中间件

## 快速使用

app.js

```
var koa = require('koa');
var midlog = require('midlog');
var app = koa();

// 配置日志中间件
var firstValve = midlog({
  env: 'online',
  exportGlobalLogger: true,
  appender: [{
    type: 'INFO',
    logdir: '/tmp/log/midlog',
    pattern: '%d %r %x{name}:%z %p - %m%n',
    rollingFile: false,
    duation: 60000,
    name: 'info.log',
    nameformat: '[info.]HH-mm-ss[.log]',
    tokens: {
      name: 'helloworld'
    },
    cacheSize: 5 * 1024 * 1024,
    flushTimeout: 15000
  },{
  type: 'ERROR',
    logdir: '/tmp/log/midlog',
    pattern: '%d %r %x{name}:%z %p - %m%n',
    rollingFile: false,
    duation: 60000,
    name: 'error.log',
    nameformat: '[info.]HH-mm-ss[.log]',
    tokens: {
      name: 'helloworld'
    },
    cacheSize: 10240,
    flushTimeout: 10000
},{
    type: 'TRACE',
    logdir: '/tmp/log/midlog',
    pattern: '%d %r %x{name}:%z %p - %m%n',
    rollingFile: false,
    duation: 60000,
    name: 'trace.log',
    nameformat: '[info.]HH-mm-ss[.log]',
    tokens: {
      name: 'helloworld'
    },
    cacheSize: 5 * 1024 * 1024,
    flushTimeout: 10000
  }]
});

// 使用全局的logger接口
logger.info('i am the global logger');

// 将midlog放在中间件的前列
app.use(firstValve);

// 业务中间件
app.use(function*(next){
  this.logger.info(this.url+' this is the first valve!! ');
  this.logger.error('midlog tracing' + this.url+' this is the first valve!! ');
  this.logger.trace('midlog tracing' + this.url+' this is the first valve!! ');
  yield next;
});

app.use(function*(){
  this.logger.info(this.url+' this is the 2cd valve!! ');
  this.logger.error('midlog tracing' + this.url+' this is the 2cd valve!! ');
  this.logger.trace('midlog tracing' + this.url+' this is the 2cd valve!!');
  this.body = '<h1>hello midlog</h1>';
});

app.listen(8888);
```

## 功能

midlog提供了3种日志刷新级别：

  **TRACE、INFO、ERROR**，

并且提供了两种写日志文件的方式：

- 单文件写 （通过设置appender的rollingFile为false触发）

- 文件分时间片写 （通过设置appender的rollingFile为true触发）

midlog采用和log4js相同的layout格式和语法，生成可定制的日志输出格式。

最后，midlog采用多级缓冲的架构（针对单文件写模式采用双缓冲，文件分时写模式采用单缓冲），可以有效的控制Stream写的频率，而缓冲的大小和刷新频率可以由开发者根据实际需要自由设置。

## 配置

- env {String} 环境设置。若设置为**development**，则会在控制台和文件中同时输出日志

- exportGlobalLogger {Boolean} 是否保留全局**logger对象**。设置为true，则在全局使用logger对象

- appender {Array} 日志类型配置数组。数组每一项描述每种类型日志的相关信息及缓冲刷新频率

## appender详解

- type {String} 日志类型。可以为 “INFO、TRACE和ERROR” 任意一种

- logdir {String} 日志文件所在的绝对目录

- rollingFile {Boolean} 是否按照时间进行日志文件分割。设置为true时则按照设置的**duration**间隔分割文件

- duration {Number} 分割日志文件的间隔。若**rollingFile**为true，则按照**duration**大小分割文件

- name {String} 日志文件名称。name属性在**单文件写**模式下有效，在**rollingFile == true**时无效

- nameformat {String} 日志文件格式匹配定义。nameformat属性在**文件分时间片写**模式下有效，即**rollingFile == true**
格式定义的字符串意义如下所示：
```
    'd': 日期和时间,
    'h': 主机名称,
    'm': 日志信息格式化，主要优化错误输出,
    'n': 换行符,
    'p': 日志级别,
    'r': 时间输出,
    'z': 进程号输出,
    '%': 百分号占位符,
    'x': 用户自定义变量或函数，搭配{token}属性
```

- tokens {Object} 与nameformat搭配使用，对象的属性值可为常亮，也可为函数

如定义nameformat为  `pattern: '%d %r %x{name}:%z %p - %m%n'` 且tokens设置为 `{name: 'helloworld'}`

则输出日志格式为：

```
           (%d)           (%r)   (%x{name}) (%z)  (%p)           (%m)               (%n)
2017-01-16 10:59:55.611 10:59:55 helloworld:13736 INFO - / this is the first valve!!
```

- cacheSize {Number} 缓冲大小，单位字节。midlog在**单文件写**模式下采用双缓冲结构控制I/O速率，因此开发者可以通过定义缓冲大小实现高效的写入流程，默认为10kB大小；在**文件分时间片写**模式下该选项无效

- flushTimeout {Number} 缓冲刷新间隔。在**单文件写**和**文件分时间片写**两种模式下都起作用，定点刷新缓冲