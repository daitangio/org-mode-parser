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

// Object Merging
// http://stackoverflow.com/questions/5055746/cloning-an-object-in-node-js
// This particular version copy all properties of source on dest:
// dest.mergeFrom(source)
// overriding every object.
// Object.defineProperty(Object.prototype, "mergeFrom", {
//     enumerable: false,
//     value: function(from) {
//         var props = Object.getOwnPropertyNames(from);
//         var dest = this;
//         props.forEach(function(name) {
//             var destination = Object.getOwnPropertyDescriptor(from, name);
//             Object.defineProperty(dest, name, destination);
//         });
//  this.mergeMark="Merged  "+props.length+" props";
//  this.mergedObject=true;
//         return this;
//     }
// });

// End Low Level

// EXCEPTIONS: canged from 0.8 for better node integration
var IllegalArgumentException=function(m){
    return new Error("IllegalArgumentException: "+ m);
};
//exports.IllegalArgumentException=IllegalArgumentException;



var ParseError=function(m){
    return new Error("ParseError: "+ m);
};
//exports.ParseError=ParseError;


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
            throw IllegalArgumentException("Orgnode requires exactly 6 input parameters. Input:"+
                                           JSON.stringify(_.toArray(arguments)));
        }
        // alltags MUST BE a collection if present...
        if(alltags){
            if(!_.isArray(alltags)){
                throw IllegalArgumentException("alltags parameter must be an array");
            }
        }
        // drawerArray is present must be a coolection!
        if(drawerArray){
            if( !_.isObject(drawerArray)){
                //console.dir(arguments);
                throw IllegalArgumentException("drawerArray parameter must be an array");
            }
        }

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


/*Process a matching regexp on the given line, using the provided function
 */
function processRline(myregexp,line,func){
   var matchParams=line.match(myregexp);
   if(matchParams){
       func(matchParams,line);
       return true;
   }else{
       return false;
   }
}





/**
 * Parse the input, builds a set of orgnode objects and live happy
 */
var parseBigString=function (data){


    // We allocate here a bunch of regular expression to avoid
    // redelaring them every time
    //
    var scheduledRE=/SCHEDULED:\s+<([0-9]+)\-([0-9]+)\-([0-9]+)/;
    var deadlineRE=/DEADLINE:\s*<(\d+)\-(\d+)\-(\d+)/;

    var drawerFinderRE=/\s*:([a-zA-Z_0-9]+):$/;
    var property_startRE=/\s*:PROPERTIES:/;
    var drawerENDRE=/\s*:END:/;
    var singlePropertyMatcherRE=/^\s*:(.*?):\s*(.*?)\s*$/;
    // CLock variants we must at least detect:
    //   CLOCK: [2011-10-04 Tue 16:08]--[2011-10-04 Tue 16:09] =>  0:01
    //   CLOCK: [2011-10-04 Tue 16:41]
    var clockLineDetectionRE=/^\s*CLOCK:\s*\[[-0-9]+\s+.*\d:\d\d\]/;
    var     todos         = {}  ; // populated from ; #+SEQ_TODO line
    todos['TODO'] = ''   ; // default values
    todos['DONE'] = ''   ; // default values


    // Split in lines and go
    var linesWithComments=asLines(data);
    var fileLines=[];

    var unknownDirectives=[];

    // Pre ripping #+ lines...
    var SEQ_TODO_RE=/^#[+]SEQ_TODO:\s*(.*)/;
    // #+DRAWERS: DRAWER_ONE DRAWER_TWO Drawer1 Drawer2
    var drawersDeclaration=/#[+]DRAWERS:(.*)$/;
    var ripSpacedElements=/([A-Z]+(\(\w\))?)/g;





  // [whacked modification]
  // these directives are from the standard org export template options
  var opt_directive = new Object()
  var arr_linedirective = ["TITLE", "AUTHOR", "EMAIL",
                           "DATE", "DESCRIPTION", "KEYWORDS", "LANGUAGE",
                           "EXPORT_SELECT_TAGS", "EXPORT_EXCLUDE_TAGS",
                           "LINK", "LINK_UP", "LINK_HOME", "XSLT"]
  var arr_hashdirective = ["INFOJS_OPT", "OPTIONS"]
  var directive_RE = function(d) {return new RegExp("^#\\+"+d+":\\s*(.*)", "i")}


  var in_source_block = null;

    //var other_comment_RE = /^#.*/;
    // [/whacked modification]


    // #+directive is a directive not a comment
    // WAS: var commentLines_RE=/^#[+](.*)/;
    var commentLines_RE=/^#[^+](.*)/i;
    var directive_RE=/^#[+]([a-z_]).*/i;


    /** This pre-parsing  code
     * strip away org-mode comments.
     * Also, it pre-collect SEQ_TODO evil directive (!) to be able to recognize them later.
     * Unknown directive are retained (because you could need to parse them later)
     */
    for(var index=0; index <linesWithComments.length; index++){
        var line=linesWithComments[index];

        if(line.match(commentLines_RE)){
            debug("Ignored comment:"+line);
            continue;
        }else{


            if(!line.match(directive_RE)){
                fileLines.push(line);
            }else{
                // Special directive pre-handling
                //debug("Directive:"+line);
                var processed;
                processed = processRline(SEQ_TODO_RE,line,function(seqTodo){
                    debug("Found TODO LIST:"+seqTodo[1]);
                    var splittedTodos=seqTodo[1].match(ripSpacedElements);
                    // WAITING(w) etc
                    //debug(JSON.stringify(todos));
                    _.each(splittedTodos,function (tagWithAbbrev){
                        var pureTag=tagWithAbbrev.match(/[A-Z]+/)[0];
                        debug("Tag pure:"+pureTag);
                        todos[pureTag]='';
                    });

                });

                /** this code traps
                 * the #+begin_src/#+end_src which must be post processed
                 */
                if(!processed){
                    //unknownDirectives.push(line);
                    debug("Directive not yet processed:"+line);
                    fileLines.push(line);
                }
            }
        }
    } // for
    // ----------------------------------------
    //if(unknownDirectives.length >0) console.dir(unknownDirectives);

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

    var insideSrcBlock=false;
    var begin_src_RE = /^#\+begin_src\s+(.*)/i;
    var end_src_RE = /^#\+end_src\s*/i;
    /**
     * While parsing drawers, the cycle will push forward the
     * index variable.
     * Remember to do unit test on case limits, like unexpected end of file...
     */
    for(var index=0; index <fileLines.length; index++){

        // <<<<<<< HEAD
        var line=fileLines[index];
        var headingRegexp=/^(\*+)\s(.*?)\s*$/;
        var hdgn = line.match(headingRegexp);

        debug("*"+line);
        // GG: New part to manage Src Block
        var srcBlock=line.match(begin_src_RE);
        if(!insideSrcBlock && srcBlock){
            insideSrcBlock=true;
            bodytext += line+"\n";
            continue;
        }
        if(insideSrcBlock && line.match(end_src_RE)){
            // We must exit
            insideSrcBlock=false;
            bodytext += line+"\n";
            continue;
        }
        if(insideSrcBlock){
            bodytext += line+"\n";
            continue;
        }
        // End Src Block Management






        //debug(':'+line+": "+JSON.stringify(hdgn));
        if (hdgn){

        // [whacked modification]
        // nodelist is empty so far, but we have bodytext = special case =
        // empty first node.  this should be speced, but doesn't fit the
        // Orgnode approach. might be painful later...
        /*
        if(nodelist.length == 0 && bodytext){
              var thisNode= new Orgnode(level, heading, bodytext, tag1, alltags,drawerArray);
              nodelist.push( thisNode );
          } else
         // [/whacked modification]
        */

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
            var endDrawer=line.match(drawerENDRE);
            var isAScheduledOrDeadlineLine=line.match(scheduledRE) || line.match(deadlineRE);
            var isAClockLine=line.match(clockLineDetectionRE);
            var isSpecial=isAScheduledOrDeadlineLine || isAClockLine;
            var isDrawerStart=line.match(drawerFinderRE);

            var isSimpleText=
                    line[0]!='#' && (!startProp) && (!endDrawer) &&
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
                        while(!endDrawer){
                            // Update line and flags
                            index++;
                            line=fileLines[index];
                            endDrawer=line.match(drawerENDRE);
                            var prop_srch = line.match(singlePropertyMatcherRE);
                            if(prop_srch){
                                if(!endDrawer) {
                                    propdict[prop_srch[1]] = prop_srch[2];
                                }
                            }else{
                                throw ParseError("No property inside a property drawer:"+line);
                            }
                        }
                    }else{
                        if(isDrawerStart /*&& (!endDrawer)*/){
                            //Drawer Parser
                            var drawerName=isDrawerStart[1];
                            var drawerContent="";
                            // Drawer parsing cycle
                            while(!endDrawer && (index < fileLines.length-1)){
                                index++;
                                line=fileLines[index];
                                endDrawer=line.match(drawerENDRE);
                                if(!endDrawer){
                                    // Drawer could be indented... rip it...
                                    drawerContent+=line.trim()+"\n";
                                }
                            }
                            if(!endDrawer && index==(fileLines.length-1)){
                                // We are at the end without nothing... Please Fire...
                            	debug('Drawer Parse Error on line:'+line);
                                throw ParseError(' DRAWER :'+drawerName+': Found but :END: missed.');
                            }
                            drawerArray[drawerName]=drawerContent;
                            debug(
                                    'Processed Drawer...'+heading+ ' ' +drawerName+ " OK");
                        }
                    }
                    // Ends here, index is pointing to endDrawer and the for will
                    // increase it right
                    continue;
                }
                // Drawer / Property parser ENDS here


                // Special Stuff
                // [whacked modification]
                  // hacky version, stick source block processor onto end
                  // this should be tagged in the regex blocks above for
                  // faster output, but currently, less memory consumption
                  /*
                  if(line.indexOf("_src") > -1){
                    bodytext += line+"\n";
                    continue;
                  }*/
                // [/whacked modification]

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


var makelistFromStringWithPerformance=function(data,processFunction, passPerformanceAlso){
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
                nodesPerSeconds: 1000*(orgNodesList.length/timeTaken)
            };
            processFunction(orgNodesList,result);
        }else{
            processFunction(orgNodesList);
        }

    } catch (x) {
        console.log("makelist(): Error during Call of 'processFunction'"+JSON.stringify(x));
        throw x;
    }

};
var makelist=function(fileName, processFunction, passPerformanceAlso){
    // This function translates the callback behavior expected from
    // makelistNode into the callback behavior expected from this function
    var translateFunc = function (err, list) {
        if (err) {
            throw err;
        }

        processFunction(list);
    };

    makelistNode(fileName, translateFunc, passPerformanceAlso);

};


var makelistWithPerformance = function (fileName,processFunction){
    makelist(fileName,processFunction,true);
};

var makelistNode = function(fileName, processFunction, passPerformanceAlso){
    fs.readFile(fileName, 'utf-8',function (err,data){
        if (err) {
            processFunction(err);
            return;
        }

        var successFunction = function (list) {
            processFunction(null, list);
        };

        try {
            makelistFromStringWithPerformance(data,successFunction,passPerformanceAlso);
        } catch (err) {
            processFunction(err);
        }
    });
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

        if(_.isNull(nodes) || _.isUndefined(nodes)){
            throw IllegalArgumentException("First arguments {nodes} cannot be Null or Undefined" );
        }

        _.each(nodes,function (n,index){
            if( ! (n instanceof Orgnode)){
                throw IllegalArgumentException("Argument "+(n+1)+" is not an Orgnode. Input:"+JSON.stringify(arguments));
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


        // 0.0.7 merge enhance avoided for the meantime
        if(this.allNodes.length==1){
            this.monoNode=true;
        }else{
            this.monoNode=false;
        }
    };
    /** Return always a OrgQuery object */
    OrgQuery.prototype.selectSubtree = function (nodeObj){
        if(nodeObj!==null && nodeObj!==undefined){
            // Accepted inputs...are only Orgnode and OrgQuery
            // OrgQuery force selection of first object
            var isOrgQueryCollection=nodeObj instanceof OrgQuery;
            if(!(nodeObj instanceof Orgnode) &&
               !(isOrgQueryCollection)
               ||
               (isOrgQueryCollection && nodeObj.length>1)
              )
            {
                throw IllegalArgumentException("selectSubtree argument is illegal:"+
                                               JSON.stringify(arguments));
            }

            if(nodeObj instanceof Orgnode){
                return this.subTreeMap[nodeObj.key];
            }else{
                // Added on version 0.0.7
                var queryObj=nodeObj;
                if(queryObj.length>1){
                    throw IllegalArgumentException("Passed more then one node:"+JSON.stringify(arguments));
                }else{
                    if(queryObj.length==1){
                        return this.subTreeMap[queryObj.first().key];
                    }else{
                        return this.allNodes;
                    }

                }
            }

        }else{
            //?return this.selectSubtree(this.first());
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

    /** GG derivated by
     * https://github.com/whacked/org-mode-parser
     * The render try to conform to org mode rendering (somewhat).
     * It is html-5 enhanced
     * .title  { text-align: center; }
     .todo   { font-family: monospace; color: red; }
     .done   { color: green; }
     .tag    { background-color: #eee; font-family: monospace;
     padding: 2px; font-size: 80%; font-weight: normal; }

     todo e tag logic css class are used on heading marked with todo
     */
    OrgQuery.prototype.toHtml = function(options) {

        var self = this;
        self.MAX_HEADLINE_LEVEL = 6;
        self.OL = 'ol';
        self.UL = 'ul';
        self.DL = 'dl';
        self.Table = "table";

        // See http://www.markhansen.co.nz/javascript-optional-parameters/
        var options = options || {};
        var fullHtml    = options.fullHtml || false;  // include header/footer?
        var jadeTemplatePath=options.jadeTemplatePath || "";

        function render_headline(node) {
            // org-mode render like   <h3 id="sec-2-1"><span class="section-number-3">
            // we are more compact
            var r="", level;
            if(node.level <= self.MAX_HEADLINE_LEVEL) {
                level=node.level;
            }else{
                level=self.MAX_HEADLINE_LEVEL;
            }
            r= "<h"+level+" class=\"section-number-"+ level  ;

            // Css class enrichment
            if(node.todo){
                r+=" todo todo-"+node.todo;
            }
            if(Object.keys(node.tags).length>0){
                r+=" tag";
                _.each(Object.keys(node.tags), function t(t){
                    r+=" tag-"+t;
                });

            }
            r+="\" >"+node.headline;

            r+="</h"+level+">";
            return r;
        }
        function paragraphparser(paragraph) {
            var artn = []
            var lastgroup = null
            var lsline = paragraph.split("\n")
            for(var i = 0, n = lsline.length; i < n; ++i) {
                var parsed = lineparser(lsline[i])
                if(parsed[0] && lastgroup === null) {
                    artn.push("<"+parsed[0]+">")
                }
                artn.push(parsed[1])
                if(lastgroup && (parsed[0] !== lastgroup || i == n-1)) {
                    artn.push("</"+lastgroup+">")
                    lastgroup = null;
                } else {
                    lastgroup = parsed[0]
                }
            }
            return artn.join("\n")
        }
        function lineparser(line) {
            // horizontal rule
            var line1 = line.replace(/-{5,}\s*$/, '<hr />')
            if(line1 != line) {
                return [null, line1];
            }

            // simple markup
          if (self.processCode) {
            // end source
            line1 = line.replace(/^#\+end_src\s*/i, '</code>')
            if (line1 !== line) {
              self.processCode = false;
              return [null, line1];
            }
          } else {
            // begin source
            // include lang spec
            line1 = line.replace(/^#\+begin_src\s+([^ ]+)(.*)/i, '<code class="src src-$1" data-language="$1">');
            if (line1 !== line) {
              self.processCode = true;
              return [null, line1];
            }
          }
          var content = "";
          if (self.processTable) {
            line1 = line.split("|");
            if (line1[0] === line) {
              // process end
              self.processTable = false;
            } else {
              if (!line.replace(/^\|-+\+-+\|/, "")) {
                return [self.Table, null];
              }
              
              content = "";
              line1.forEach(function(item) {
                if (item) {
                  content += '<td>' + item + '</td>';
                }
              });
              content = '<tr>' + content + '</tr>';
              
              return [self.Table, content];
            }
          } else {
            line1 = line.split("|");
            if (line1[0] !== line) {
              content = "";
              line1.forEach(function(item) {
                if (item) {
                  content += '<th>' + item + '</th>';
                }
              });
              content = '<tr>' + content + '</tr>';

              self.processTable = true;
              line1 = '<thead>' + content + '</thead>';

              return [self.Table, line1];
            }
          }




            line = line
            // code
              .replace(/=([^=]+?)=/g, '<code>$1</code>')
            // verbatim
              .replace(/~([^~]+?)~/g, '<code>$1</code>')
            // italic
              .replace(/\/(.+?)\//g, '<i>$1</i>')
            // bold
              .replace(/\*([^\*]+?)\*/g, '<b>$1</b>')
            // underline
              .replace(/_([^_]+?)_/g, '<span style="text-decoration:underline">$1</span>')
            // image file, double bracket
              .replace(/\[\[file:\s*([^ ]+)\.(?:PNG|JPG|BMP|GIF|TIFF|SVG)\]\]/i, '<img src="$1" alt="$1" />')
            // image file, no bracket
              .replace(/(?:^|[^[])file:([^ ]+)\.(?:PNG|JPG|BMP|GIF|TIFF|SVG)(?:[^\]]|$)/i, '<img src="$1" alt="$1" />')
            // hyperlink with description
              .replace(/\[\[(?:file:)?(.*?)\]\[(.*?)\]\]/i, '<a href="$1">$1</a>')
            // hyperlink without description
              .replace(/\[\[(?:file:)?(.*?)\]\]/i, '<a href="$1">$1</a>');


            // lists
            //// definition list
            //// ordered
            line1 = line.replace(/\d+[\.)] (.+)/, '<li>$1</li>')
            if(line1 != line) return [self.OL, line1]
            //// unordered
            line1 = line.replace(/^[-+] (.+)/, '<li>$1</li>')
            if(line1 != line) return [self.UL, line1]
            line1 = line.replace(/- +([^ ]+) :: (.+)/, '<dt>$1</dt><dd>$2</dd>')
            if(line1 != line) return [self.DL, line1]
          
            return [null, line1]
        }

        //console.log(this)

        var html ;
        // see http://jade-lang.com/api/
        if(options.fullHtml){
            var jade = require('jade');
            var template=jade.compileFile(jadeTemplatePath, {
                pretty:true,
                compileDebug:true,
                globals: []
                //add filename e cache?
            });
            var locals={};
            html = fn(locals);
        }else {
            html="";
            for(var i = 0; i < this.allNodes.length; ++i) {
                node = this.allNodes[i]
                if(node.headline) {
                    html += render_headline(node)
                }
                //console.dir(node);
                html += "<p>" + node.body.split("\n\n").map(paragraphparser).join("</p><p>") + "</p>"

            }

        }
        return html;
    } /*toHTML */


    return OrgQuery;
})();



    exports.Orgnode=Orgnode;
    exports.makelistWithPerformance=makelistWithPerformance;
    exports.makelistFromStringWithPerformance=makelistFromStringWithPerformance;
    exports.makelist=makelist;
    exports.makelistNode=makelistNode;

    exports.OrgQuery=OrgQuery;
    // Emacs mumbo jumbo extensions. Company-mode give a bit of autocomplete spriz!
    // Local variables:
    // mode:company
    // End:
})();
