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
BUNDLE=/usr/libexec/substore/sub-store.bundle.js
TMP="$BUNDLE.tmp"
PROXY_PREFIX="https://gh.445568.xyz/"
OFFICIAL_URL="https://github.com/sub-store-org/Sub-Store/releases/latest/download/sub-store.bundle.js"
PROXY_URL="$PROXY_PREFIX$OFFICIAL_URL"
MIRROR_URL="https://substore-openwrt.445568.xyz/assets/sub-store.bundle.js"
MIRROR_VERSION_URL="https://substore-openwrt.445568.xyz/assets/backend-version.txt"
GITHUB_API_URL="https://api.github.com/repos/sub-store-org/Sub-Store/releases/latest"
PROXY_API_URL="$PROXY_PREFIX$GITHUB_API_URL"
VERSION_FILE="/usr/libexec/substore/backend.version"

if [ -z "$NODE" ]; then
	echo "FAIL: node 命令未找到" >&2
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
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream('$TMP'));
  const head = fs.readFileSync('$TMP', { encoding: 'utf8', flag: 'r' }).slice(0, 200);
  if (/<html|<!DOCTYPE/i.test(head)) {
    throw new Error('返回内容像是 HTML 错误页，不是 js bundle');
  }
}

download('$URL').catch(function(e) {
  console.log('DOWNLOAD_FAILED: ' + (e && e.message || e));
});
")

if [ -n "$DL_OUTPUT" ]; then
	"$RM" -f "$TMP"
	echo "$DL_OUTPUT"
	exit 0
fi

if [ ! -s "$TMP" ]; then
	"$RM" -f "$TMP"
	echo "DOWNLOAD_FAILED: 下载后文件为空"
	exit 0
fi

"$MV" -f "$TMP" "$BUNDLE"

/etc/init.d/substore restart

sleep 2

if ! pgrep -f "$BUNDLE" >/dev/null; then
	echo "FAIL: 重启后未检测到进程运行" >&2
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
