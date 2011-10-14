
var org=require('../lib/org-mode-parser');
org.makelist("./test/treeLevel.org",function(nodes){
    var ofd=new org.OrgQuery(nodes);
    //  ofd is a complex object wiith let you do query and so on
    console.log(ofd.selectTag('complex').first().toOrgString());
});
