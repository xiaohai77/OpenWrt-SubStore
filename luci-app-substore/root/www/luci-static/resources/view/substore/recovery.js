'use strict';
'require view';
'require form';
'require uci';

return view.extend({
	load: function() {
		return uci.load('substore');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('substore', _('Sub-Store'), null);

		s = m.section(form.NamedSection, 'config', 'substore', _('启动数据恢复'));
		s.anonymous = true;

		o = s.option(form.Value, 'data_url', _('远程数据URL'), _('启动时从此地址拉取并恢复数据，支持 Gist Raw 链接'));
		o.placeholder = 'https://gist.githubusercontent.com/user/id/raw/Sub-Store#noCache';

		o = s.option(form.Value, 'data_url_post', _('拉取后执行'), _('拉取数据后执行的 JS 表达式，例如设置 Gist Token'));
		o.placeholder = "content.settings.gistToken='your_token_here'";

		return m.render();
	}
});
