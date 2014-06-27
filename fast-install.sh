
curl http://nodejs.org/dist/v0.10.28/node-v0.10.28.tar.gz | tar xzvf -
curl --insecure https://www.npmjs.org/install.sh  | bash
npm install org-mode-parser

./bin/releaseVersion.sh ORG_MODE_PARSER_0.0.6
