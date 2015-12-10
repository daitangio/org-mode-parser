var vows = require('vows'),
    assert = require('assert'),
    _=require("underscore"),
    util=require('util'),
    qc = require("quickcheck");

var orgParser=require("../lib/org-mode-parser");

// To understand how the parser works, uncomment the following:
// orgParser.enableDebug();

// TODO: Include in afair way the html parser...

// Create a Test Suite
vows.describe('OrgMode Html plugin').addBatch({
    'basicLibraries':{
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
        }
    }
}).export(module);
