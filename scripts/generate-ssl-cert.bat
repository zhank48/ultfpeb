@echo off
echo Generating SSL Certificate for 192.168.92.203...

REM Create SSL directory
if not exist "C:\laragon\etc\ssl" mkdir "C:\laragon\etc\ssl"

REM Change to SSL directory
cd /d "C:\laragon\etc\ssl"

REM Copy certificate configuration
copy "%~dp0..\configs\cert.conf" "cert.conf"

REM Generate certificate
"C:\laragon\bin\openssl\openssl.exe" req -new -x509 -keyout ult-fpeb.key -out ult-fpeb.crt -days 365 -config cert.conf -nodes

if %errorLevel% == 0 (
    echo.
    echo SSL Certificate generated successfully!
    echo Location: C:\laragon\etc\ssl\
    echo Files: ult-fpeb.crt and ult-fpeb.key
    echo.
) else (
    echo.
    echo Failed to generate SSL certificate!
    echo Make sure Laragon is installed and OpenSSL is available.
    echo.
)

pause