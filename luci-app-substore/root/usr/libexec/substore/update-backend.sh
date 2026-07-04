#!/bin/sh
set -e

NODE=$(command -v node)
MV=$(command -v mv)
RM=$(command -v rm)
BUNDLE=/usr/libexec/substore/sub-store.bundle.js
TMP="$BUNDLE.tmp"
URL="https://github.com/sub-store-org/Sub-Store/releases/latest/download/sub-store.bundle.js"

if [ -z "$NODE" ]; then
	echo "FAIL: node 命令未找到" >&2
	exit 1
fi

# 不再依赖 wget/uclient-fetch 等外部下载工具，node 自带的 fetch 本身
# 就有完整的 HTTPS 实现（跟妙妙屋的 Go 二进制自带网络栈是同一个思路），
# 反正 node 本身就是跑后端必须要装的东西，不算多引入依赖。
"$NODE" -e "
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
(async () => {
  const res = await fetch('$URL');
  if (!res.ok) { console.error('HTTP ' + res.status); process.exit(1); }
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream('$TMP'));
})().catch(e => { console.error(e && e.message || e); process.exit(1); });
"

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
