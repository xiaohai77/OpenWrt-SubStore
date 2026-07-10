#!/bin/sh
set -e

SOURCE="$1"
if [ "$SOURCE" != "proxy" ] && [ "$SOURCE" != "mirror" ] && [ "$SOURCE" != "official" ]; then
	echo "FAIL: 参数必须是 proxy、mirror 或 official（实际收到: $SOURCE）" >&2
	exit 1
fi

NODE=$(command -v node)
MV=$(command -v mv)
RM=$(command -v rm)
FIND=$(command -v find)
UNZIP=$(command -v unzip)

ZIP_PATH=/tmp/dist.zip
DIST_PATH=/www/sub-store/dist
DIST_BAK_PATH=/www/sub-store/dist.bak
DIST_NEW_PATH=/www/sub-store/dist.new
PROXY_PREFIX="https://ghfast.top/"
OFFICIAL_URL="https://github.com/sub-store-org/Sub-Store-Front-End/releases/latest/download/dist.zip"
PROXY_URL="$PROXY_PREFIX$OFFICIAL_URL"
MIRROR_URL="https://substore-openwrt.445568.xyz/assets/dist.zip"
MIRROR_VERSION_URL="https://substore-openwrt.445568.xyz/assets/frontend-version.txt"
GITHUB_API_URL="https://api.github.com/repos/sub-store-org/Sub-Store-Front-End/releases/latest"
PROXY_API_URL="$PROXY_PREFIX$GITHUB_API_URL"
VERSION_FILE="/usr/libexec/substore/frontend.version"

if [ -z "$NODE" ] || [ -z "$UNZIP" ]; then
	echo "FAIL: node 或 unzip 命令未找到" >&2
	exit 1
fi

case "$SOURCE" in
	proxy) URL="$PROXY_URL" ;;
	mirror) URL="$MIRROR_URL" ;;
	official) URL="$OFFICIAL_URL" ;;
esac

DL_OUTPUT=$("$NODE" -e "
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream('$ZIP_PATH'));
  const head = Buffer.alloc(4);
  const fd = fs.openSync('$ZIP_PATH', 'r');
  fs.readSync(fd, head, 0, 4, 0);
  fs.closeSync(fd);
  const isZip = head[0] === 0x50 && head[1] === 0x4b;
  if (!isZip) throw new Error('返回内容不是有效的 zip 文件（可能是 404 错误页）');
}

download('$URL').catch(function(e) {
  console.log('DOWNLOAD_FAILED: ' + (e && e.message || e));
});
")

if [ -n "$DL_OUTPUT" ]; then
	"$RM" -f "$ZIP_PATH"
	echo "$DL_OUTPUT"
	exit 0
fi

if [ ! -s "$ZIP_PATH" ]; then
	"$RM" -f "$ZIP_PATH"
	echo "DOWNLOAD_FAILED: 下载后文件为空"
	exit 0
fi

"$RM" -rf "$DIST_NEW_PATH"
mkdir -p "$DIST_NEW_PATH"
"$UNZIP" -q "$ZIP_PATH" -d "$DIST_NEW_PATH"

INDEX_PATH=$("$FIND" "$DIST_NEW_PATH" -maxdepth 4 -name index.html -print | head -n 1)

if [ -z "$INDEX_PATH" ]; then
	"$RM" -rf "$DIST_NEW_PATH" "$ZIP_PATH"
	echo "FAIL: 解压结果中未找到 index.html" >&2
	exit 1
fi

REAL_ROOT=$(dirname "$INDEX_PATH")

"$RM" -rf "$DIST_BAK_PATH"
[ -d "$DIST_PATH" ] && "$MV" "$DIST_PATH" "$DIST_BAK_PATH"
"$MV" "$REAL_ROOT" "$DIST_PATH"
"$RM" -rf "$DIST_NEW_PATH" "$ZIP_PATH"

if [ ! -f "$DIST_PATH/index.html" ]; then
	echo "FAIL: 切换后未找到 index.html" >&2
	exit 1
fi

"$NODE" -e "
const fs = require('fs');

function looksLikeVersionTag(s) {
  if (!s) return false;
  var t = String(s).trim();
  if (!t || t.length > 40) return false;
  if (/[<>\r\n\s]/.test(t)) return false;
  return /^[A-Za-z0-9._+-]+\$/.test(t);
}

async function fromProxyApi() {
  try {
    const res = await fetch('$PROXY_API_URL', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    var tag = data && data.tag_name;
    return looksLikeVersionTag(tag) ? tag : null;
  } catch (e) {
    return null;
  }
}

async function fromMirror() {
  try {
    const res = await fetch('$MIRROR_VERSION_URL', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return looksLikeVersionTag(text) ? text : null;
  } catch (e) {
    return null;
  }
}

async function fromDirectApi() {
  try {
    const res = await fetch('$GITHUB_API_URL', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    var tag = data && data.tag_name;
    return looksLikeVersionTag(tag) ? tag : null;
  } catch (e) {
    return null;
  }
}

var ORDER = {
  proxy:    [fromProxyApi, fromMirror, fromDirectApi],
  mirror:   [fromMirror, fromProxyApi, fromDirectApi],
  official: [fromDirectApi, fromProxyApi, fromMirror]
};

(async () => {
  var fns = ORDER['$SOURCE'] || ORDER.official;
  var tag = null;
  for (var i = 0; i < fns.length; i++) {
    tag = await fns[i]();
    if (tag) break;
  }

  if (tag) {
    fs.writeFileSync('$VERSION_FILE', tag);
  } else {
    console.error('本次没能确定版本号，保留原有记录');
  }
})().catch(function(e) {
  console.error('版本号查询流程异常（不影响本次更新结果）：' + (e && e.message || e));
});
" || true

echo "OK"
exit 0
