@ECHO OFF
SETLOCAL
SET "NODE_EXE=%~dp0node.exe"
SET "NPM_CLI_JS=%~dp0node_modules\npm\bin\npm-cli.js"
"%NODE_EXE%" "%NPM_CLI_JS%" %*
