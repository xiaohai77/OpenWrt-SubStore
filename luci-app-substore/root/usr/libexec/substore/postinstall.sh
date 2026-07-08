#!/bin/sh

mkdir -p /etc/sub-store

chmod +x /etc/init.d/substore
/etc/init.d/substore enable
/etc/init.d/substore start

echo "Sub-Store installed."

rm -f /tmp/luci-indexcache* 2>/dev/null
rm -f /tmp/luci-modulecache/* 2>/dev/null
rm -f /tmp/luci-indexcache 2>/dev/null

/etc/init.d/rpcd reload >/dev/null 2>&1

exit 0
