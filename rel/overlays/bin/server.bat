REM Migrate the database before starting the server
call "%~dp0\phenom" eval Phenom.Release.migrate
REM Start the server
set PHX_SERVER=true
call "%~dp0\phenom" start
