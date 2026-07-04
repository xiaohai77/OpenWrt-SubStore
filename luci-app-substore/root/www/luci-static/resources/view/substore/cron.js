'use strict';
'require view';
'require form';
'require uci';

// 校验单个 cron 字段值域，只对纯数字做范围检查，含 * / - , 的跳过范围检查
function validateCronField(val, min, max, fieldName) {
	if (val === '*') return true;
	if (/[\/\-\,\*]/.test(val)) return true; // 含特殊符号的组合写法，跳过范围校验
	var n = parseInt(val, 10);
	if (isNaN(n)) {
		return _('%s 字段包含非法字符').format(fieldName);
	}
	if (n < min || n > max) {
		return _('%s 字段范围为 %d-%d，当前值 %d 无效').format(fieldName, min, max, n);
	}
	return true;
}

// 校验标准 cron 表达式：5个字段，逐字段检查范围
function validateCron(value) {
	if (!value || value.trim() === '') return true;
	var parts = value.trim().split(/\s+/);
	if (parts.length !== 5) {
		return _('请输入有效的 cron 表达式（5个字段），例如：55 23 * * *');
	}
	var fields = [
		{ name: '分钟', min: 0, max: 59 },
		{ name: '小时', min: 0, max: 23 },
		{ name: '日',   min: 1, max: 31 },
		{ name: '月',   min: 1, max: 12 },
		{ name: '星期', min: 0, max: 7  }
	];
	for (var i = 0; i < 5; i++) {
		var result = validateCronField(parts[i], fields[i].min, fields[i].max, fields[i].name);
		if (result !== true) return result;
	}
	return true;
}

// 校验 produce_cron 格式：cron表达式,类型,名称；多个用分号分隔
function validateProduceCron(value) {
	if (!value || value.trim() === '') return true;
	var entries = value.trim().split(';');
	for (var i = 0; i < entries.length; i++) {
		var entry = entries[i].trim();
		if (!entry) continue;
		var parts = entry.split(',');
		if (parts.length < 3) {
			return _('第 %d 项格式错误，应为：cron表达式,类型,名称').format(i + 1);
		}
		var cronPart = parts[0].trim();
		var typePart = parts[1].trim();
		var namePart = parts[2].trim();

		var cronResult = validateCron(cronPart);
		if (cronResult !== true) {
			return _('第 %d 项 cron 表达式有误：%s').format(i + 1, cronResult);
		}
		if (typePart !== 'sub' && typePart !== 'col') {
			return _('第 %d 项类型必须为 sub 或 col，当前为：%s').format(i + 1, typePart);
		}
		if (!namePart) {
			return _('第 %d 项名称不能为空').format(i + 1);
		}
	}
	return true;
}

return view.extend({
	load: function() {
		return uci.load('substore');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('substore', _('Sub-Store'), null);

		s = m.section(form.NamedSection, 'config', 'substore', _('同步与定时任务'));
		s.anonymous = true;

		o = s.option(form.Value, 'backend_sync_cron', _('订阅同步定时'), _('定时将订阅推送到 Gist'));
		o.placeholder = '55 23 * * *';
		o.validate = function(section_id, value) {
			return validateCron(value);
		};

		o = s.option(form.Value, 'backend_upload_cron', _('数据备份定时'), _('定时将 Sub-Store 全部数据备份到 Gist'));
		o.placeholder = '0 2 * * *';
		o.validate = function(section_id, value) {
			return validateCron(value);
		};

		o = s.option(form.Value, 'backend_download_cron', _('数据恢复定时'), _('定时从 Gist 恢复 Sub-Store 数据'));
		o.placeholder = '55 22 * * *';
		o.validate = function(section_id, value) {
			return validateCron(value);
		};

		o = s.option(form.Value, 'produce_cron', _('订阅预处理定时'), _('格式：cron表达式,类型,名称；多个用分号连接，类型为 sub 或 col，例如：0 */2 * * *,sub,订阅名称'));
		o.placeholder = '0 */2 * * *,sub,订阅名称';
		o.validate = function(section_id, value) {
			return validateProduceCron(value);
		};

		return m.render();
	}
});
