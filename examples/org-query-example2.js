
var org=require('../lib/org-mode-parser');
org.makelist("./README.org",function(nl){
    var q=new org.OrgQuery(nl);
    var subtree=q.selectSubtree(q.selectTag('releaseNotes').first());
    console.log("Dev version is:"+subtree.selectTag('dev').first().headline); 
});
