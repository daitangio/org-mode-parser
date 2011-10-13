
/***
 * A very very simple example of rendering of a org file in a 
 * browsable web site.
 * The rendering is fair simple,
 * and the data structure needs improvements.
 * Anyway, it rocks, try out with
 *  org-mode-parser>nodemon examples/example-org-file-serving.js ./README.org
 */
var http = require('http');
var path = require('path');
var fs = require('fs');
var util=require('util');
var _=require("underscore");

var orgParser=require("../lib/org-mode-parser");


var orgNodes=orgParser.makelist(process.argv[2], function (nodes){


function renderNavigation(node,vfilePath){
    var content="";
    //webNextNode
    if(node.webNextNode){
	content +="<a  href='"+node.webNextNode.webPath +"'> Next</a> "+ node.webNextNode.webPath;
	content +="<br>";
    }
    
    content+="<h2>Sub Nodes</h2>";
    _.each(_.keys(path2node),function (pathx){
	    if(pathx.match(vfilePath)){
		content+='<a href=\"'+pathx+'" >'+pathx+' </a><br>';
	    }
    });
    content +="<br><b><a href='/'>TOP</a></b>";
    return content;
}

function renderNode(node,vfilePath){
    var content=node.headline+"<br>";
    content+="<pre>"+node.body+"</pre>";
    // Find out sub paths...
    content+=renderNavigation(node,vfilePath);
    return content;
}




    console.log("OK, Read:"+nodes.length+" Nodes");
    // Build an associative array, using headline or special property weburl
    var path2node=new Array();
    var handyUrlList=[];
    function mapNode(fatherString,n){
	var path=fatherString+"/";
	if("weburl" in n.properties){
	    path+=n.properties["weburl"];
	}else{
	    path+=n.headline.toLowerCase()
		    .replace(/\s/g,'-')
		    //.replace(/the|and|of/g,"")
		    .replace(/["'?!*+():,;./]/g,"").replace(/-+/g,"-");
	}
	if(path in path2node){
	    path+="2";
	    console.log("WARN: DUPLICATION..."+path);
	}
	path2node[path]=n;
	n.webPath=path;
	handyUrlList.push(path);
	return path;
    }
    var query= new orgParser.OrgQuery(nodes);

    
    function processLevel(collection,levelToScan,fatherPath){
	_.each(collection,function (n,i){
	   // Process required level and then recurse
	   if(n.level==levelToScan){

	       var path=mapNode(fatherPath,n);
	       console.log(levelToScan+' '+ path+"\t=>\t"+n.headline); 
	       var subtree=query.selectSubtree(n);
	       processLevel(subtree.toArray(),levelToScan+1, path);
	   }
       });
	
    }
    processLevel(query.toArray(),1,"");
				    
    // Builds webPrevNode,webNextNode	
    var prevNode=null, nextNode=null;
    _.each(nodes, function(n){
	n.webPrevNode=prevNode;
	prevNode=n;
	if(n.webPrevNode){
	    n.webPrevNode.webNextNode=n;
	}
    });
				    
    

    //var defaultUrl=handyUrlList[0];
    //console.log("Index:"+defaultUrl);

    http.createServer(function (request, response) {

    	console.log('request starting... Dest is:'+request.url);

    	    var vfilePath = request.url;

    	    // if (vfilePath == '/'){
	    // 	vfilePath = defaultUrl;		    
	    // }
    		    

	    if( vfilePath in path2node){
		var node=path2node[vfilePath];
		var content=renderNode(node,vfilePath);
		response.writeHead(200, { 'Content-Type': 'text/html' });
		response.end(content, 'utf-8');
	    }else{
		// Emit a list...
		var content="Path not found. Try out:<br>";
		_.each(handyUrlList, function (k){
			content +="<h1>"+k+"</h1>";
			content +=renderNavigation(path2node[k],k);
		});
		response.writeHead(200, { 'Content-Type': 'text/html' });
		response.end(content, 'utf-8');
	    }
    	   

    }).listen(8080);

console.log('Server running at http://127.0.0.1:8080/');

});
