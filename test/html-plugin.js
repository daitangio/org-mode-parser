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
        },
        'toHtml testing': {
            topic: function () {
                orgParser.makelist("./test/htmlTest.org", this.callback);
            },
            'begin_src test': function (n, unused) {
                var q = new orgParser.OrgQuery(n);
                var sc=q.selectTag("sourceCode");
                //console.dir(sc);
                //console.dir(sc.toHtml());                
                assert.isNotNull(sc.toHtml().match(/[<]code class/));
            },
            'superhtml':function(n,unused){
                var q = new orgParser.OrgQuery(n);
                console.dir(q.toHtml());
            }
            
            
            

        }

    }
}).export(module);
