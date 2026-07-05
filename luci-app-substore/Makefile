include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for Sub-Store (Subscription Manager)
LUCI_DEPENDS:=+node +unzip
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-substore
PKG_VERSION:=2.9
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=xiaohai77

# 之前 sub-store.bundle.js / dist 是靠 GitHub Actions 编译前手动 wget 塞进
# root/ 目录，git 仓库里从没提交过。别人拿仓库当 feed 编译会因为 root/
# 下没这两个文件而失败。
#
# 上一版我把下载动作放进了 Build/Prepare，结果实测发现 luci.mk 这种
# arch:all、没有真正编译步骤的纯前端包，压根不会触发 Build/Prepare 这个
# 阶段（它走的是更简化的直装流程），导致下载代码从没执行过。
# 这一版改成直接放进 Package/install 里——这一步是确定会执行的
# （旧版本 Makefile 靠的也是这个阶段），下载完直接装到 $(1) 里，
# 不再依赖 PKG_BUILD_DIR / Build/Prepare。
#
# 2026-07 修复 (第一版)：之前这里直连 GitHub Releases 下载 bundle.js /
# dist.zip，没有超时设置。固件编译是大规模并行 make，同一个 runner 上
# 同时有几十个下载/编译任务抢网络带宽，某个连接被挤到极慢（不是断，是
# 几乎不流动），而 wget 默认没有超时，只要连接没被服务器断开就会一直
# 等，不报错也不退出，导致整个固件编译卡死几个小时（现象是编译日志停
# 在某个毫不相关的包上，因为那只是并行编译里刚好同时跑完的其他任务）。
# 于是改成优先走自己的 Cloudflare 镜像（跟 ipk/apk 签名索引同一套基建），
# 镜像失败再退回 GitHub 直连兜底，并加上超时/重试。
#
# 2026-07 修复 (第二版)：第一版校验只检查了"文件大小不为0"，结果
# Cloudflare Pages 对不存在的路径（还没跑过 deploy.yml 生成 /assets/
# 下的文件时）会返回一个非空的 404 错误页（HTML），被误判成"下载成功"，
# 直到 unzip 才发现根本不是个 zip，编译失败。现在两处下载都额外做了
# 内容校验（zip 用 unzip -t 测试完整性，js bundle 检查开头不是 HTML
# 错误页），镜像返回的东西即使非空、只要内容不对，也会被判定失败并
# 退回官方 GitHub 源，而不是原样往下走导致后面 unzip/安装失败。
SUBSTORE_MIRROR_BACKEND_URL:=https://substore-openwrt.445568.xyz/assets/sub-store.bundle.js
SUBSTORE_MIRROR_FRONTEND_URL:=https://substore-openwrt.445568.xyz/assets/dist.zip
SUBSTORE_BACKEND_URL:=https://github.com/sub-store-org/Sub-Store/releases/latest/download/sub-store.bundle.js
SUBSTORE_FRONTEND_URL:=https://github.com/sub-store-org/Sub-Store-Front-End/releases/latest/download/dist.zip

# 连接超时15秒、总重试2次、重试间隔3秒——卡住15秒就判定失败，绝不无限等待。
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

	echo "下载 Sub-Store 后端 bundle（优先走自己的镜像）..."; \
	BACKEND_OUT="$(1)/usr/libexec/substore/sub-store.bundle.js"; \
	OK=0; \
	if wget $(WGET_OPTS) -q -O "$$BACKEND_OUT" "$(SUBSTORE_MIRROR_BACKEND_URL)" \
	   && [ -s "$$BACKEND_OUT" ] \
	   && ! head -c 200 "$$BACKEND_OUT" | grep -qi '<html\|<!DOCTYPE'; then \
		echo "后端 bundle 镜像下载成功"; OK=1; \
	else \
		echo "镜像下载失败/内容不对，改用官方源重试: $(SUBSTORE_BACKEND_URL)" >&2; \
		if wget $(WGET_OPTS) -q -O "$$BACKEND_OUT" "$(SUBSTORE_BACKEND_URL)" \
		   && [ -s "$$BACKEND_OUT" ] \
		   && ! head -c 200 "$$BACKEND_OUT" | grep -qi '<html\|<!DOCTYPE'; then \
			OK=1; \
		fi; \
	fi; \
	if [ "$$OK" != "1" ]; then \
		echo "错误: 后端 bundle 下载失败（镜像和官方源都拿不到有效文件）" >&2; \
		rm -f "$$BACKEND_OUT"; \
		exit 1; \
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
	echo "下载 Sub-Store 前端 dist（优先走自己的镜像）..."; \
	FRONTEND_ZIP="/tmp/substore-dist-luci-app-substore.zip"; \
	OK=0; \
	if wget $(WGET_OPTS) -q -O "$$FRONTEND_ZIP" "$(SUBSTORE_MIRROR_FRONTEND_URL)" \
	   && [ -s "$$FRONTEND_ZIP" ] \
	   && unzip -tq "$$FRONTEND_ZIP" >/dev/null 2>&1; then \
		echo "前端 dist 镜像下载成功"; OK=1; \
	else \
		echo "镜像下载失败/不是有效zip，改用官方源重试: $(SUBSTORE_FRONTEND_URL)" >&2; \
		if wget $(WGET_OPTS) -q -O "$$FRONTEND_ZIP" "$(SUBSTORE_FRONTEND_URL)" \
		   && [ -s "$$FRONTEND_ZIP" ] \
		   && unzip -tq "$$FRONTEND_ZIP" >/dev/null 2>&1; then \
			OK=1; \
		fi; \
	fi; \
	if [ "$$OK" != "1" ]; then \
		echo "错误: 前端 dist 下载失败（镜像和官方源都拿不到有效 zip）" >&2; \
		rm -f "$$FRONTEND_ZIP"; \
		exit 1; \
	fi; \
	unzip -q -o "$$FRONTEND_ZIP" -d $(1)/www/sub-store; \
	rm -f "$$FRONTEND_ZIP"
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
