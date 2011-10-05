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
var util=require('util');
var _=require("underscore");
var fs=require("fs");


//var debug=console.log;
var debug=function (){};

function enableDebug(){
    debug=util.debug;
}
exports.enableDebug=enableDebug;

// Low level functions
var asLines=function (data){
    return data.split(/\n/);
};
exports.asLines=asLines;


/**
 * Simple binder
 */
var bindFunction2This=function(f,this_context){
    return function() {return f.apply(this_context,arguments);};
};


/**
 * Intercepts a method by replacing the prototype's implementation
 * with a wrapper that invokes the given interceptor instead.
 * 
 *     utils.intercept(core.Element, 'inserBefore',
 *       function(_super, args, newChild, refChild) {
 *         console.log('insertBefore', newChild, refChild);
 *         return _super.apply(this, args);
 *       }
 *     );
 */
exports.intercept = function(clazz, method, interceptor) {
  var proto = clazz.prototype,
      _super = proto[method],
      unwrapArgs = interceptor.length > 2;

  proto[method] = function() {
    if (unwrapArgs) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(_super, arguments);
      return interceptor.apply(this, args);
    }
    else {
      return interceptor.call(this, _super, arguments);
    }
  };
};
// End Low Level


var Orgnode=(function ()
{
    /**
     *      Create an Orgnode object given the parameters of level (as the
     raw asterisks), headline text (including the TODO tag), and
     first tag. The makelist routine postprocesses the list to
     identify TODO tags and updates headline and todo fields.

     */
        function Orgnode(level, headline, body, tag, alltags){	    
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

	    _.each(alltags,function (t){
		    this.tags[t]=true;
	    },this);
        };
        //Orgnode.prototype.qualcosa = function (dataToSet){
        return Orgnode;  
})();

exports.Orgnode=Orgnode;
console.dir(Orgnode);




/**
 * Parse the file, builds a set of orgnodeobjects and live happy
 */
var parseBigString=function (data){


    // We allocate here a bunch of regular expression to avoid
    // redelaring them every time
    // 
    var scheduledRE=/SCHEDULED:\s+<([0-9]+)\-([0-9]+)\-([0-9]+)/;
    var deadlineRE=/DEADLINE:\s*<(\d+)\-(\d+)\-(\d+)/;    
    var property_startRE=/:PROPERTIES:/;
    var property_endRE=/:END:/;
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


    var insidePropertyBlock=false;
    // Split in lines and go

    var fileLines=asLines(data);
    for(var index in fileLines){
	var line=fileLines[index];
	ctr++;
	var headingRegexp=/^(\*+)\s(.*?)\s*$/;	
	var hdgn = line.match(headingRegexp);
	//debug(':'+line+": "+JSON.stringify(hdgn));
	if (hdgn){
	    if(heading){
		// we are processing a heading line
		var thisNode= new Orgnode(level, heading, bodytext, tag1, alltags);
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
		nodelist.push( thisNode ); // append python is push in javascript
		propdict={}; 
	    }
	    //....
	    level=hdgn[1]; // i.e. * ** etc
	    heading=hdgn[2];
	    bodytext = "";
            tag1 = null;
	    alltags = [];       // list of all tags in headline
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
	    if (line[0]!='#' && (!startProp) && (!endProp) && !insidePropertyBlock){
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
		    // Simple line, last resort
		    bodytext += line+"\n";
		}
				
	    }else{
	
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
    // TODO  write out last node  
    var thisNode = new Orgnode(level, heading, bodytext, tag1, alltags);
    thisNode.properties=propdict;
    if(sched_date)
      thisNode.scheduled=sched_date;
    if (deadline_date)
      thisNode.deadline=deadline_date;
    nodelist.push( thisNode );
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
		var timeTaken=Date.now()-startTime;
		var result={
		    totalTime:timeTaken,
		    msPerNode:(timeTaken/orgNodesList.length),
		    totalNodes:orgNodesList.length
		};
		processFunction(orgNodesList,result);
	    }else{
		processFunction(orgNodesList);
	    }
	    
	} catch (x) {
	    throw new Error("makelist: processFunction thrown "+x);
	}

    });
   
};

var makelistWithPerformance = function (fileName,processFunction){
    makelist(fileName,processFunction,true);
};

exports.makelistWithPerformance=makelistWithPerformance;
exports.makelist=makelist;
