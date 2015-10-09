@echo Running test unit
REM npm install -g vows
vows --spec -v --cover-plain  test/*.js
