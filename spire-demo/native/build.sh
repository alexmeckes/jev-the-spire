#!/bin/zsh
set -eu
demo_dir="$(cd "$(dirname "$0")/.." && pwd)"
app_dir="$demo_dir/../.private/Jev Companion.app"
mkdir -p "$app_dir/Contents/MacOS"
xcrun swiftc "$demo_dir/native/Sidecar.swift" -o "$app_dir/Contents/MacOS/JevCompanion" -framework Cocoa -framework WebKit
cat > "$app_dir/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>JevCompanion</string>
<key>CFBundleIdentifier</key><string>local.jev.spire-companion</string>
<key>CFBundleName</key><string>Jev Companion</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST
printf '%s\n' "$app_dir"
