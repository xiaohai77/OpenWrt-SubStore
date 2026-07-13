include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for Sub-Store (Subscription Manager)
LUCI_DEPENDS:=+node +unzip
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-substore
PKG_VERSION:=2.9
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=xiaohai

SUBSTORE_BACKEND_TAG:=
SUBSTORE_FRONTEND_TAG:=

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-substore/install
	SUBSTORE_BACKEND_TAG="$(SUBSTORE_BACKEND_TAG)" \
	SUBSTORE_FRONTEND_TAG="$(SUBSTORE_FRONTEND_TAG)" \
	sh $(CURDIR)/scripts/package-install.sh $(1) $(CURDIR)
endef

define Package/luci-app-substore/conffiles
/etc/config/substore
endef

define Package/luci-app-substore/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/usr/libexec/substore/postinstall.sh
exit 0
endef

$(eval $(call BuildPackage,luci-app-substore))
