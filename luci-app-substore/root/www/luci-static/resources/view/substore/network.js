'use strict';
'require view';
'require form';
'require uci';

// 校验监听地址：只允许 ::（IPv6 全部地址）、0.0.0.0（IPv4 全部地址）、
// 127.0.0.1（仅本机回环）这三个精确值，其余一律视为非法——不再放行
// 任意合法 IPv4/IPv6，避免监听到不该监听的地址上。
function validateHost(value) {
	if (!value || value.trim() === '') return true;
	var v = value.trim();

	if (v === '::' || v === '0.0.0.0' || v === '127.0.0.1') return true;

	return _('监听地址只能是 ::（IPv4+IPv6）、0.0.0.0（仅IPv4）或 127.0.0.1（仅本机）');
}

// 校验代理地址：必须以支持的协议开头，且后面有实际内容
function validateProxy(value) {
	if (!value || value.trim() === '') return true;
	var v = value.trim();
	if (/^(http|https|socks5):\/\/.+/.test(v)) return true;
	return _('代理地址必须以 http://、https:// 或 socks5:// 开头');
}

return view.extend({
	load: function() {
		return uci.load('substore');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('substore', _('Sub-Store'), null);

		s = m.section(form.NamedSection, 'config', 'substore', _('端口与网络'));
		s.anonymous = true;

		o = s.option(form.Value, 'frontend_port', _('服务端口'), _('前端和后端统一使用此端口'));
		o.default = '3001';
		o.datatype = 'port';

		o = s.option(form.Value, 'frontend_host', _('监听地址'), _('::（同时监听 IPv4/IPv6）、0.0.0.0（仅 IPv4）'));
		o.default = '::';
		o.placeholder = '::';
		o.validate = function(section_id, value) {
			return validateHost(value);
		};

		o = s.option(form.Value, 'backend_default_proxy', _('默认代理'), _('抓取订阅时使用的代理，支持 socks5://、http://、https://'));
		o.placeholder = 'http://127.0.0.1:7890';
		o.validate = function(section_id, value) {
			return validateProxy(value);
		};

		return m.render();
	}
});
