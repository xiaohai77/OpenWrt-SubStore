#!/bin/sh
set -e

WGET=$(command -v wget)
MV=$(command -v mv)
RM=$(command -v rm)
BUNDLE=/usr/libexec/substore/sub-store.bundle.js
TMP="$BUNDLE.tmp"

if [ -z "$WGET" ]; then
	echo "FAIL: wget 命令未找到" >&2
	exit 1
fi

"$WGET" -q -O "$TMP" "https://github.com/sub-store-org/Sub-Store/releases/latest/download/sub-store.bundle.js"

if [ ! -s "$TMP" ]; then
	"$RM" -f "$TMP"
	echo "FAIL: 下载失败，文件为空" >&2
	exit 1
fi

"$MV" -f "$TMP" "$BUNDLE"

/etc/init.d/substore restart

sleep 2

if ! pgrep -f "$BUNDLE" >/dev/null; then
	echo "FAIL: 重启后未检测到进程运行" >&2
	exit 1
fi

echo "OK"
exit 0
