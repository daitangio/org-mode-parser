var vows = require('vows'),
    assert = require('assert'),
    _=require("underscore"),
    util=require('util'),
    winston=require('winston');

var orgParser=require("../lib/org-mode-parser");

// var logger = new winston.Logger({
//     level: 'debug',
//     transports: [
//       new (winston.transports.Console)(),
//       new (winston.transports.File)({ filename: './org-parser-debug.log' })
//     ]
// });
winston.loggers.add('tester',{
    console: {
        level: 'debug',
        colorize:true,
        label:'vows-test'
    }
});

winston.loggers.add('orgmodeparser',{
    console: {
        level: 'debug',
        colorize:false,
        label:'orgmode'
    }
});


var mylog=winston.loggers.get('tester');

vows.describe('OrgMode Logging demo').addBatch({
    '2017':{
        'Logging': {
            topic: function (){
                mylog.debug("Starting debug test");
                orgParser.enableDebug(winston.loggers.get("orgmodeparser"));
	        orgParser.makelist("./test/issue11-empty-head.org",this.callback);
            },
            'test-log1': function (n,unused){
                mylog.debug('Disabling debugging');
                orgParser.disableDebug();
            }
        }

    }
}).export(module);
// Local variables:
// mode: js2
// mode: company
// End:
