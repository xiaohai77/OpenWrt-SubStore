#!/bin/sh
# Post-install script for luci-app-substore
# Downloads sub-store.bundle.js from GitHub releases

BUNDLE_DIR="/usr/libexec/substore"
BUNDLE_FILE="$BUNDLE_DIR/sub-store.bundle.js"
BUNDLE_URL="https://github.com/sub-store-org/Sub-Store/releases/latest/download/sub-store.bundle.js"

mkdir -p "$BUNDLE_DIR"

if [ ! -f "$BUNDLE_FILE" ]; then
	echo "Downloading sub-store.bundle.js ..."
	if command -v curl >/dev/null 2>&1; then
		curl -sSL -o "$BUNDLE_FILE" "$BUNDLE_URL" && echo "Download OK" || echo "Download failed, please manually download to $BUNDLE_FILE"
	elif command -v wget >/dev/null 2>&1; then
		wget -q -O "$BUNDLE_FILE" "$BUNDLE_URL" && echo "Download OK" || echo "Download failed, please manually download to $BUNDLE_FILE"
	else
		echo "ERROR: Neither curl nor wget found. Please manually download:"
		echo "  $BUNDLE_URL"
		echo "  to: $BUNDLE_FILE"
	fi
fi

# 初始化数据目录
mkdir -p /etc/sub-store

# 设置init.d权限并启用
chmod +x /etc/init.d/substore
/etc/init.d/substore enable

echo "Sub-Store installed. Enable it in Services > Sub-Store."
