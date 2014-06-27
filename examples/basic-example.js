
var org=require('../lib/org-mode-parser');
org.makelist("README.org", function (nodelist){
   // Here nodelist is a list of Orgnode objects 
   console.dir(nodelist[0]);
});
