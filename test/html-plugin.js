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
        'html':{
            // Very stupid, only for getting quickcheck on track
            'vanilla':function() {
                var n=new orgParser.OrgQuery(orgParser.parseBigString("* Very Stupid\nData Line1\n"));		
                assert.equal("<h1>Very Stupid</h1><p>Data Line1</p><p></p>",n.toHtml());
            }
        }
    }
}).export(module);
