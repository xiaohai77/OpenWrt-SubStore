'use strict';
'require view';
'require form';
'require uci';
'require rpc';
'require ui';
'require fs';

var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

var callInitAction = rpc.declare({
	object: 'rc',
	method: 'init',
	params: ['name', 'action']
});

var callRunCmd = rpc.declare({
	object: 'file',
	method: 'exec',
	params: ['command', 'params'],
	expect: { '': {} }
});

function getServiceStatus() {
	return callServiceList('substore').then(function(res) {
		try {
			return res['substore']['instances']['instance1']['running'];
		} catch(e) {
			return false;
		}
	});
}

function isServiceEnabled() {
	return uci.get('substore', 'config', 'enabled') === '1';
}

function readVersionFile(path) {
	return fs.read(path).then(function(v) {
		return (v || '').trim();
	}).catch(function() {
		return null;
	});
}

function loadVersionInfo() {
	return Promise.all([
		readVersionFile('/usr/libexec/substore/backend.version'),
		readVersionFile('/usr/libexec/substore/frontend.version')
	]).then(function(res) {
		return {
			backendVersion: res[0],
			frontendVersion: res[1]
		};
	});
}

function escapeHtml(s) {
	return String(s).replace(/[&<>"']/g, function(c) {
		return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
	});
}

function formatVersionLine(label, version) {
	var v = (version && version !== 'unknown') ? version : '未知';
	if (v.length > 60) {
		v = v.slice(0, 60) + '…';
	}
	return '<div style="display:flex !important;justify-content:space-between;align-items:center;' +
		'background:linear-gradient(135deg,#ffffff,#f5f7fb);' +
		'border:1px solid #e3e8f0;border-radius:8px;' +
		'padding:5px 10px;' +
		'box-shadow:0 1px 2px rgba(0,0,0,0.04);width:100% !important;box-sizing:border-box;">' +
		'<span style="font-size:11px;color:#8a94a6;font-weight:500;">' + label + '</span>' +
		'<span style="font-size:13px;font-weight:600;color:#2d3748;word-break:break-all;text-align:right;">' + escapeHtml(v) + '</span>' +
		'</div>';
}

function renderVersionInfo(info) {
	return '<div style="display:grid !important;grid-template-columns:repeat(2,1fr) !important;gap:8px !important;width:100% !important;">' +
		formatVersionLine('后端版本', info.backendVersion) +
		formatVersionLine('前端版本', info.frontendVersion) +
		'</div>';
}

function renderStatusBadge(isRunning) {
	var color = isRunning ? '#2ecc71' : '#e74c3c';
	var text = 'SubStore ' + (isRunning ? '运行中' : '未运行');
	return '<div id="substore_status_indicator" style="display:flex !important;align-items:center;justify-content:center;gap:8px;' +
		'background:linear-gradient(135deg,#ffffff,#f5f7fb);' +
		'border:1px solid #e3e8f0;border-radius:8px;' +
		'padding:8px 14px;width:100% !important;box-sizing:border-box;' +
		'box-shadow:0 1px 2px rgba(0,0,0,0.04);">' +
		'<span style="width:9px;height:9px;border-radius:50%;background:' + color + ';flex-shrink:0;"></span>' +
		'<span style="font-style:italic;font-weight:700;font-size:15px;line-height:1.4 !important;color:' + color + ';letter-spacing:-0.3px;">' + text + '</span>' +
		'</div>';
}

function actionButtonStyle(enabled) {
	var base = 'display:block !important;width:100% !important;box-sizing:border-box !important;' +
		'margin:0 !important;float:none !important;text-align:center;padding:8px 8px;' +
		'font-size:13px;font-weight:400;line-height:1.4 !important;overflow:visible !important;' +
		'white-space:normal !important;height:auto !important;';
	return base + (enabled ? '' : 'opacity:0.45;filter:grayscale(70%);cursor:not-allowed;');
}

function renderToggleButton(isRunning) {
	var label = isRunning ? '停止服务' : '启动服务';
	var cls = isRunning ? 'cbi-button-remove' : 'cbi-button-action';
	return '<button id="btn_toggle" class="btn cbi-button ' + cls + '" ' +
		'style="' + actionButtonStyle(true) + '">' + label + '</button>';
}

function renderOpenPanelGridButton(isRunning, url) {
	if (isRunning) {
		return '<a href="' + url + '" target="_blank" id="substore_open_btn" ' +
			'class="btn cbi-button cbi-button-action" style="' + actionButtonStyle(true) + '">打开面板</a>';
	}
	return '<span id="substore_open_btn" class="btn cbi-button cbi-button-action" ' +
		'style="' + actionButtonStyle(false) + 'pointer-events:none;">打开面板</span>';
}

function renderActionsPanel(isRunning, isEnabled, url) {
	var toggleHtml = renderToggleButton(isRunning);
	var openHtml = renderOpenPanelGridButton(isRunning, url);
	var restartStyle = actionButtonStyle(isEnabled);
	return '<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #e3e8f0;">' + toggleHtml + '</div>' +
		'<div style="display:grid !important;grid-template-columns:repeat(2,1fr) !important;gap:8px !important;width:100% !important;align-items:stretch;">' +
		openHtml +
		'<button class="btn cbi-button cbi-button-apply" id="btn_restart" style="' + restartStyle + '">重启服务</button>' +
		'</div>';
}

function injectDesktopCss() {
	if (document.getElementById('substore_desktop_css')) return;
	var style = document.createElement('style');
	style.id = 'substore_desktop_css';
	style.textContent =
		'@media (min-width: 768px) {' +
		'#substore_status_wrap, #substore_version_info, #substore_actions_panel, #substore_update_panel {' +
		'max-width: 480px !important; margin-left: 0 !important; margin-right: auto !important;' +
		'}' +
		'}';
	document.head.appendChild(style);
}

function runSourceScript(scriptPath, source) {
	return callRunCmd(scriptPath, [source]).then(function(res) {
		var stdout = (res && res.stdout) ? res.stdout.trim() : '';
		var stderr = (res && res.stderr) ? res.stderr.trim() : '';
		var code = res ? res.code : -1;

		if (code === 0 && stdout === 'OK') {
			return { ok: true };
		}
		if (code === 0 && stdout.indexOf('DOWNLOAD_FAILED:') === 0) {
			return { ok: false, retry: true, message: stdout.slice('DOWNLOAD_FAILED:'.length).trim() };
		}
		return { ok: false, retry: false, message: stderr || stdout || ('脚本执行失败（退出码 ' + code + '）') };
	});
}

var SOURCE_CHAIN = [
	{ source: 'proxy', name: '加速代理' },
	{ source: 'mirror', name: '静态镜像' },
	{ source: 'official', name: '官方源' }
];

function updateWithFallback(scriptPath, label, statusEl) {
	function tryStep(i) {
		var step = SOURCE_CHAIN[i];
		statusEl.style.color = '#666';
		statusEl.textContent = '正在尝试' + step.name + '下载' + label + '...';

		return runSourceScript(scriptPath, step.source).then(function(r) {
			if (r.ok) return r;
			if (!r.retry) throw new Error(r.message);

			var next = SOURCE_CHAIN[i + 1];
			if (!next) throw new Error(step.name + '下载失败：' + r.message);

			statusEl.style.color = '#e67e22';
			statusEl.textContent = step.name + '下载失败（' + r.message + '），正在改用' + next.name + '...';

			return tryStep(i + 1);
		});
	}

	return tryStep(0);
}

function buildPanelUrl(sectionId) {
	var port = uci.get('substore', sectionId || 'config', 'frontend_port') || '3001';
	var path = uci.get('substore', sectionId || 'config', 'frontend_backend_path') || '/sub-store-api';
	var host = window.location.hostname;
	return 'http://' + host + ':' + port + '?api=http://' + host + ':' + port + path;
}

function refreshRunningState(node) {
	return getServiceStatus().then(function(running) {
		var indicatorWrap = node.querySelector('#substore_status_wrap');
		if (indicatorWrap) {
			indicatorWrap.innerHTML = renderStatusBadge(running);
		}
		var actionsWrap = node.querySelector('#substore_actions_panel');
		if (actionsWrap) {
			actionsWrap.innerHTML = renderActionsPanel(running, isServiceEnabled(), buildPanelUrl());
			bindActionButtons(node);
		}
		return running;
	});
}

function waitForPanelReady(maxAttempts, intervalMs) {
	if (window.location.protocol === 'https:') {
		return new Promise(function(resolve) {
			setTimeout(resolve, 1500);
		});
	}

	var port = uci.get('substore', 'config', 'frontend_port') || '3001';
	var url = 'http://' + window.location.hostname + ':' + port + '/';

	function attempt(n) {
		return fetch(url, { mode: 'no-cors', cache: 'no-store' }).then(function() {
			return true;
		}).catch(function() {
			if (n <= 0) return false;
			return new Promise(function(resolve) {
				setTimeout(function() {
					resolve(attempt(n - 1));
				}, intervalMs);
			});
		});
	}

	return attempt(maxAttempts);
}

function waitForApplySettle(ms) {
	return new Promise(function(resolve) {
		setTimeout(resolve, ms || 2000);
	});
}

function afterActionReload(action) {
	if (action === 'stop') {
		return waitForApplySettle(1500).then(function() {
			window.location.reload();
		});
	}
	return waitForPanelReady(10, 500).then(function() {
		window.location.reload();
	});
}

function runInitActionAndReload(action) {
	return callInitAction('substore', action).then(function() {
		return afterActionReload(action);
	});
}

function suppressChangeIndicator() {
	if (!ui.changes || typeof ui.changes.setIndicator !== 'function') {
		return function() {};
	}
	var original = ui.changes.setIndicator;
	ui.changes.setIndicator = function() {
		return original.call(ui.changes, 0);
	};
	return function restore() {
		ui.changes.setIndicator = original;
	};
}

function toggleServiceAndReload(action) {
	var newEnabled = (action === 'start') ? '1' : '0';
	var restoreIndicator = suppressChangeIndicator();

	uci.set('substore', 'config', 'enabled', newEnabled);

	return uci.save().then(function() {
		return uci.apply();
	}).then(function() {
		return afterActionReload(action);
	}).finally(function() {
		restoreIndicator();
	});
}

var ENABLE_HINT_TEXT = '服务当前未启用：请先点击"启动服务" ';

function guardedClick(btn, action) {
	if (!btn) return;
	btn.addEventListener('click', function() {
		if (!isServiceEnabled()) return;
		action();
	});
}

function bindActionButtons(node) {
	var btnToggle = node.querySelector('#btn_toggle');
	if (btnToggle) {
		btnToggle.addEventListener('click', function() {
			var action = btnToggle.textContent.indexOf('停止') !== -1 ? 'stop' : 'start';
			btnToggle.disabled = true;
			if (action === 'start') btnToggle.style.color = '#e67e22';
			btnToggle.textContent = (action === 'stop') ? '停止中...' : '启动中...';
			toggleServiceAndReload(action).catch(function() {
				ui.addNotification(null, E('p', (action === 'stop' ? '停止' : '启动') + '失败。'), 'danger');
				btnToggle.disabled = false;
				btnToggle.style.color = '';
				btnToggle.textContent = (action === 'stop') ? '停止服务' : '启动服务';
			});
		});
	}

	var btnRestart = node.querySelector('#btn_restart');
	guardedClick(btnRestart, function() {
		btnRestart.disabled = true;
		btnRestart.style.color = '#e67e22';
		btnRestart.textContent = '重启中...';
		runInitActionAndReload('restart').catch(function() {
			ui.addNotification(null, E('p', '重启失败。'), 'danger');
			btnRestart.disabled = false;
			btnRestart.style.color = '';
			btnRestart.textContent = '重启服务';
		});
	});
}

function forceStackedRow(node, innerId, align) {
	var el = node.querySelector('#' + innerId);
	if (!el) return;

	var row = el.closest('.cbi-value') || el.parentElement;
	if (row) {
		row.style.setProperty('display', 'block', 'important');
		row.style.overflow = 'visible';
	}

	var title = row ? row.querySelector('.cbi-value-title') : null;
	if (title) {
		title.style.setProperty('display', 'block', 'important');
		title.style.setProperty('width', 'auto', 'important');
		title.style.setProperty('float', 'none', 'important');
		title.style.marginBottom = '8px';
		if (align) {
			title.style.setProperty('text-align', align, 'important');
		}
	}

	var field = row ? row.querySelector('.cbi-value-field') : null;
	if (field) {
		field.style.setProperty('display', 'block', 'important');
		field.style.setProperty('width', '100%', 'important');
		field.style.setProperty('max-width', 'none', 'important');
		field.style.setProperty('margin-left', '0', 'important');
		field.style.setProperty('float', 'none', 'important');
	}
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('substore'),
			getServiceStatus(),
			loadVersionInfo()
		]);
	},

	render: function(data) {
		var isRunning = data[1];
		var versionInfo = data[2];
		var isEnabled = isServiceEnabled();
		var m, s, o;

		m = new form.Map('substore', _('Sub-Store'),
			_('高级订阅管理器'));

		s = m.section(form.NamedSection, 'config', 'substore', _('服务状态'));
		s.anonymous = true;

		o = s.option(form.DummyValue, '_status', '');
		o.rawhtml = true;
		o.cfgvalue = function() {
			return '<div id="substore_status_wrap">' + renderStatusBadge(isRunning) + '</div>';
		};

		o = s.option(form.DummyValue, '_version', '');
		o.rawhtml = true;
		o.cfgvalue = function() {
			return '<div id="substore_version_info">' + renderVersionInfo(versionInfo) + '</div>';
		};

		o = s.option(form.DummyValue, '_actions', _('操作'));
		o.rawhtml = true;
		o.cfgvalue = function(section_id) {
			return '<div id="substore_actions_panel">' + renderActionsPanel(isRunning, isEnabled, buildPanelUrl(section_id)) + '</div>';
		};
		o.write = function() {};

		o = s.option(form.DummyValue, '_update', '');
		o.rawhtml = true;
		o.cfgvalue = function() {
			var style = actionButtonStyle(isEnabled);
			return '<div id="substore_update_panel" style="display:grid !important;grid-template-columns:repeat(2,1fr) !important;gap:8px !important;width:100% !important;align-items:stretch;margin-top:8px;">' +
				'<button class="btn cbi-button cbi-button-action" id="btn_update_backend" style="' + style + '">更新后端</button>' +
				'<button class="btn cbi-button cbi-button-action" id="btn_update_frontend" style="' + style + '">更新前端</button>' +
				'<span id="update_status" style="grid-column:1 / -1;font-size:13px;color:#666;text-align:center;"></span>' +
				'</div>';
		};
		o.write = function() {};

		o = s.option(form.DummyValue, '_enable_hint', '');
		o.rawhtml = true;
		o.cfgvalue = function() {
			if (isEnabled) return '';
			return '<div id="substore_enable_hint" style="color:#e74c3c;font-size:13px;">⚠ ' + escapeHtml(ENABLE_HINT_TEXT) + '</div>';
		};

		s = m.section(form.NamedSection, 'config', 'substore', _('基础设置'));
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Value, 'data_dir', _('数据目录'), _('Sub-Store 数据文件存放路径'));
		o.default = '/etc/sub-store';
		o.placeholder = '/etc/sub-store';

		o = s.option(form.Value, 'backend_custom_name', _('实例名称'), _('显示在前端界面上的后端名称'));
		o.default = 'OpenWrt';

		o = s.option(form.Value, 'frontend_backend_path', _('后端路径前缀'), _('作为 API 路径使用，避免使用特殊符号'));
		o.default = '/sub-store-api';
		o.placeholder = 'sub-store-api';

		o.cfgvalue = function(section_id) {
			var v = uci.get('substore', section_id, 'frontend_backend_path') || this.default;
			return v.replace(/^\/+/, '');
		};

		o.write = function(section_id, value) {
			value = (value || '').replace(/^\/+/, '');
			if (value === '') {
				uci.set('substore', section_id, 'frontend_backend_path', this.default);
			} else {
				uci.set('substore', section_id, 'frontend_backend_path', '/' + value);
			}
		};

		return m.render().then(function(node) {

			injectDesktopCss();

			forceStackedRow(node, 'substore_status_wrap');
			forceStackedRow(node, 'substore_version_info');
			forceStackedRow(node, 'substore_actions_panel', 'left');
			forceStackedRow(node, 'substore_update_panel');

			bindActionButtons(node);

			var btnUpdateBackend = node.querySelector('#btn_update_backend');
			var updateStatus = node.querySelector('#update_status');
			guardedClick(btnUpdateBackend, function() {
				btnUpdateBackend.disabled = true;

				updateWithFallback('/usr/libexec/substore/update-backend.sh', '后端', updateStatus).then(function() {
					updateStatus.style.color = '#2ecc71';
					updateStatus.textContent = '后端已更新并重启成功。';
					return Promise.all([loadVersionInfo(), refreshRunningState(node)]);
				}).then(function(res) {
					var info = res[0];
					if (!info) return;
					var el = node.querySelector('#substore_version_info');
					if (el) el.innerHTML = renderVersionInfo(info);
				}).catch(function(err) {
					updateStatus.style.color = '#e74c3c';
					updateStatus.textContent = '后端更新失败：' + (err && err.message ? err.message : '未知错误');
				}).finally(function() {
					btnUpdateBackend.disabled = false;
				});
			});

			var btnUpdateFrontend = node.querySelector('#btn_update_frontend');
			guardedClick(btnUpdateFrontend, function() {
				btnUpdateFrontend.disabled = true;

				updateWithFallback('/usr/libexec/substore/update-frontend.sh', '前端', updateStatus).then(function() {
					updateStatus.style.color = '#2ecc71';
					updateStatus.textContent = '前端已更新。';
					return loadVersionInfo();
				}).then(function(info) {
					if (!info) return;
					var el = node.querySelector('#substore_version_info');
					if (el) el.innerHTML = renderVersionInfo(info);
				}).catch(function(err) {
					updateStatus.style.color = '#e74c3c';
					updateStatus.textContent = '前端更新失败：' + (err && err.message ? err.message : '未知错误');
				}).finally(function() {
					btnUpdateFrontend.disabled = false;
				});
			});

			return node;
		});
	},
});
