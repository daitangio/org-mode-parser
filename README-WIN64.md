# Installation under windows

# With Visual Studio Community 2015

1. Install the nodejs tools plugin for visual studio:
https://github.com/Microsoft/nodejstools/
2. Open the  OrgModeParser.sln file
3. Under Tools/External Tools register the runVowsTest.cmd
4. Drink a beer

# Without Visual Studio 2015

1. Download NodeJS (64bit suggested)
2. Install the dependencies GLOBALLY:

	npm  install -g vows@0.7.0
	npm  install -g underscore@1.8.3
		
4. run the test via the runVowsTest.cmd

Performance on SonyVaio Intel-i5:
Query Parser build time of 1280 Nodes:50ms
