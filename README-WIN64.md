# Installation under windows

NodeJS has still a bunch of problems under Windows, so developing is still hard.
In particular, npm try to build hard links and fail catastrophically.


1. Download NodeJS (64bit suggested)
2. Ensure the proxy is correctly configured:
	npm config set proxy http://127.0.0.1:808
	npm config set https-proxy http://127.0.0.1:808
3. Install the dependencies GLOBALLY:

	npm  install -g vows@0.7.0
	npm  install -g underscore@1.1.7
	
4. Manually set NODE_PATH and run unit tests:

	set NODE_PATH=C:\Users\giorgig\AppData\Roaming\npm\node_modules
	vows --spec -v --cover-plain  test\*.js	
