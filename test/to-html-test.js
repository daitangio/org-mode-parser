var vows = require('vows'),
    assert = require('assert'),
    _=require("underscore"),
    util=require('util');

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
                assert.equal('<h1 class="section-number-1" >Very Stupid</h1><p>Data Line1</p><p></p>',n.toHtml());
            }
        },
        
        'toHtml testing': {
            topic: function () {
                var that = this;
                // Callback issue see
                // https://github.com/vowsjs/vows/issues/187
                orgParser.makelist("./test/htmlTest.org", function(n) {
                    that.callback(null,n);
                });
            },
            'buf':function(n){
            },
            'begin_src test': function (n) {
                console.log("JUST HERE");
                console.log("n="+n);
                var q = new orgParser.OrgQuery(n);
                var sc=q.selectTag("sourceCode");
                //console.dir(sc);
                //console.dir(sc.toHtml());
                // assert.isNotNull(sc.toHtml().match(/[<]code class/));
                assert.equal('<h2 class="section-number-2 tag tag-sourceCode" >source code</h2><p>\n<code class="src src-emacs-lisp" data-language="emacs-lisp">\n  (let ((greeting "hello, world")\n        (name :spacecat)\n        (food :candybar))\n    (insert (format "%s! I am %s and I eat %s" greeting name food)))</p><p></code></p><p></p>'
                             ,sc.toHtml());
                
            },
            'css tag':function(n){
                var q = new orgParser.OrgQuery(n);
                assert.equal('<h1 class="section-number-1 tag tag-tagTest1" >Tag test</h1><p>Simple tag test\n</p>',
                             q.selectTag("tagTest1").toHtml());
            },

            'css todo and tag':function(n){
                var q = new orgParser.OrgQuery(n);
                assert.equal('<h1 class="section-number-1 todo todo-TODO tag tag-tagTest2" >Tag master and TODO Test</h1><p>This node test the TODO and tag css class.\n</p>',
                             q.selectTag("tagTest2").toHtml());
            },
            'full rendering':function(n){
                var fs=require("fs");
                fs.writeFileSync( "./renderTest.html", (new orgParser.OrgQuery(n)).toHtml({
                    fullHtml:true,
                    jadeTemplatePath:"./test/fullHtml.jade"
                }));
            }            
        }

    }
}).export(module);
