/**
 * Author: Giovanni Giorgi jj@gioorgi.com
 * For version and example, take a look to:
 * http://gioorgi.com/org-mode-parser
 * 
 * 
 * 
 * Initally based on Charles Cave's OrgNode python parser (charlesweb@optusnet.com.au)
    http://members.optusnet.com.au/~charles57/GTD
 * 
 * 
 *  Permission  is  hereby  granted,  free  of charge,  to  any  person
 *  obtaining  a copy  of  this software  and associated  documentation
 *  files   (the  "Software"),   to  deal   in  the   Software  without
 *  restriction, including without limitation  the rights to use, copy,
 *  modify, merge, publish,  distribute, sublicense, and/or sell copies
 *  of  the Software, and  to permit  persons to  whom the  Software is
 *  furnished to do so, subject to the following conditions:
 * 
 *  The above copyright notice and this permission notice shall be
 *  included in all copies or substantial portions of the Software.
 * 
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 *  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 *  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 *  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 *  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 */

(function (){
var util=require('util');
var _=require("underscore");
var fs=require("fs");


var debug=function (){};

function enableDebug(){
    debug=util.debug;
}
exports.enableDebug=enableDebug;

//enableDebug();

// Low level functions
var asLines=function (data){
    return data.split(/\n/);
};
exports.asLines=asLines;


// End Low Level

// EXCEPTIONS....
// See http://stackoverflow.com/questions/1382107/whats-a-good-way-to-extend-error-in-javascript
// on what is the better way to define JavaScript Exceptions.
var IllegalArgumentException=function(){
	Error.apply(this, arguments);
};
IllegalArgumentException.prototype = new Error();
IllegalArgumentException.prototype.constructor = IllegalArgumentException;
IllegalArgumentException.prototype.name = 'IllegalArgumentException';
exports.IllegalArgumentException=IllegalArgumentException;



var ParseError=function(){
	Error.apply(this, arguments);
};
ParseError.prototype = new Error();
ParseError.prototype.constructor = ParseError;
ParseError.prototype.name = 'ParseError';
exports.ParseError=ParseError;


var Orgnode=(function ()
{
    /**
     *      Create an Orgnode object given the parameters of level (as the
     raw asterisks), headline text (including the TODO tag), and
     first tag. The makelist routine postprocesses the list to
     identify TODO tags and updates headline and todo fields.

     */
        function Orgnode(level, headline, body, tag, alltags,drawerArray){	
	    if(arguments.length!=6){
		throw new IllegalArgumentException("Orgnode requires exactly 5 input parameters. Input:"+
			       JSON.stringify(_.toArray(arguments)));
	    }
	    // alltags MUST BE a collection if present...
	    if(alltags){
		if(!_.isArray(alltags)){
		    throw new IllegalArgumentException("alltags parameters must be an array");
		}
	    }
	    // drawerArray is present must be a coolection!
	    
	    
	    this.key=_.uniqueId('orgNode_')+"."+level;
	    this.level = level.length;
            this.headline = headline;
            this.body = body;
            this.tag = tag ;           // The first tag in the list
            this.tags = {};        // All tags in the headline
            this.todo = null;
            this.priority = null;            // empty of A, B or C
            this.scheduled = null;       // Scheduled date
            this.deadline =  null;       // Deadline date
            this.properties = {};

	    this.drawer=drawerArray;

	    _.each(alltags,function (t){
		    this.tags[t]=true;
	    },this);

	    
        };

        Orgnode.prototype.toOrgString = function (){
	    //console.dir(this);
	    var n='';
	    for(var i=1; i<=this.level;i++){
		n+='*';
	    }
	    if(this.todo) {n+=' '+this.todo;};
	    n+=' ';
	    if(this.priority){
		n+=  '[#' + this.priority + '] ';
	    }
	    n+=this.headline;
	    // tags will start in column 62
	    while(n.length<=61){
		n+=' ';
	    }
	    // Tag expansion	    
	    var tagKeys=_.keys(this.tags);	    
	    if(tagKeys.length>0){
		_.each(tagKeys, function(t){			       			 
		    n+=':'+t;		    
		});
		n+=':';
	    }
	    n+='\n';
	    // PROPERTIES
	    var pList='';
	    _.each(this.properties,function (v,k){
		    pList+=":"+k+":"+v+"\n";  
	    });
	    if(pList!==''){
		n+=":PROPERTIES:\n"+pList+":END:\n";
	    }
	    // Still missed: SCHEDULED, DEADLINE
	    n+=this.body;
	    // If last line has a double \n\n remove one of them...
	    var i2=n.length-1-1;
	    if(n[i2]===n[i2+1] && n[i2]==='\n'){
		n=n.slice(0,i2+1);		
	    }
	    return n;
	};

	Orgnode.prototype.isArchived = function (){
	    return this.tags['ARCHIVE'] === true;
	};

        return Orgnode;  
})();







/**
 * Parse the file, builds a set of orgnodeobjects and live happy
 */
var parseBigString=function (data){


    // We allocate here a bunch of regular expression to avoid
    // redelaring them every time
    // 
    var scheduledRE=/SCHEDULED:\s+<([0-9]+)\-([0-9]+)\-([0-9]+)/;
    var deadlineRE=/DEADLINE:\s*<(\d+)\-(\d+)\-(\d+)/;   
    var drawerFinderRE=/\s*:([a-zA-Z_0-9]+):/;
    var property_startRE=/\s*:PROPERTIES:/;
    var property_endRE=/\s*:END:/;
    var singlePropertyMatcherRE=/^\s*:(.*?):\s*(.*?)\s*$/;
    // CLock variants we must at least detect:
    //   CLOCK: [2011-10-04 Tue 16:08]--[2011-10-04 Tue 16:09] =>  0:01
    //   CLOCK: [2011-10-04 Tue 16:41]
    var clockLineDetectionRE=/^\s*CLOCK:\s*\[[-0-9]+\s+.*\d:\d\d\]/;
    var ctr=0;
    var     todos         = {}  ; // populated from ; #+SEQ_TODO line
    todos['TODO'] = ''   ; // default values
    todos['DONE'] = ''   ; // default values
    var     level         = 0 ;
    var     heading       = "";
    var     bodytext      = "";
    var     tag1          = null      ; // The first tag enclosed in ::
    var     alltags       = []      ; // list of all tags in headline
    var     sched_date    = '';
    var     deadline_date = '';
    var     nodelist      = [];
    var     propdict      = {};

    
    var drawerArray={};

    var insidePropertyBlock=false;
    // Split in lines and go

    var fileLines=asLines(data);
    /**
     * The parser is able to push the 
     * index variable
     * in some special cases.
     */
    for(var index=0; index <fileLines.length; index++){
	var line=fileLines[index];
	ctr++;
	var headingRegexp=/^(\*+)\s(.*?)\s*$/;	
	var hdgn = line.match(headingRegexp);
	//debug(':'+line+": "+JSON.stringify(hdgn));
	if (hdgn){	    
	    if(heading){
		// we are processing a heading line
		var thisNode= new Orgnode(level, heading, bodytext, tag1, alltags,drawerArray);
		// 
		if(sched_date) {
		    thisNode.scheduled=sched_date;
		    sched_date = "";
		}
		// 
		if(deadline_date){
		    thisNode.deadline=deadline_date;
		    deadline_date = '';
		}
		thisNode.properties=propdict;


		nodelist.push( thisNode );
		propdict={}; 
	    }
	    //.... RE-INIT 'this-node' VARIABLES
	    level=hdgn[1]; // i.e. * ** etc
	    heading=hdgn[2];
	    bodytext = "";
            tag1 = null;
	    alltags = [];       // list of all tags in headline
	    drawerArray={};

	    // WAS tagsrch = re.search('(.*?)\s*:(.*?):(.*?)$',heading)	  
	    var tagsrch=heading.match(/(.*?)\s*:(.*?):(.*?)$/);
	    if (tagsrch){
		// debug("Tag founds:"+JSON.stringify(tagsrch));
		// Correct the heading
		heading = tagsrch[1];
		tag1 = tagsrch[2];
		alltags.push(tag1);
		tag2 = tagsrch[3];
		if(tag2){
		    // Sub tag parsing... 
		    //debug("Tag after the first:"+tag2);
		    _.each(tag2.split(/:/),function (t){
			       if(t!=='') alltags.push(t);
		    });
		    //debug(JSON.stringify(alltags));
		}

	    }
		
	}else{
	    //we are processing a non-heading line
	    var startProp=line.match(property_startRE);
	    var endProp=line.match(property_endRE);
	    var isAScheduledOrDeadlineLine=line.match(scheduledRE) || line.match(deadlineRE);
	    var isAClockLine=line.match(clockLineDetectionRE);
	    var isSpecial=isAScheduledOrDeadlineLine || isAClockLine;
	    var isDrawerStart=line.match(drawerFinderRE);

	    var isSimpleText=
		line[0]!='#' && (!startProp) && (!endProp) && !insidePropertyBlock &&
		!isDrawerStart &&
		!isSpecial;
	    
	    if(isSimpleText){
		// Simple line
		bodytext += line+"\n";
		// FAST EXIT
		continue;
	    }
	    

	    
	    if(isSpecial){
		    //console.log("...?"+line);
		    // Example SCHEDULED: <2011-12-31 Sat>
		    var scheduledStuff=line.match(scheduledRE);
		    if(scheduledStuff){
			//debug("Matched:"+line);
			// new Date(year, month, day, hours, minutes, seconds, ms)
			sched_date= new Date(scheduledStuff[1], scheduledStuff[2],scheduledStuff[3],
					 0,0,0,0);
		    }
		    var deadlineStuff=line.match(deadlineRE);
		    if(deadlineStuff){
			deadline_date= new Date(deadlineStuff[1], deadlineStuff[2],deadlineStuff[3],
			0,0,0,0);
		    }
		    if(isAClockLine){
			// For the meantime we do nothing...
			// in the future we should be able to manage it
		    }								
	    }else{
		// Drawer/Property parser STARTS HERE
		if(startProp || isDrawerStart){
		    if(startProp){	
			// Property Parser
			while(!endProp){
			    // Update line and flags
			    index++;			    
			    line=fileLines[index];			    
			    endProp=line.match(property_endRE);
			    var prop_srch = line.match(singlePropertyMatcherRE);
			    if(prop_srch){
				if(!endProp) {
				    propdict[prop_srch[1]] = prop_srch[2];
				}				    
			    }else{
				throw new ParseError("No property inside a property drawer:"+line);
			    }
			}
		    }else{
			if(isDrawerStart /*&& (!endProp)*/){
			    //Drawer Parser
			    var drawerName=isDrawerStart[1];			    
			    var drawerContent="";
			    // Drawer parsing cycle
			    while(!endProp && (index < fileLines.length-1)){
				index++;			    
				line=fileLines[index];			    
				endProp=line.match(property_endRE);				
				if(!endProp){
				    // Drawer could be indented... rip it...
				    drawerContent+=line.trim()+"\n";
				}
			    }
			    if(!endProp && index==(fileLines.length-1)){
				// We are at the end without nothing... Please Fire...
				 throw new ParseError(' DRAWER :'+drawerName+': Found but :END: missed');
				
			    }
			    drawerArray[drawerName]=drawerContent;
			    debug(
				'Processed Drawer...'+heading+ ' ' +drawerName+ " OK");			    
			}
		    }
		    // Ends here, index is pointing to endProp and the for will
		    // increase it right			
		    continue;
		} 
		// Drawer / Property parser ENDS here
		

		if(startProp)  { insidePropertyBlock=true; continue;}
		if(endProp)    { insidePropertyBlock=false; continue;}
		var prop_srch = line.match(singlePropertyMatcherRE);
		if(prop_srch){
		    debug("PROPERTY FOUND:"+line);
		    propdict[prop_srch[1]] = prop_srch[2];
		    continue;
		}
		

		if(!insidePropertyBlock){


		    var seqTodo=line.match(/^#[+]SEQ_TODO:\s*(.*)/);
		    if(seqTodo){
			debug("Found TODO LIST:"+seqTodo[1]);
			var splittedTodos=seqTodo[1].match(/([A-Z]+(\(\w\))?)/g);
			// WAITING(w) etc
			//debug(JSON.stringify(todos));
			_.each(splittedTodos,function (tagWithAbbrev){
				var pureTag=tagWithAbbrev.match(/[A-Z]+/)[0];
				debug("Tag pure:"+pureTag);
				todos[pureTag]='';
			});
		    }
		}
	    }
	    
	    
	}
	//debug(index+" " +line+ " OK");
    }//for
    // write out last node  
    var thisNode = new Orgnode(level, heading, bodytext, tag1, alltags,drawerArray);
    thisNode.properties=propdict;
    if(sched_date)
      thisNode.scheduled=sched_date;
    if (deadline_date)
      thisNode.deadline=deadline_date;

    nodelist.push( thisNode );

    if(insidePropertyBlock){ 
	 throw new ParseError(":PROPERTIES: Found but not ending :END: found");
    }

    // Using the list of TODO keywords found in the file
    // process the headings searching for TODO keywords
    // Heading will be modified to track down the TODO keywords right now
    _.each(nodelist,function(n){
	    //debug(JSON.stringify(n));
	    var h=n.headline;
	    var todoSrch = h.match(/([A-Z]+)\s(.*?)$/);
	    if(todoSrch){
		var key=todoSrch[1];
		if(key in todos){
		    n.headline=todoSrch[2];
		    n.todo=key;
		}
	    }	      
	   var prioritySearch= n.headline.match(/^\[\#(A|B|C)\] (.*?)$/);
	   if (prioritySearch) {
	       n.priority=prioritySearch[1];
	       n.headline=prioritySearch[2];
	   }
	   if(h!==n.headline){
		   debug("Headline... "+h+" -> "+n.headline);
	   }

    });
    return nodelist;

};

exports.parseBigString=parseBigString;

var makelist=function(fileName, processFunction, passPerformanceAlso){

    fs.readFile(fileName, 'utf-8',function (err,data){
	if (err) throw err;
	var startTime=Date.now(); // Millisecond acc
	var orgNodesList;
	try {
	    orgNodesList=parseBigString(data);    
	} catch (x) {
	    debug("PARSE FAILED:"+x);
	    throw x;
	}
	
	try {
	    if(passPerformanceAlso){
		// In milliseconds...
		var timeTaken=Date.now()-startTime;
		var secondsTaken=timeTaken/1000;
		var result={
		    totalTime:timeTaken,
		    msPerNode:(timeTaken/orgNodesList.length),
		    totalNodes:orgNodesList.length,
		    nodesPerSeconds: (orgNodesList.length/secondsTaken)
		};
		processFunction(orgNodesList,result);
	    }else{
		processFunction(orgNodesList);
	    }
	    
	} catch (x) {
	    debug("makelist(): Error during Call of 'processFunction'"+x);
	    throw x;
	}

    });
   
};

var makelistWithPerformance = function (fileName,processFunction){
    makelist(fileName,processFunction,true);
};



// A new object for overall information, subtree-querying
var OrgQuery=(function ()
{
    /**
     * An OrgQuery is used to group and summarize a set of information from a list of nodes
     * It would also provide a subtree slicing method set.
     * TODO: Compress and optimize in only one cycle!
     * TODO2: Must return an ARRAY LIKE OBJECT!
     *
     */
        function OrgQuery(nodes,masterHeadlineOrNull){
	    // Safety Argument checkings...

	    if(_.isNull(nodes)){
		throw new IllegalArgumentException("First arguments {nodes} cannot be Null" );
	    }

	    _.each(nodes,function (n,index){
		if( ! (n instanceof Orgnode)){
		    throw new IllegalArgumentException("Argument "+(n+1)+" is not an Orgnode. Input:"+JSON.stringify(arguments));
		}
	    });
	    // -----
	    this.fileTags={};
	    this.allNodes=nodes;
	    if(masterHeadlineOrNull){
		this.description=masterHeadlineOrNull;
	    }else{
		//this.description=null;
	    }
	    var mySubtreeMap={};
	    var myFileTags=this.fileTags;
	    _.each(nodes,function(n){
		_.each(n.tags,function(v,k){
		    myFileTags[k]=true;
		});
	    });
	    // Build the subtree mapping...
	    // For every node, build a subtree list...
	    var indexer=0;
	    _.each(nodes,function(n){	
		indexer++;
		var myMap=[];
		var nodeLevel=n.level;
		// Slice below the node...
		var toTest=nodes.slice(indexer);		
		var checkIndex=0;
		var subNodeCandidate=toTest[checkIndex];
		while(checkIndex<toTest.length 
		      && 
		      subNodeCandidate.level>nodeLevel)
		{
		    myMap.push(subNodeCandidate);
		    checkIndex++;
		    subNodeCandidate=toTest[checkIndex];
		}
		//console.log(n.headline);
		//console.dir(myMap);
		mySubtreeMap[n.key]=new OrgQuery(myMap,n.headline);	  
	    });
	    this.subTreeMap=mySubtreeMap;
	    this.length=this.allNodes.length;
        };
        /** Return always a OrgQuery object */
        OrgQuery.prototype.selectSubtree = function (nodeObj){
	    if(nodeObj!==null && nodeObj!==undefined){
		return this.subTreeMap[nodeObj.key];		
	    }else{
		return this.allNodes;
	    }

	};
	OrgQuery.prototype.selectTag= function(tagName){
	  var nodes=[] ;
	  _.each(this.allNodes, function(n){
	      if( tagName in n.tags){
		  nodes.push(n);
	      }
	  });
	  return new OrgQuery(nodes);
	};

	// Private manipulation function
	
	// Ordering and rejecting, returning ALWAYS a OrgQuery object
	OrgQuery.prototype.sortBy=function (fSort){
	    var newNodeList=_.sortBy(this.allNodes,fSort);
	    return new OrgQuery(newNodeList);	     
	};
	
	OrgQuery.prototype.reject=function (rejector){
	    var newNodeList=_.reject(this.allNodes,rejector);
	    return new OrgQuery(newNodeList);
	};

	OrgQuery.prototype.rejectTag=function (tagName){
	    return this.reject(function(n){
		 return n.tags[tagName]===true;
	    });
	};

	OrgQuery.prototype.rejectArchived=function(tagName){
	    return this.rejectTag('ARCHIVE');
	};


	OrgQuery.prototype.first= function(tagName){
	    return this.allNodes[0];
	};
        
	OrgQuery.prototype.toOrgString= function(){
	    var s='';
	    _.each(this.allNodes, function(n){
		s+=n.toOrgString();
	    });
	    return s;
	};
	OrgQuery.prototype.toArray=function(){
	    return _.toArray(this.allNodes);
	};
	OrgQuery.prototype.each=function(f_toCall){
	    _.each(this.toArray(),f_toCall);
	    return this;
	};
		
	OrgQuery.prototype.random=function(){
	    var randomIndex=Math.round(Math.random()*(this.length-1));
	    //console.log("HI:"+randomIndex+ " "+this.length);
	    return this.allNodes[randomIndex];
	};

	
        return OrgQuery;  
})();



exports.Orgnode=Orgnode;
exports.makelistWithPerformance=makelistWithPerformance;
exports.makelist=makelist;

exports.OrgQuery=OrgQuery;
})();
