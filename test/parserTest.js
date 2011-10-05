var vows = require('vows'),
    assert = require('assert'),
    _=require("underscore");

var orgParser=require("../lib/org-mode-parser");

// Create a Test Suite
vows.describe('OrgMode Tests').addBatch({
    'basicLibraries':{
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
		console.dir(new orgParser.Orgnode("*", "Test", "", undefined, undefined));
	    },
	    'Orgnode direct accessors':function(){
		var n=new orgParser.Orgnode("*", "Test", "", undefined, undefined);
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
	    }
	},
	'End to end simple parsing':{
	    topic: function (){
		orgParser.makelist("./test/treeLevel.org",this.callback);
	    },
	    'three node parser is right':function(n,unused){
		//console.dir(n);
		assert.equal(n.length, 3);
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

	}
	
	,
	'End to end Parser':{
	    topic: function(){
		orgParser.makelist("./test/orgmodeTest.org", this.callback);
	    },

	    'nodes parsing count is right':function(nodeList,u){		
		assert.equal(7,nodeList.length);
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
	    }
	}
	
	} //basic
}).export(module); // Export it

