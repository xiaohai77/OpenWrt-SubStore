#!/bin/sh

mkdir -p /etc/sub-store

chmod +x /etc/init.d/substore
/etc/init.d/substore enable

echo "Sub-Store installed."

rm -f /tmp/luci-indexcache* 
rm -rf /tmp/luci-modulecache/
killall -HUP rpcd 2>/dev/null

exit 0
