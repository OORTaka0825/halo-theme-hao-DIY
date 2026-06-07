(function () {
    'use strict';

    var API_BASE = '/apis/api.steam.timxs.com/v1alpha1';

    function qs(selector, root) {
        return (root || document).querySelector(selector);
    }

    function toInt(value, fallback) {
        var num = parseInt(value, 10);
        return Number.isFinite(num) ? num : fallback;
    }

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function fmt(d) {
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function show(el) {
        if (el) el.hidden = false;
    }

    function hide(el) {
        if (el) el.hidden = true;
    }

    function fetchJson(url) {
        return fetch(url, {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
            return res.json();
        });
    }

    function getColorSet(theme) {
        switch (theme) {
            case 'github':
                return ['rgba(76,175,80,.14)', 'rgba(76,175,80,.32)', 'rgba(76,175,80,.56)', 'rgba(76,175,80,.78)', 'rgba(76,175,80,1)'];
            case 'fire':
                return ['rgba(255,183,77,.16)', 'rgba(255,183,77,.36)', 'rgba(255,152,0,.58)', 'rgba(255,87,34,.78)', 'rgba(244,67,54,1)'];
            case 'purple':
                return ['rgba(149,117,205,.16)', 'rgba(149,117,205,.35)', 'rgba(126,87,194,.58)', 'rgba(103,58,183,.78)', 'rgba(94,53,177,1)'];
            default:
                return ['rgba(102,192,244,.14)', 'rgba(102,192,244,.32)', 'rgba(102,192,244,.52)', 'rgba(102,192,244,.76)', 'rgba(102,192,244,1)'];
        }
    }

    function parseRecords(data) {
        var rawItems = Array.isArray(data && data.items) ? data.items : (Array.isArray(data) ? data : []);
        var minutesByDate = {};

        rawItems.forEach(function (item) {
            var spec = item && item.spec ? item.spec : item;
            if (!spec || !spec.date) return;
            var key = String(spec.date).slice(0, 10);
            var minutes = toInt(spec.playtimeMinutes || spec.minutes || spec.playtime || 0, 0);
            minutesByDate[key] = (minutesByDate[key] || 0) + minutes;
        });

        return minutesByDate;
    }

    function buildDateRange(start, end) {
        var dates = [];
        for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
        }
        return dates;
    }

    function renderGrid(root, dates, minutesByDate, theme, showLegend) {
        var colorsClass = theme ? ' data-theme="' + theme + '"' : '';
        var cells = [];
        var leading = dates.length ? dates[0].getDay() : 0;

        for (var i = 0; i < leading; i++) {
            cells.push('<span class="steam-heatmap-cell blank" aria-hidden="true"></span>');
        }

        dates.forEach(function (date) {
            var key = fmt(date);
            var minutes = minutesByDate[key] || 0;
            var level = minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 120 ? 2 : minutes < 300 ? 3 : 4;
            cells.push('<span class="steam-heatmap-cell" data-level="' + level + '" title="' + key + '：' + minutes + ' 分钟"></span>');
        });

        var legend = '';
        if (showLegend) {
            legend = '<div class="steam-heatmap-footer"><span>少</span>' +
                '<span class="steam-heatmap-cell" data-level="0"></span>' +
                '<span class="steam-heatmap-cell" data-level="1"></span>' +
                '<span class="steam-heatmap-cell" data-level="2"></span>' +
                '<span class="steam-heatmap-cell" data-level="3"></span>' +
                '<span class="steam-heatmap-cell" data-level="4"></span>' +
                '<span>多</span></div>';
        }

        root.innerHTML = '<div class="steam-heatmap-scroll"' + colorsClass + '><div class="steam-heatmap-grid">' + cells.join('') + '</div></div>' + legend;
    }

    function renderEcharts(root, dates, minutesByDate, theme, showLegend, start, end) {
        var chartBox = qs('#steam-heatmap-chart', root);
        if (!chartBox || !window.echarts) return false;

        var values = dates.map(function (date) {
            var key = fmt(date);
            return [key, minutesByDate[key] || 0];
        });
        var max = values.reduce(function (acc, item) {
            return Math.max(acc, item[1]);
        }, 1);
        var colors = getColorSet(theme);
        var fontColor = getComputedStyle(document.documentElement).getPropertyValue('--heo-secondtext') || '#8f98a0';
        var cardBg = getComputedStyle(document.documentElement).getPropertyValue('--heo-card-bg') || 'transparent';

        chartBox.hidden = false;
        var chart = window.echarts.getInstanceByDom(chartBox) || window.echarts.init(chartBox, null, { renderer: 'canvas' });
        chart.setOption({
            backgroundColor: 'transparent',
            tooltip: {
                formatter: function (params) {
                    var value = params.value || [];
                    return value[0] + '<br/>' + (value[1] || 0) + ' 分钟';
                }
            },
            visualMap: showLegend ? {
                min: 0,
                max: max,
                type: 'piecewise',
                orient: 'horizontal',
                right: 8,
                top: 0,
                itemWidth: 12,
                itemHeight: 12,
                text: ['多', '少'],
                textStyle: { color: fontColor.trim() || '#8f98a0', fontSize: 12 },
                inRange: { color: colors },
                pieces: [
                    { min: 300, label: '300+ 分钟' },
                    { min: 120, max: 299, label: '120-299 分钟' },
                    { min: 30, max: 119, label: '30-119 分钟' },
                    { min: 1, max: 29, label: '1-29 分钟' },
                    { value: 0, label: '0 分钟' }
                ]
            } : undefined,
            calendar: {
                top: 42,
                left: 42,
                right: 18,
                bottom: 18,
                range: [fmt(start), fmt(end)],
                cellSize: ['auto', 15],
                splitLine: { show: false },
                itemStyle: {
                    color: 'rgba(142, 152, 160, .12)',
                    borderWidth: 2,
                    borderColor: String(cardBg).trim() || 'transparent',
                    borderRadius: 3
                },
                yearLabel: { show: false },
                monthLabel: {
                    nameMap: 'cn',
                    color: fontColor.trim() || '#8f98a0',
                    fontSize: 12
                },
                dayLabel: {
                    firstDay: 0,
                    nameMap: ['日', '一', '二', '三', '四', '五', '六'],
                    color: fontColor.trim() || '#8f98a0',
                    fontSize: 12
                }
            },
            series: [{
                type: 'heatmap',
                coordinateSystem: 'calendar',
                data: values
            }]
        }, true);

        window.addEventListener('resize', function () {
            chart.resize();
        }, { passive: true });
        setTimeout(function () { chart.resize(); }, 80);
        return true;
    }

    function initHeatmap() {
        var root = qs('#steam-heatmap');
        if (!root || root.dataset.loaded === 'true') return;
        root.dataset.loaded = 'true';

        var chartBox = qs('#steam-heatmap-chart', root);
        var loading = qs('#steam-heatmap-loading', root);
        var empty = qs('#steam-heatmap-empty', root);
        var error = qs('#steam-heatmap-error', root);
        var days = Math.max(1, toInt(root.dataset.days, 365));
        var theme = root.dataset.theme || 'steam';
        var showLegend = root.dataset.legend !== 'false';
        var end = new Date();
        var start = new Date();
        start.setDate(end.getDate() - days + 1);

        hide(empty);
        hide(error);
        show(loading);

        fetchJson(API_BASE + '/heatmap/records?startDate=' + fmt(start) + '&endDate=' + fmt(end) + '&page=1&size=' + Math.max(days, 365))
            .then(function (data) {
                var minutesByDate = parseRecords(data);
                var dates = buildDateRange(start, end);
                var hasData = Object.keys(minutesByDate).some(function (key) {
                    return minutesByDate[key] > 0;
                });

                hide(loading);

                if (!hasData) {
                    if (chartBox) chartBox.hidden = true;
                    show(empty);
                    return;
                }

                var rendered = renderEcharts(root, dates, minutesByDate, theme, showLegend, start, end);
                if (!rendered) {
                    renderGrid(root, dates, minutesByDate, theme, showLegend);
                }
            })
            .catch(function () {
                hide(loading);
                if (chartBox) chartBox.hidden = true;
                show(error);
            });
    }


    var achievementCache = {};

    function normalizeAchievementText(data) {
        var spec = data && data.spec ? data.spec : data;
        if (!spec) return '';

        var direct = spec.achievementProgress || spec.progress || spec.progressText;
        if (direct) return String(direct);

        var achieved = toInt(spec.achievedCount || spec.achieved || spec.completed || 0, NaN);
        var total = toInt(spec.totalAchievements || spec.total || spec.count || 0, NaN);
        if (Number.isFinite(achieved) && Number.isFinite(total) && total > 0) {
            return achieved + '/' + total;
        }
        return '';
    }

    function initAchievements() {
        var nodes = Array.prototype.slice.call(document.querySelectorAll('.steam-game-achievement[data-app-id]:not([data-loaded="true"])'));
        if (!nodes.length) return;

        nodes.forEach(function (node) {
            var appId = node.dataset.appId;
            var textNode = qs('.steam-game-achievement-text', node);
            if (!appId || !textNode) return;

            node.dataset.loaded = 'true';

            function apply(text) {
                if (!text) return;
                textNode.textContent = text;
                node.title = '成就进度：' + text;
                node.hidden = false;
            }

            if (achievementCache[appId] !== undefined) {
                apply(achievementCache[appId]);
                return;
            }

            fetchJson(API_BASE + '/achievements/' + encodeURIComponent(appId))
                .then(function (data) {
                    var text = normalizeAchievementText(data);
                    achievementCache[appId] = text;
                    apply(text);
                })
                .catch(function () {
                    achievementCache[appId] = '';
                });
        });
    }

    function initSteamDiyPage() {
        initHeatmap();
        initAchievements();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSteamDiyPage, { once: true });
    } else {
        initSteamDiyPage();
    }
    document.addEventListener('pjax:complete', initSteamDiyPage);
    document.addEventListener('pjax:success', initSteamDiyPage);
})();
