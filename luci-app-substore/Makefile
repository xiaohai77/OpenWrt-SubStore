include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for Sub-Store (Subscription Manager)
LUCI_DEPENDS:=+node +unzip
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-substore
PKG_VERSION:=2.9
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=xiaohai77

SUBSTORE_BACKEND_URL:=https://github.com/sub-store-org/Sub-Store/releases/latest/download/sub-store.bundle.js
SUBSTORE_FRONTEND_URL:=https://github.com/sub-store-org/Sub-Store-Front-End/releases/latest/download/dist.zip
SUBSTORE_MIRROR_BACKEND_URL:=https://substore-openwrt.445568.xyz/assets/sub-store.bundle.js
SUBSTORE_MIRROR_FRONTEND_URL:=https://substore-openwrt.445568.xyz/assets/dist.zip

SUBSTORE_BACKEND_TAG:=
SUBSTORE_FRONTEND_TAG:=

WGET_OPTS:=--timeout=15 --tries=2 --waitretry=3

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-substore/install
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/substore $(1)/etc/init.d/substore
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./root/etc/config/substore $(1)/etc/config/substore
	$(INSTALL_DIR) $(1)/usr/libexec/substore
	$(INSTALL_BIN) ./root/usr/libexec/substore/postinstall.sh $(1)/usr/libexec/substore/postinstall.sh
	$(INSTALL_BIN) ./root/usr/libexec/substore/update-backend.sh $(1)/usr/libexec/substore/update-backend.sh
	$(INSTALL_BIN) ./root/usr/libexec/substore/update-frontend.sh $(1)/usr/libexec/substore/update-frontend.sh

	echo "下载 Sub-Store 后端 bundle（优先走官方源）..."
	if wget $(WGET_OPTS) -q -O $(1)/usr/libexec/substore/sub-store.bundle.js "$(SUBSTORE_BACKEND_URL)" \
	   && [ -s $(1)/usr/libexec/substore/sub-store.bundle.js ] \
	   && ! head -c 200 $(1)/usr/libexec/substore/sub-store.bundle.js | grep -qi '<html\|<!DOCTYPE'; then \
		echo "官方源下载后端 bundle 成功"; \
	elif wget $(WGET_OPTS) -q -O $(1)/usr/libexec/substore/sub-store.bundle.js "$(SUBSTORE_MIRROR_BACKEND_URL)" \
	   && [ -s $(1)/usr/libexec/substore/sub-store.bundle.js ] \
	   && ! head -c 200 $(1)/usr/libexec/substore/sub-store.bundle.js | grep -qi '<html\|<!DOCTYPE'; then \
		echo "官方源不通，已改用自己的镜像下载后端 bundle 成功"; \
	else \
		echo "错误: 后端 bundle 下载失败（镜像和官方源都拿不到有效文件）" >&2; \
		rm -f $(1)/usr/libexec/substore/sub-store.bundle.js; \
		exit 1; \
	fi

	echo "记录后端版本号..."
	if [ -n "$(SUBSTORE_BACKEND_TAG)" ]; then \
		echo "$(SUBSTORE_BACKEND_TAG)" > $(1)/usr/libexec/substore/backend.version; \
		echo "使用 CI 传入的后端版本号: $(SUBSTORE_BACKEND_TAG)"; \
	else \
		AUTH_HEADER=""; \
		[ -n "$$GITHUB_TOKEN" ] && AUTH_HEADER="--header=Authorization: token $$GITHUB_TOKEN"; \
		{ wget $(WGET_OPTS) $$AUTH_HEADER -qO- "https://api.github.com/repos/sub-store-org/Sub-Store/releases/latest" 2>/dev/null \
		    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n1; \
		  echo unknown; } | head -n1 > $(1)/usr/libexec/substore/backend.version; \
	fi

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-substore.json $(1)/usr/share/luci/menu.d/luci-app-substore.json
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-substore.json $(1)/usr/share/rpcd/acl.d/luci-app-substore.json
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/substore
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/substore/main.js $(1)/www/luci-static/resources/view/substore/main.js
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/substore/advanced.js $(1)/www/luci-static/resources/view/substore/advanced.js
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/substore/network.js $(1)/www/luci-static/resources/view/substore/network.js
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/substore/recovery.js $(1)/www/luci-static/resources/view/substore/recovery.js
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/substore/cron.js $(1)/www/luci-static/resources/view/substore/cron.js

	$(INSTALL_DIR) $(1)/www/sub-store
	echo "下载 Sub-Store 前端 dist（优先走官方源）..."
	if wget $(WGET_OPTS) -q -O /tmp/substore-dist-luci-app-substore.zip "$(SUBSTORE_FRONTEND_URL)" \
	   && [ -s /tmp/substore-dist-luci-app-substore.zip ] \
	   && unzip -tq /tmp/substore-dist-luci-app-substore.zip >/dev/null 2>&1; then \
		echo "官方源下载前端 dist 成功"; \
	elif wget $(WGET_OPTS) -q -O /tmp/substore-dist-luci-app-substore.zip "$(SUBSTORE_MIRROR_FRONTEND_URL)" \
	   && [ -s /tmp/substore-dist-luci-app-substore.zip ] \
	   && unzip -tq /tmp/substore-dist-luci-app-substore.zip >/dev/null 2>&1; then \
		echo "官方源不通，已改用自己的镜像下载前端 dist 成功"; \
	else \
		echo "错误: 前端 dist 下载失败（镜像和官方源都拿不到有效 zip）" >&2; \
		rm -f /tmp/substore-dist-luci-app-substore.zip; \
		exit 1; \
	fi
	unzip -q -o /tmp/substore-dist-luci-app-substore.zip -d $(1)/www/sub-store
	rm -f /tmp/substore-dist-luci-app-substore.zip

	echo "记录前端版本号..."
	if [ -n "$(SUBSTORE_FRONTEND_TAG)" ]; then \
		echo "$(SUBSTORE_FRONTEND_TAG)" > $(1)/usr/libexec/substore/frontend.version; \
		echo "使用 CI 传入的前端版本号: $(SUBSTORE_FRONTEND_TAG)"; \
	else \
		AUTH_HEADER=""; \
		[ -n "$$GITHUB_TOKEN" ] && AUTH_HEADER="--header=Authorization: token $$GITHUB_TOKEN"; \
		{ wget $(WGET_OPTS) $$AUTH_HEADER -qO- "https://api.github.com/repos/sub-store-org/Sub-Store-Front-End/releases/latest" 2>/dev/null \
		    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n1; \
		  echo unknown; } | head -n1 > $(1)/usr/libexec/substore/frontend.version; \
	fi
	if [ ! -f $(1)/www/sub-store/dist/index.html ]; then \
		echo "错误: 解压后没找到 dist/index.html，前端包结构可能变了" >&2; \
		exit 1; \
	fi
endef

define Package/luci-app-substore/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/usr/libexec/substore/postinstall.sh
exit 0
endef

$(eval $(call BuildPackage,luci-app-substore))
