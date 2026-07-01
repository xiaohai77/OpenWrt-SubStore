include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for Sub-Store (Subscription Manager)
LUCI_DEPENDS:=+node +unzip +wget-ssl
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-substore
PKG_VERSION:=2.9
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=xiaohai77

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
	$(INSTALL_BIN) ./root/usr/libexec/substore/sub-store.bundle.js $(1)/usr/libexec/substore/sub-store.bundle.js
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
	cp -r ./root/www/sub-store/dist $(1)/www/sub-store/
endef

define Package/luci-app-substore/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/usr/libexec/substore/postinstall.sh
exit 0
endef

$(eval $(call BuildPackage,luci-app-substore))
