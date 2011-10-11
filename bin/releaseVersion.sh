#!/bin/bash
# Internal housekeeping only
# Example $0 ORG_MODE_PARSER_0.0.1
set -e -x
tagVersion="$1"
$(dirname $0)/testInstall.sh || exit 1000
echo Check the status
git commit  --dry-run -a -m "Riepilogo" || echo ""
read -e  -p 'Proceed (y/n)?' -i y reply
# exit if not yes
test "$reply" != "y"  && exit
echo Commit...
git status
git add -i -v
git commit -a -v  -m "Delivered tag revision $tagVersion"
git tag -a -m "Revision $tagVersion"  $tagVersion
git tag
git push -v --tags
git push -v
npm publish
