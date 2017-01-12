var a = [];
var b={},pointer=b,temp;
for(var i=0;i<2*1024*1024*1024;i++){
//  a.push(1/*new Buffer('a')*/)
  temp = new Buffer('a');
  pointer.next = temp;
  pointer = temp;
}