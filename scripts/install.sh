#!/bin/sh
# luci-app-substore 一键安装脚本
# 用法: wget -O - https://substore-openwrt.pages.dev/install.sh | ash

set -e

REPO_URL="https://substore-openwrt.445568.xyz"

echo "=== luci-app-substore 一键安装 ==="

if [ -x /usr/bin/apk ]; then
    echo "检测到 apk 包管理器 (OpenWrt 25.12+)"

    wget -q -O /etc/apk/keys/substore-apk.pem "$REPO_URL/substore-apk.pem"

    echo "添加软件源..."
    mkdir -p /etc/apk/repositories.d
    if ! grep -q "substore" /etc/apk/repositories.d/customfeeds.list 2>/dev/null; then
        echo "$REPO_URL/openwrt-25.12/all/packages.adb" >> /etc/apk/repositories.d/customfeeds.list
    fi

    echo "更新索引..."
    apk update

    echo "安装 luci-app-substore..."
    apk add luci-app-substore

elif [ -x /bin/opkg ]; then
    echo "检测到 opkg 包管理器 (OpenWrt 24.10 及更早)"

    wget -q -O /tmp/substore-ipk.pub "$REPO_URL/substore-ipk.pub"
    opkg-key add /tmp/substore-ipk.pub
    rm -f /tmp/substore-ipk.pub

    echo "添加软件源..."
    if ! grep -q "substore" /etc/opkg/customfeeds.conf 2>/dev/null; then
        echo "src/gz substore $REPO_URL/openwrt-23.05/all" >> /etc/opkg/customfeeds.conf
    fi

    echo "更新索引..."
    opkg update

    echo "安装 luci-app-substore..."
    opkg install luci-app-substore

else
    echo "错误: 未检测到 opkg 或 apk，不支持的系统" >&2
    exit 1
fi

echo "=== 安装完成 ==="
echo "请在 LuCI 中查看 luci-app-substore"
