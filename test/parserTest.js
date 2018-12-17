var vows = require('vows'),
    assert = require('assert'),
    _=require("underscore"),
    util=require('util');

var orgParser=require("../lib/org-mode-parser");

// To understand how the parser works, uncomment the following:
// orgParser.enableDebug();


// Create a Test Suite
vows.describe('OrgMode Tests').addBatch({
    'basicLibraries':{
        /*
        'quickcheck1':{
            // Very stupid, only for getting quickcheck on track
            'qc1':function() {

                function randomParser(body) { 
		    var n=orgParser.parseBigString("* Very Stupid\nData Line1\n"+body);		
		    return n[0].body.match("Data Line1\n.*");
	        }
                
                // Check a bunch of random strings...
                assert.equal(true,qc.forAll(randomParser,qc.arbString));
            }
        },*/
	'meta-example':{
	    'binding':function(){
		var f=function(){return this;};
		assert.equal(false,f.call(false));
		// Sigh...
		assert.notEqual(null,f.call(null));
		// Using bind...
		var bind=function(f,this_context){
		    return function() {return f.apply(this_context,arguments);};
		};
		
		assert.equal("A", bind(f,"A")());
		assert.equal("B", bind(f,"B")());
	    },
	    'binding2':function(){
		var f=function(){return this;};
		/* Object.bind(f,{...}
		 * is used to bind the hashtable to the environment 
		 */
		assert.equal( Object.bind(f,"A")(), "A");

		//assert.equal(1,2);
	    },
	    'binding3':function(){
		var f=function(){return this;};
		var thisEnv={'k':'v'};
		assert.equal( Object.bind(f,thisEnv)(), thisEnv);
	    },
	    'array push':function(){
		var a=[];
		a.push("1");
		assert.equal(a[0],"1");
	    },
	    'regexp test':function(){
	        assert.isTrue(/a/.test("a"));
	    }
	  }, //meta-examp
	'lowlevelFunctions':{
	    'simpleCycle':function(){
		var collector=0;
		_.each([1, 2, 3], function(num){ collector+=num; });
		assert.equal(collector,6);
	    },
	    'groupBy':function(){
		var groupedStuff=
		    _.groupBy([1.3, 2.1, 2.4], function(num){ return Math.floor(num); });
		assert.equal( 1.3  , groupedStuff[1][0] );
	    },
	    'asLines works without ending CR':function(){
		var lines=orgParser.asLines("1\n2");
		//console.dir(lines);
		assert.equal(lines[0],"1");
	    },
	    'asLines works with ending CR':function(){
		var lines=orgParser.asLines("1\n2\n");
		//console.dir(lines);
		assert.equal(lines[0],"1");
	    },
	    'asLines return an array':function(){
		var lines=orgParser.asLines("a\nab\nabc");
		for(var l in lines){
		    //console.dir(lines[l]);
		}
	    },
	    'simple matching': function(){
		var q="abaco b c".match(/(\w+)/g);
		assert.equal(q[0],'abaco');
		assert.equal(q[1],'b');
		assert.equal(q[2],'c');	
	    },
	    'Orgnode object':function(){
		new orgParser.Orgnode("*", "Test", "", undefined, undefined,undefined);
	    },
	    'Orgnode direct accessors':function(){
		var n=new orgParser.Orgnode("*", "Test", "", undefined, undefined,undefined );
		var ptest={
		    a:1
		};		
		assert.isTrue(n.properties!==ptest);
		n.properties=ptest;
		assert.isTrue(n.properties===ptest);
		//console.dir(n);
	    },
	    'parse function of one header':function(){
		var n=orgParser.parseBigString("* Very Stupid\nData Line1");
		//console.dir(n);
		assert.equal(n[0].headline,"Very Stupid");
	    },
	    'parse function of one header with body':function(){
		var n=orgParser.parseBigString("* Very Stupid\nData Line1");		
		assert.equal(n[0].body,"Data Line1\n");
	    },
	    'null is the default value for tag,priority,scheduled, deadline when not set.': function(){
		var e=orgParser.parseBigString("* Less Stupid\nData Line1")[0];
		assert.isNull(e.tag);
		assert.isNull(e.priority);		
		assert.isNull(e.scheduled);		
		assert.isNull(e.deadline);		
	    },
	    'empty is the default for tags when no tags set':function(){
		var e=orgParser.parseBigString("* Less Stupid\nData Line1")[0];
		assert.isEmpty(e.tags);
	    },
	    'tags are coerched to true':function(){
		var e=orgParser.parseBigString("* Less Stupid :monotag:\nData Line1")[0];
		assert.isNotEmpty(e.tags);
		assert.isNotNull(e.tags.monotag);

		assert.isTrue("monotag" in e.tags);
		// Slight non-obious api
		if(!e.tags.monotag){
		    throw new Error("Tags are coerced to false in the if");		    
		}else{
		    assert.isTrue(e.tags.monotag);
		}
	    },
	    'tag parsing of first tag':function(){
		var n=orgParser.parseBigString(
		    "* Test Tree                                                   :test:testRoot:"
		);
		//console.dir(n);
		assert.equal(n[0].headline,"Test Tree");
		assert.equal(n[0].tag,"test");
	    },
	    'tag parsing of other tags':function(){
		var n=orgParser.parseBigString(
		    "* Test Tree                                                   :test:testRoot:"
		);
		//console.dir(n);
		assert.isTrue("testRoot" in n[0].tags);
	    },
	    'bastard tag parsing works':function(){
		var n=orgParser.parseBigString("* Quiz DB :noexport:webintro:")[0];
		assert.equal(n.tags['noexport'],true);
		

	    },
	    'parser ignore comments':function(){
		var n1=orgParser.parseBigString(
		    "* Test Tree                                                   :test:testRoot:\n"+
		    "# Comment\n"+
		    "Data"
		)[0];
		assert.equal(n1.body,"Data\n");
	    },
	    'properties parsing works':function(){
		var n1=orgParser.parseBigString(
		    "* Test Tree                                                   :test:testRoot:\n"+
		    "# Comment\n"+
		    ":PROPERTIES:\n"+
		    ":simple:yes\n"+
		    ":END:\n"+
		    "First line of Data\n"+
		    "Second line of data\n"
		)[0];
		//assert.equal(n1.body,"Data\n");
		assert.equal(n1.properties["simple"],"yes");
		// No simple proprerty in the body but...
		assert.isNull(n1.body.match(/simple/g));
		assert.isNotNull(n1.body.match(/line/g));
	    },
	    'test toOrgString heading simple case':function(){
		var demoStuff=
		    "** Test Tree                                                  :test:testRoot:\n"+
		    "First line of Data\n";
		var n=orgParser.parseBigString(demoStuff)[0];
		assert.equal(n.toOrgString(),demoStuff);		
	    },
	    'test toOrgString heading with TODO':function(){
		var demoStuff=
		    "* TODO Test Tree                                              :test:testRoot:\n"+
		    "First line of Data\n";
		var n=orgParser.parseBigString(demoStuff)[0];
		assert.equal(n.toOrgString(),demoStuff);		
	    },
	    'test toOrgString heading with TODO and priorities':function(){
		var demoStuff=
		    "*** TODO [#A] Test Tree                                       :test:testRoot:\n"+
		    "First line of Data\n";
		var n=orgParser.parseBigString(demoStuff)[0];
		assert.equal(n.toOrgString(),demoStuff);		
	    },

	    'test toOrgString emits properties':function(){
		var demoStuff=
		    "** Test Tree                                                  :test:testRoot:\n"+
		    ":PROPERTIES:\n"+
		    ":simple:yes\n"+
		    ":END:\n"+
		    "First line of Data\n";
		var n=orgParser.parseBigString(demoStuff)[0];
		assert.equal(n.toOrgString(),demoStuff);		
	    }
	},
	'End to end Simple Parsing':{
	    topic: function (){
		orgParser.makelist("./test/treeLevel.org",this.callback);
	    },
	    'three node parser is right':function(n,unused){
		//console.dir(n);
		assert.equal(n.length, 5);
	    },
	    'headers are right':function(n,u){
		assert.equal(n[0].headline,"Level one");
		assert.equal(n[1].headline,"Level two");
		assert.equal(n[2].headline,"Level three");
	    },
	    'tags are right':function(n,u){
		assert.equal(n[0].tag,"data");
		assert.isTrue("1" in n[0].tags);

		assert.equal(n[1].tag,"nodata");
		assert.equal(n[2].tag,"data");
		assert.isTrue("last" in n[2].tags);
	    }

	},
	'End to end Parser':{
	    topic: function(){
		orgParser.makelist("./test/orgmodeTest.org", this.callback);
	    },

	    'nodes parsing count is right':function(nodeList,u){		
		assert.equal(13,nodeList.length);
	    },
	    'first node heading is right':function(nodeList,u){
		assert.equal(nodeList[0].headline,"Test Node 1");
		//console.dir(nodeList);
	    },
	    'first node has also a todo keyword':function(nodeList,u) {
		//console.dir(nodeList[0]);
		assert.equal(nodeList[0].todo,"TODO");
	    },
	    'node 2 has priority B and a STARTED Keyword':function(nodeList,u){
		var n=nodeList[1];
		//console.dir(n);
		assert.equal(n.todo,"STARTED");
		assert.equal(n.priority,"B");
		assert.equal(n.tag,"veryHard");
		assert.equal(n.properties['okIamHard'],'for sure');
	    },
	    'Node 3 is scheduled':function(nl,u){
		assert.equal(nl[2].headline,"Section 3 with SCHEDULED");
		assert.isNotNull(nl[2].scheduled);
	    },
	    'Node 4 has deadline':function (nl,u){
		assert.isNotNull(nl[3].deadline);
	    },
	    'Node 5 has deadline and schedule':function (nl,u){
		assert.equal(nl[4].headline,"Section 5 with schedule and deadline too");
		assert.isNotNull(nl[4].schedule);
		assert.isNotNull(nl[4].deadline);
	    },
      'Node 8 is DONE and has deadline, schedule and closed':function (nl,u){
    assert.equal(nl[7].headline,"Section 8 with schedule, deadline and closed");
    assert.isNotNull(nl[7].schedule);
    assert.isNotNull(nl[7].deadline);
    assert.isNotNull(nl[7].closed);
    assert.equal(nl[7].todo,"DONE");
      },
	    'Node 3 body is right':function(nl,u){
		assert.equal(nl[2].headline,"Section 3 with SCHEDULED");
		assert.equal(nl[2].body,"This section has a schedule for the end of 2012, a very bad date someone said.\nTrust no one\n");
	    },
	    'CLOCK: FULL directive is ignored':function(nl,u){
		 assert.equal(nl[5].headline,"Section 6 with a lot of bad stuff inside it");
		 //console.dir(nl[5].body);
		 assert.isNull(nl[5].body.match('CLOCK'));
	    },
	    'CLOCK: Partial directive is ignored':function(nl,u){
		 assert.equal(nl[6].headline,"Section 7 is like section 6 but only with a starting CLOCK");
		 //console.dir(nl[6].body);
		 assert.isNull(nl[6].body.match('CLOCK'));
	    },
	    'Heading and subheading level works as expected':function(nodeList,u){
		var l1=nodeList.length-5;
		var n1=nodeList[l1];
		assert.equal(n1.headline,"Test Tree");
		assert.equal(n1.level,1);
		assert.equal(nodeList[l1+1].level,2);
		assert.equal(nodeList[l1+2].level,3);
		
		assert.equal(nodeList[l1+3].headline,"Tree2 con un figlio");
		assert.equal(nodeList[l1+3].level,3);
		
		// Last subtree
		assert.equal(nodeList[l1+4].level,4);
	    }
	    
	},

	'OrgQuery':{
	    topic: function (){
		var thisOfTest=this;
		orgParser.makelist("./test/treeLevel.org",function(nodes){
			var ofd=new orgParser.OrgQuery(nodes);
			thisOfTest.callback(ofd, nodes);
		});
	    },
	    'subtree without params return all nodes':function(ofd,u){
		assert.equal(ofd.selectSubtree().length,5);
		assert.equal(ofd.selectSubtree(null).length,5);
	    },
	    'subtree works/1':function(ofd,nodes){
		var n1=ofd.selectSubtree()[0];
		var subtreeN1=ofd.selectSubtree(n1);
		//console.dir(subtreeN1);
		assert.equal(subtreeN1.length,2);
		assert.equal(ofd.selectSubtree(nodes[1]).length,1);
	    },
	    'subtree returns an OrgQuery ':function(ofd,nodes){
		var subtree=ofd.selectSubtree(nodes[0]);
		var levelTwo=subtree.allNodes[0];		
		assert.equal(levelTwo.headline,"Level two");
		var monosubtreeLevel3=subtree.selectSubtree(levelTwo);
		assert.equal(monosubtreeLevel3.length,1);
	    },
	    'selectTag works/1':function(ofd,nodes){
		var queryResult=ofd.selectTag('data');
		assert.equal(queryResult.length,2);
		assert.equal(queryResult.allNodes[0].headline,'Level one');
		assert.equal(queryResult.allNodes[1].headline,'Level three');
	    },
	    'selectTag works/2':function(ofd,nodes){
		var queryResult=ofd.selectTag('1');
		assert.equal(queryResult.length,2);
		assert.equal(queryResult.allNodes[0].headline,'Level one');
		assert.equal(queryResult.allNodes[1].headline,'This is a huge node with a lot of data and tags');
	    },
	    'each works':function(ofd,nodes){
		var titles=[];
		ofd.selectTag('data').each(function f(elem){
		    titles.push(elem.headline);
		});
		assert.equal(titles[0],'Level one');
		assert.equal(titles[1],'Level three');
	    }

	},
	'OrgQuery-Complex':{
	    topic: function (){
		var thisOfTest=this;
		orgParser.makelist("./test/treeLevelComplex.org",function(nodes){
			var ofd=new orgParser.OrgQuery(nodes);
			thisOfTest.callback(ofd, nodes);
		});
	    },
	    'test complex subtree':function(ofd,nodes){
		var nodesWithMeta=ofd.selectTag('has').selectTag('sublevel').selectTag('property');
		var headersToTest=nodes[0].properties["headersToTest"];
		assert.equal(nodesWithMeta.length, headersToTest);
		//console.dir(nodesWithMeta.first());
		// WARN: nodesWithMeta is NOT AN ARRAY (yet) so you must use
		// this syntax or the provided each() method...
		_.each(nodesWithMeta.toArray(), function(n){		    
		    var expectedData=n.properties["expected-sub-levels"];
		    //console.log("? "+expectedData+" For "+n.headline);
		    //console.dir(ofd.selectSubtree(n));
		    assert.equal(ofd.selectSubtree(n).length,expectedData);
		});
	    },
	    'test toOrgString with reparsing':function (ofd,nodes){
		var str=ofd.toOrgString();
		// Deadly test: we force eating its own dog food here
		var expectedSize=ofd.length;
		var reparsed=orgParser.parseBigString(str);
		assert.equal(reparsed.length,expectedSize);
		var ofdReparsed=new orgParser.OrgQuery(reparsed);
		assert.equal(ofdReparsed.toOrgString(),str);
	    }
	    //'test ordering':function(ofd,nodes)
	},
	'OrgQuery-sorting and rejecting':{
	    'sorting':function(){
		var ofd=new orgParser.OrgQuery(
		    orgParser.parseBigString("* 2\n* 1\n* 8"));
		var sorted=
		    ofd.sortBy(function (n){ return n.headline;}).toArray();
		assert.equal(sorted[0].headline,"1");
		assert.equal(sorted[2].headline,"8");
	    },
	    'rejecting':function(){
		orgParser.makelist("./test/treeLevel.org",function(nodes){
		    var ofd=new orgParser.OrgQuery(nodes);
		    var newCollection=ofd.reject(function (n){
			return n.level!==3;
		    });
		    var n1=newCollection.toArray()[0];
		    assert.equal(n1.headline,"Level three");
		});
	    },
	    'rejectTag':function(){
		orgParser.makelist("./test/treeLevel.org",function(nodes){
		    var ofd=new orgParser.OrgQuery(nodes);
		    var firstHeader=ofd.rejectTag('complex').rejectTag('last').rejectTag('nodata');		   
		    assert.equal(firstHeader.length,1);
		    assert.equal(firstHeader.first().headline,"Level one");
		});
	    },
	    'random test 1':function(){
		orgParser.makelist("./test/treeLevel.org",function(nodes){
		    var ofd=new orgParser.OrgQuery([ nodes[0] ]);
		    //console.dir(ofd.random());
		    assert.equal(ofd.random().key,nodes[0].key);
		});
	    },
	    'random test 2':function(){
		orgParser.makelist("./test/treeLevel.org",function(nodes){
		    var ofd=new orgParser.OrgQuery([ nodes[0], nodes[1] ]);
		    var collector={};
		    // Given 2 value, the probability x launch will get only one of them is
		    // (1/2)^x
		    // so for a 99% prob we catch all...
		    // (1-(1/4096))*100
		    // x=12
		    _.each(_.range(12),function(){
			var r=ofd.random();
			collector[r.key]=r;
		    });
		    //console.dir(_.toArray(collector));
		    assert.equal(ofd.length,_.toArray(collector).length);
		});
	    },
	    'random test 3':function(){
		// Given 1000 values the probability two launch give the same value is
		// 1/10000  i.e.  0,01%
		rList=[];
		_.each(_.range(10000), function (fakeNumber){
			rList.push(
				new orgParser.Orgnode("*", "Test "+fakeNumber, 
				"", undefined, undefined,undefined));
		});
		var ofd=new orgParser.OrgQuery( rList );
		var collector={};
		_.each(_.range(2),function(){
		    var r=ofd.random();
		    collector[r.key]=r;
		});
		assert.equal(_.toArray(collector).length,2);
	    }	
	}

	
	} //basic


}).export(module); // Export it

vows.describe('OrgMode API Stability').addBatch({
        'API 0.0.5':{
	    'rejectArchived':function(){
		assert.isFalse(_.isUndefined(orgParser.OrgQuery.prototype.rejectArchived));
	    },
	    'drawer must be an array otherwise raise error':function(){
		    assert.throws(function(){
			 new orgParser.Orgnode("firstExtraParam","*", "Test", "", 
			 undefined, "Cheating on drawer associative array");
		    },Error);
		
	    }
	},
	'API respect 0.0.4 specification':{
	    'Basic Objects Exists':function(){
		assert.isFalse(_.isUndefined(orgParser.makelist));
	    },


	    'OrgQuery.prototype.selectSubtree Exists':function(){
		assert.isFalse(_.isUndefined(orgParser.OrgQuery.prototype.selectSubtree));
	    },

	    'OrgQuery.prototype.selectTag Exists':function(){
		assert.isFalse(_.isUndefined(orgParser.OrgQuery.prototype.selectTag));
	    },

	    'OrgQuery.prototype.sortBy Exists':function(){
		assert.isFalse(_.isUndefined(orgParser.OrgQuery.prototype.sortBy));
	    },

	    'OrgQuery.prototype.reject Exists':function(){
		assert.isFalse(_.isUndefined(orgParser.OrgQuery.prototype.reject));
	    },

	    'OrgQuery.prototype.rejectTag Exists':function(){
		assert.isFalse(_.isUndefined(orgParser.OrgQuery.prototype.rejectTag));
	    },

	    'OrgQuery.prototype.toArray Exists':function(){
		assert.isFalse(_.isUndefined(orgParser.OrgQuery.prototype.toArray));
	    },

	    'OrgQuery.prototype.each Exists':function(){
		assert.isFalse(_.isUndefined(orgParser.OrgQuery.prototype.each));
	    },

	    'OrgQuery.prototype.random Exists':function(){
		assert.isFalse(_.isUndefined(orgParser.OrgQuery.prototype.random));
	    }
	}
}).export(module); 

vows.describe('OrgMode BUGS').addBatch({
    '0.0.3 BUGS':{    
	'key is not always unique on leaf nodes': function(){
	    var n=orgParser.parseBigString(
		"* Key test\nData Line1\nData Line2\n* Header 2\nData Line of header2\n* Header 3");
	    //console.dir(n);
	    keyCollection={};
	    _.each(n,function(elem){
		    keyCollection[elem.key]=true;
	    });
	    assert.equal(_.toArray(keyCollection).length,n.length);
	},
	'keys must be unique even with different sources':function (){
	    var n1=orgParser.parseBigString(
		"* Key test\nData Line1\nData Line2\n* Header 2\nData Line of header2\n* Header 3");
	    var n2=orgParser.parseBigString(
		"* Key test\nData Line1\nData Line2\n* Header 2\nData Line of header2\n* Header 3");
	    keyCollection={};
	    //console.dir(n1);
	    //console.dir(n2);
	    _.each(n1,function(elem){
		    keyCollection[elem.key]=true;
	    });
	    _.each(n2,function(elem){
		    keyCollection[elem.key]=true;
	    });
	    assert.equal(_.toArray(keyCollection).length,(n1.length+n2.length));
	    
	},
	'Orgnode constructor validate parameters/1 on arity':function(){
	    assert.throws(function(){
			      new orgParser.Orgnode("firstExtraParam","*", "Test", "", undefined, undefined,undefined);
			  },Error);
	   
	},
	'Orgnode constructor validate parameters/2 on types':function(){
	    assert.throws(function(){
			      new orgParser.Orgnode("*", "Test", "", undefined, new Object,undefined);
			  },Error);
	   
	},
	':PROPERTIES: without :END: generate an error':function(){
		var fx=function(){
		    orgParser.parseBigString(
		    "* Test Tree                                                   :test:testRoot:\n"+
		    "# Comment\n"+
		    ":PROPERTIES:\n"+
		    ":simple:yes\n"+
		    /*":END:\n"+ INTENTIONALLY REMOVED*/
		    "First line of Data\n"+
		    "Second line of data\n"
		);};
		assert.throws(fx,orgParser.ParseError);
	    },
	'OrgQuery had a weak constructor':
		{
    
		    topic:function(){
			return (function(){new orgParser.OrgQuery(null,"Bof","unused");});
		    },
		    'OrgQuery does not accept wrong arrays.../1':function(){
			assert.throws(function(){
					  new orgParser.OrgQuery(["Cheating", "a lot"]);
				      },Error);
		    },
		    '....      even if I cheat... /2':function(){
			assert.throws(function(){
			    new orgParser.OrgQuery([
				    new orgParser.Orgnode("*", "Test", "", undefined,undefined),
				    "Cheating", "a bit"]);
			    },Error);
		    },

		    "The 'Cannot read property 'length' of null' is not thrown":
		    function(f){	    
			try{
			    f();
			} catch (x) {
			    util.isError(x);
			    assert.isFalse(x instanceof TypeError);
			    // util.debug(x);
			    // GOT, expected
			    assert.equal(""+x,
			    "Error: IllegalArgumentException: First arguments {nodes} cannot be Null or Undefined");
			    //assert.isTrue(x instanceof orgParser.IllegalArgumentException);
			}
			
		    }

		    // API CHANGE:
		    , "An Error Object is thrown":function(f){
		    	assert.throws(f,Error);
		    }
		    //, "IllegalArgumentException Exists":function (){
		    // 	assert.isFalse(_.isUndefined(orgParser.IllegalArgumentException));
		    // },
		    // "ParseError Exists":function(){
		    // 	assert.isFalse(_.isUndefined(orgParser.ParseError));
		    // }

		}

    }
}).export(module);

//test/tableTest.org

// vows.describe('OrgMode 0.0.7').addBatch({

//  'OrgQuery API improvements /1':{
     
//      'You cannot push undefined to OrgQuery':function (){
	 
// 	 assert.throws(function(){
// 			   new orgParser.OrgQuery(undefined);
// 		       },orgParser.IllegalArgumentException);
//      },
//      'You cannot fool selectSubtree /1 with wrong input-types':function(){

// 	 assert.throws(function(){
// 			   new orgParser.OrgQuery([]).selectSubtree([]);
// 		       },orgParser.IllegalArgumentException);

	     
//      },
//      'SelectSubtree Work nicely':function(){

// 	 orgParser.makelist("./README.org", function (nl){
// 	     var q=new orgParser.OrgQuery(nl);
// 	     var subtree=q.selectSubtree(q.selectTag('releaseNotes').first());
// 	     //console.dir(subtree);
// 	     assert.isTrue(subtree.length>1);    
// 	 });
//      },
//      'Subtree will work with 1-sized collection as input':function(){
// 	    orgParser.makelist("./README.org", function (nl){
// 		var q=new orgParser.OrgQuery(nl);
// 		var rn=q.selectTag('releaseNotes');
// 		assert.equal(rn.length,1);
// 		var subtree=q.selectSubtree(rn);
// 		assert.isTrue(subtree.length>5);  
// 		// var subtree=q.selectSubtree(q.selectTag('releaseNotes'));
// 		// assert.isFalse(_.isUndefined(subtree) && _.isNull(subtree));
// 		// assert.isTrue(subtree.length>5);    
// 		// //console.dir(subtree);
// 	    }); 	 
//      }

//      'OrgQuery API improvements /2': {
// 	topic: function(){
// 	    var myCallback=this.callback;
// 	    orgParser.makelist("./test/orgmodeTest.org", function (nl){
// 		    myCallback(new orgParser.OrgQuery(nl),nl);
// 	    });
// 	},	 
// 	 'q.selectSubtree(emptyNodeList) === q.selectSubtree() === q':function(q,n){
// 	     var bastardEmptyQuery=q.selectTag('nonExistent');
// 	     assert.equal(bastardEmptyQuery.length,0);
// 	     var resultOfABadMix=q.selectSubtree(bastardEmptyQuery);
// 	     assert.equal(resultOfABadMix.length, q.length);
// 	 },
// 	 'Subtree will throw error on more then one elments collections as input':function(q,n){
// 	     assert.throws(function(){q.selectSubtree(q); }, orgParser.llegalArgumentException);
// 	 }
//      }
     
// } //Refining Subtree api
	
// }).export(module);

vows.describe('OrgMode 0.0.5').addBatch({

'generic :DRAWER: syntax':{
    topic: function (){
	orgParser.makelist("./test/drawerAndArchiveTag.org",this.callback);
    },
    'DRAWER_ONE exists':function(nodes, u){
	var n1=nodes[0];
	assert.isTrue(n1.drawer.DRAWER_ONE!==null);
    },
    'DRAWER_ONE has content':function(nodes, u){
	var n1=nodes[0];
	assert.equal(
	    n1.drawer.DRAWER_ONE,"I am drawer one, with one line\n");
    },

    'DRAWER_ONE exists and there is no DRAWER TWO on node1':function(nodes, u){
	var n1=nodes[0];	
	assert.isTrue(n1.drawer['DRAWER_TWO']===undefined);
    },
    'DRAWER_TWO exists':function(nodes, u){
	var n2=nodes[1];
	//console.dir(n2);
	assert.isTrue(n2.drawer.DRAWER_TWO!==null);
    },
    'double drawers works':function(nodes,u){
	var q=new orgParser.OrgQuery(nodes);
	var n=q.selectTag('indentedDrawerTest').first();
	//console.dir(n);
	assert.isTrue(n.drawer.Drawer1 !==undefined);
	assert.isTrue(n.drawer.Drawer2 !==undefined);

    },
    'drawers indentation is stripped away':function(nodes,u){
	var q=new orgParser.OrgQuery(nodes);
	var n=q.selectTag('indentedDrawerTest').first();
	//console.dir(n);
	var drawer1Content=n.drawer.Drawer1;
	assert.equal(drawer1Content,"Nice to meet you, unindented I hope\n");
    },
    'complex drawer mix':function(nodes,u){
	var q=new orgParser.OrgQuery(nodes);
	var n=q.selectTag('complexDrawerMix').first();
	assert.equal(n.body,'In this header, drawer are mixed in a fancy way\nTest below drawer1\nText above drawer2\nText below drawer2\n');
	assert.isTrue(n.drawer.Drawer1 !==undefined);
	assert.isTrue(n.drawer.Drawer2 !==undefined);
	assert.equal(n.drawer.Drawer2, "Drawer2 content\n");
    }

},
'Archive tag is supported':{
    topic: function (){
	orgParser.makelist("./test/drawerAndArchiveTag.org",this.callback);
    },
    'last two nodes are archived':function (nodes,u){
	assert.isTrue(nodes[nodes.length-2].isArchived());
	assert.isTrue(nodes[nodes.length-1].isArchived());
    },
    'first node not archived':function (nodes,u){
	assert.isFalse(nodes[0].isArchived());
    },
    'query on archive tag':function(nodes,u){
	var nodeSize=nodes[0].properties.expectedNodes;
	var expectedArchiveNodes=nodes[0].properties.archivedNodes;
	var q=new orgParser.OrgQuery(nodes);
	var notArchived=q.rejectTag('ARCHIVE').length;
	assert.equal(notArchived,nodeSize-expectedArchiveNodes);	
    },
    'rejectArchived works':function(nodes,u){
	var q=new orgParser.OrgQuery(nodes);
	var nodeSize=nodes[0].properties.expectedNodes;
	var expectedArchiveNodes=nodes[0].properties.archivedNodes;
	var expected=nodeSize-expectedArchiveNodes;
	assert.equal(q.rejectArchived().length, expected);
	
    }
},
	'drawer without an :END: must fail':function(){
		var fx=function(){
		    orgParser.parseBigString(
		    "* Test Tree                                                   :test:testRoot:\n"+
		    "# Comment\n"+
		    ":WRONG_DRAWER:\n"+
		    ":simple:yes\n"+
		    /*":END:\n"+ INTENTIONALLY REMOVED*/
		    "First line of Data\n"+
		    "Second line of data\n"
		);};
		assert.throws(fx,orgParser.ParseError);
	}

	,'Tests for Error: ParseError:  DRAWER :50: Found but :END: missed':{
		topic: function(){
			orgParser.makelist("./test/bug3DrawerConfusion.org",this.callback);
		},
		'parsing works':function(nodes,u){	
			// Expected one master node
			//console.dir(nodes);
			assert.isNotNull(nodes);			
			//assert.equal(1,nodes.length);
		}
	}	


}).export(module);

vows.describe('OrgMode API Bugs').addBatch({
    '2017':{
        'Issue11': {
            topic: function (){
                //orgParser.enableDebug();
	        orgParser.makelist("./test/issue11-empty-head.org",this.callback);
            },
	    'empty header is here':function(n,unused){
                //console.dir(n[1]);
                assert.equal(n.length,3 /*expected*/);                
	    },
            'emptyheader is empty':function(n,unused){
                //console.dir(n[1]);
                assert.equal(n[1].headline," ");
	    },
            // 'body is not': function(n,unused){
            //     assert.equal(n[1].body, "Empty header above");
            // }
            
        }
        /** GG Eval if it is needed:
        ,'No header body trouble': {
            topic: function (){
                //orgParser.enableDebug();
	        orgParser.makelist("./test/no-header.org",this.callback);
            },
	    'empty header is here':function(n,unused){
                console.dir(n);
                assert.equal(n[0].headline, " ");
                assert.equal(n.length,2);                
	    }
        }*/

    }
}).export(module);

vows.describe('Bug Fix 2018').addBatch({
    '2018':{
        'colon mistake works': {
            topic: function (){
                orgParser.enableDebug();
				orgParser.makelist("./test/colon_mistake.org",this.callback);
				//orgParser.disableDebug();
            },
	    'Tag detection':function(n,unused){
				(n[0]);		
				assert.equal(n[0].tags["toblog"],true);
                //assert.equal(n.length,1 /*expected*/);                
	    },
            
        }
    }
}).export(module);


// vows.describe('OrgMode Reika').addBatch({
//     '2018':{
//         'INCLUDE works': {
//             topic: function (){
//                 //orgParser.enableDebug();
// 	        orgParser.makelist("./test/includeTest.org",this.callback);
//             },
// 	    'IncludeWorks_basic':function(n,unused){
//                 //console.dir(n[1]);
//                 assert.equal(n.length,3 /*expected*/);                
// 	    },
            
//         }
//     }
// }).export(module);
