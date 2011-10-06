#!/bin/sh
# Internal housekeeping only
# Example $0 ORG_MODE_PARSER_0.0.1
set -e -x
#Reset every thing not yet commited (security measure)
(cd $HOME/org-mode-parser ; git reset --hard HEAD)
tagVersion=$1
cd $(dirname $0)/../..
pwd
test  -d ../tempHgFromRepo && rm -rf ../tempHgFromRepo
hg clone --quiet -u $tagVersion . ../tempHgFromRepo 
cd ../tempHgFromRepo
# Take the stuff and copy on the git destination
cp -pr org-mode-parser/* $HOME/org-mode-parser

## hg log --style changelog  -r $tagVersion >>$HOME/org-mode-parser/CHANGELOG
cd $HOME/org-mode-parser

#git reset --hard HEAD
git status
git add -i -v
# git commit -a -v  -m "Delivered tag revision $tagVersion"
# git tag -a -m "Revision $tagVersion"  $tagVersion
# git tag
# git push -v --tags
