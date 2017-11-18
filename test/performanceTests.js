var vows = require('vows'),
    assert = require('assert'),
    _=require("underscore");



var orgParser=require("../lib/org-mode-parser");
// To understand how the parser works, uncomment the following:
// orgParser.enableDebug();

// The temp file used for some performance tests...
var tempFileName="./test/bigTestFile.org.tmp";
vows.describe('OrgMode API Stability').addBatch({
	'Simple Performance Testing':{
	    topic: function(){
		
		var fs=require('fs');
		var stuffToDuplicate=fs.readFileSync("./test/treeLevel.org",'utf-8');

		// Known emacs trouble near 4234k+ lines...
		// Our test is near this level
		for(var i=1; i<=8; i++){	
		    //console.log(stuffToDuplicate);
		    stuffToDuplicate +=stuffToDuplicate;
		}
		var sizeOfStuff=stuffToDuplicate.split(/\n/).length-1;
		
		// var fd=fs.openSync("./emacsCrasher.org", "w+");
		// fs.writeSync(fd,stuffToDuplicate, 0, 'utf-8');
		// fs.closeSync(fd);

		orgParser.makelistFromStringWithPerformance(stuffToDuplicate,this.callback,true);
	    },

	    'Huge string Loading performance':function(nodelist,performance){		    
		
		/** Examples with max i= 15 we got
		    msPerNode: 0.09316...
                    8000 on poor centrino
		 */
		var success=performance.nodesPerSeconds>8150;
		if(!success ){		   
		  console.dir(performance);  
		} //else console.dir(performance);  
		assert.isTrue(success);	
	    },
	    'Regen Time performance':function(orgNodesList,performance){
		var s="";
		var startTime=Date.now();
		_.each(orgNodesList, function (nx){
			   s+=nx.toOrgString();
		});
		var timeTaken=Date.now()-startTime;
		var nodesPerSeconds= 1000* (orgNodesList.length/timeTaken);	
		console.log("toOrgString() per seconds:"+nodesPerSeconds);
	    },
	    'OrgQuery building time':function(orgNodesList,performance){
		var startTime=Date.now();
		// Trick: we will make a big father here
		_.each(orgNodesList, function (n){
			n.level=n.level+2;
		});
		orgNodesList[0].level=1;
		var q= new orgParser.OrgQuery(orgNodesList);
		console.log("Query Parser build time of "+orgNodesList.length+" Nodes:"+(Date.now()-startTime)+"ms");
		var bigSubtree=q.selectSubtree(orgNodesList[0]);
		console.log("Big Subtree size="+bigSubtree.length);
	    }
	    
	    
	}
}).export(module);
