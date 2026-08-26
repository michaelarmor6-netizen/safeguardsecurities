# Builds a signed release AAB for Google Play.
#
# Handles this machine's specifics automatically:
#   - Capacitor 7 requires JDK 21 -> uses Android Studio's bundled JBR.
#   - Local TLS interception breaks Gradle downloads -> builds a truststore from
#     the Windows root CA store and points Gradle at it.
#
# Prereqs: keystore configured (android/keystore.properties + the .jks), and
# `npx cap sync android` has been run at least once.
#
# Usage:  .\mobile\build-aab.ps1
$ErrorActionPreference = "Stop"
$AndroidDir = Join-Path $PSScriptRoot "android"

# 1. JDK 21 (Android Studio JBR).
$jbr = "C:\Program Files\Android\Android Studio\jbr"
if (-not (Test-Path "$jbr\bin\java.exe")) {
  Write-Error "JDK 21 not found at $jbr. Install Android Studio (or set JAVA_HOME to a JDK 21)."
}
$env:JAVA_HOME = $jbr

# 2. Truststore from Windows root CAs (fixes PKIX 'unable to find valid cert path').
$ts = Join-Path $env:TEMP "gradle-truststore.p12"
if (-not (Test-Path $ts)) {
  Write-Host "Building Gradle truststore from Windows root CAs..."
  Copy-Item "$jbr\lib\security\cacerts" $ts -Force
  $keytool = "$jbr\bin\keytool.exe"
  $i = 0
  foreach ($store in @("Cert:\LocalMachine\Root", "Cert:\CurrentUser\Root")) {
    Get-ChildItem $store -ErrorAction SilentlyContinue | ForEach-Object {
      $f = Join-Path $env:TEMP "wc$i.cer"
      try {
        Export-Certificate -Cert $_ -FilePath $f -Type CERT -Force | Out-Null
        & $keytool -importcert -noprompt -keystore $ts -storepass changeit -alias "win$i" -file $f 2>$null
      } catch {}
      Remove-Item $f -ErrorAction SilentlyContinue
      $i++
    }
  }
}
$env:GRADLE_OPTS = "-Djavax.net.ssl.trustStore=$ts -Djavax.net.ssl.trustStorePassword=changeit"

# 3. Build the signed AAB.
Push-Location $AndroidDir
try {
  & .\gradlew.bat bundleRelease --no-daemon
  $aab = Join-Path $AndroidDir "app\build\outputs\bundle\release\app-release.aab"
  if (Test-Path $aab) {
    Write-Host ""
    Write-Host "=== Signed AAB ready ==="
    Write-Host $aab
  } else {
    Write-Error "Build finished but AAB was not found."
  }
} finally {
  Pop-Location
}
