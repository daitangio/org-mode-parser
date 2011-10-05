#!/bin/bash
set -e
echo Testing install
cdir=$(pwd)
tempdir=../$$temp
#npm install . -g -d
mkdir $tempdir
cd $tempdir
npm install ../org-mode-parser -d
npm ls 
echo "a=require('org-mode-parser')" >tester.js
node tester.js || echo "FAILED"
#npm uninstall org-mode-parser -g -d
cd $cdir
pwd
rm -rf $tempdir
