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
		 */
		var success=performance.nodesPerSeconds>10000;
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
	    }
	    
	    
	}
}).export(module);
