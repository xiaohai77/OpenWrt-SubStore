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
# dist.zip，没有超时设置，固件并行编译时网络被挤慢会导致 wget 无限期
# 卡死不报错。改成优先走自己的 Cloudflare 镜像，镜像失败退回 GitHub
# 直连兜底，并加超时/重试。
#
# 2026-07 修复 (第二版)：校验只检查了"文件大小不为0"，Cloudflare 对不
# 存在的路径会返回非空的 404 HTML 错误页，被误判成"下载成功"。加上真正
# 的内容校验（zip 用 unzip -t，js bundle 检查开头不是 <html>）。
#
# 2026-07 修复 (第三版)：第二版里用了 BACKEND_OUT / FRONTEND_ZIP / OK 这
# 几个临时 shell 变量，写成 "$$VAR" 想让它在 Makefile 里转义成字面 "$VAR"
# 交给 shell——结果这段 install 脚本在 luci.mk 的构建模板里会被 $(call ...)
# 展开一次，recipe 执行前又会被 Make 展开一次，两轮展开只够消耗两个 "$"
# 中的一个，剩下的 "$B"/"$O" 在第二轮里被当成单字符变量引用（未定义，
# 展开为空），吞掉了变量名开头的字母，实际执行的命令变成了 -O "ACKEND_OUT"
# 这种残缺文件名，导致下载根本没写到预期路径、后续判断全部失真。
# 现在干脆去掉这些临时 shell 变量，改成直接重复写死路径 + 用 elif 链
# 代替状态标志位，彻底避开这个双重展开的坑。
#
# 2026-07 修复 (第四版)：之前是镜像优先、官方源兜底。但镜像内容依赖
# release-pipeline.yml 在触发编译前先把 /assets/ 刷新到 Cloudflare，
# 一旦这一步没跑或者没跑完，编译期拿到的就是镜像上的旧版本，等于要靠
# CI 编排顺序来保证内容新鲜，多绕了一层还容易踩坑。现在 WGET_OPTS 已经
# 有超时/重试兜底，直连 GitHub 官方源不会再无限期卡死，于是改回官方源
# 优先、镜像仅作为官方源不通时的兜底——内容新鲜度直接由上游保证，不用
# 再依赖 CI 编排顺序，release-pipeline.yml 里预热镜像的那一步也就不需要了。
SUBSTORE_BACKEND_URL:=https://github.com/sub-store-org/Sub-Store/releases/latest/download/sub-store.bundle.js
SUBSTORE_FRONTEND_URL:=https://github.com/sub-store-org/Sub-Store-Front-End/releases/latest/download/dist.zip
SUBSTORE_MIRROR_BACKEND_URL:=https://substore-openwrt.445568.xyz/assets/sub-store.bundle.js
SUBSTORE_MIRROR_FRONTEND_URL:=https://substore-openwrt.445568.xyz/assets/dist.zip

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

	# 2026-07 新增：记录当前装的后端对应哪个上游版本，供 LuCI 界面显示。
	# 这里跟 update-backend.sh 是两条独立的记录路径：这里只管编译安装
	# 这一刻的版本；一旦用户在面板里点了"更新后端"按钮，走的是
	# update-backend.sh 自己的下载+记录逻辑，会覆盖掉这里写的值，两边
	# 互不依赖、互不覆盖对方的时机。
	# 用 { 命令; echo unknown } | head -n1 这种管道写法、不引入任何 $$临时
	# 变量，是因为 Package/install 这个阶段的 recipe 会被多展开一轮，
	# "$$VAR" 这种写法在第40行附近的历史备注里已经证实会被吃掉字符。
	echo "记录后端版本号..."
	{ wget $(WGET_OPTS) -qO- "https://api.github.com/repos/sub-store-org/Sub-Store/releases/latest" 2>/dev/null \
	    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n1; \
	  echo unknown; } | head -n1 > $(1)/usr/libexec/substore/backend.version

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

	# 道理同后端：版本号在实际下载这一刻记录，跟 update-frontend.sh 用
	# 同一套逻辑，不依赖 deploy.yml 里的缓存。
	echo "记录前端版本号..."
	{ wget $(WGET_OPTS) -qO- "https://api.github.com/repos/sub-store-org/Sub-Store-Front-End/releases/latest" 2>/dev/null \
	    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n1; \
	  echo unknown; } | head -n1 > $(1)/usr/libexec/substore/frontend.version
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
