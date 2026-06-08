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

    function ensureEcharts(root) {
        if (window.echarts) return Promise.resolve(window.echarts);
        if (window.__steamEchartsLoading) return window.__steamEchartsLoading;

        var src = (root && root.dataset && root.dataset.echartsUrl) || 'https://cdn.bootcdn.net/ajax/libs/echarts/5.4.3/echarts.min.js';
        window.__steamEchartsLoading = new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[data-steam-echarts="true"]');
            if (existing) {
                existing.addEventListener('load', function () { window.echarts ? resolve(window.echarts) : reject(new Error('echarts unavailable')); }, { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            var script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;
            script.dataset.steamEcharts = 'true';
            script.onload = function () { window.echarts ? resolve(window.echarts) : reject(new Error('echarts unavailable')); };
            script.onerror = reject;
            document.head.appendChild(script);
        });
        return window.__steamEchartsLoading;
    }

    function renderEcharts(root, dates, minutesByDate, theme, showLegend, start, end) {
        var chartBox = qs('#steam-heatmap-chart', root);
        if (!chartBox || !window.echarts) return false;

        Array.prototype.slice.call(root.querySelectorAll('.steam-heatmap-rendered,.steam-heatmap-echart-legend')).forEach(function (node) {
            node.parentNode.removeChild(node);
        });

        var values = dates.map(function (date) {
            var key = fmt(date);
            return [key, minutesByDate[key] || 0];
        });
        var max = values.reduce(function (acc, item) {
            return Math.max(acc, item[1]);
        }, 1);
        var colors = getColorSet(theme);
        // 只根据主题的 data-theme 判断明暗色，不再读取 body/html 上可能残留的 dark class。
        // Hao 主题切换明暗模式时会更新 documentElement 的 data-theme；之前误读 class 会导致白天模式仍使用白色标签。
        var themeMode = document.documentElement.getAttribute('data-theme');
        var dark = themeMode === 'dark' ? true : (themeMode === 'light' ? false : window.matchMedia('(prefers-color-scheme: dark)').matches);
        var fontColor = dark ? 'rgba(245,247,250,.96)' : '#303742';
        var secondColor = dark ? 'rgba(245,247,250,.88)' : '#4f5967';
        var borderColor = dark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.92)';
        var zeroColor = dark ? 'rgba(40, 48, 64, .82)' : 'rgba(239, 242, 246, .92)';
        var cellHeight = window.innerWidth <= 768 ? 13 : 15;

        chartBox.hidden = false;
        var chart = window.echarts.getInstanceByDom(chartBox) || window.echarts.init(chartBox, null, { renderer: 'canvas' });
        chart.setOption({
            backgroundColor: 'transparent',
            tooltip: {
                appendToBody: true,
                confine: true,
                formatter: function (params) {
                    var value = params.value || [];
                    return value[0] + '<br/>' + (value[1] || 0) + ' 分钟';
                }
            },
            visualMap: {
                show: false,
                min: 0,
                max: max,
                inRange: { color: colors },
                outOfRange: { color: colors[0] || zeroColor }
            },
            calendar: {
                top: 34,
                left: 44,
                right: 20,
                bottom: showLegend ? 38 : 8,
                range: [fmt(start), fmt(end)],
                cellSize: ['auto', cellHeight],
                splitLine: { show: false },
                itemStyle: {
                    color: zeroColor,
                    borderWidth: 2,
                    borderColor: borderColor,
                    borderRadius: 3
                },
                yearLabel: { show: false },
                monthLabel: {
                    nameMap: 'cn',
                    color: fontColor,
                    fontSize: 13,
                    fontWeight: 500,
                    margin: 9
                },
                dayLabel: {
                    firstDay: 1,
                    nameMap: ['日', '一', '二', '三', '四', '五', '六'],
                    color: secondColor,
                    fontSize: 13,
                    fontWeight: 500,
                    margin: 8
                }
            },
            series: [{
                type: 'heatmap',
                coordinateSystem: 'calendar',
                data: values
            }]
        }, true);

        if (showLegend) {
            var legendHtml = '<div class="steam-heatmap-echart-legend" data-theme="' + theme + '"><span>少</span>' +
                '<i style="background:' + colors[0] + '"></i>' +
                '<i style="background:' + colors[1] + '"></i>' +
                '<i style="background:' + colors[2] + '"></i>' +
                '<i style="background:' + colors[3] + '"></i>' +
                '<i style="background:' + colors[4] + '"></i>' +
                '<span>多</span></div>';
            root.insertAdjacentHTML('beforeend', legendHtml);
        }

        if (!root.dataset.resizeBound) {
            root.dataset.resizeBound = 'true';
            window.addEventListener('resize', function () {
                var inst = window.echarts && chartBox ? window.echarts.getInstanceByDom(chartBox) : null;
                if (inst) inst.resize();
            }, { passive: true });
        }
        setTimeout(function () { chart.resize(); }, 80);
        return true;
    }

    function initHeatmap() {
        var root = qs('#steam-heatmap');
        if (!root || root.dataset.loaded === 'true') return;
        root.dataset.loaded = 'true';

        var chartBox = qs('#steam-heatmap-chart', root);
        var loading = qs('#steam-heatmap-loading', root);
        var defer = qs('#steam-heatmap-defer', root);
        var empty = qs('#steam-heatmap-empty', root);
        var error = qs('#steam-heatmap-error', root);
        var days = Math.max(1, toInt(root.dataset.days, 365));
        var theme = root.dataset.theme || 'steam';
        var showLegend = root.dataset.legend !== 'false';
        var end = new Date();
        var start = new Date();
        start.setDate(end.getDate() - days + 1);
        var dates = buildDateRange(start, end);

        hide(defer);
        hide(empty);
        hide(error);
        show(loading);
        if (chartBox) chartBox.hidden = true;

        function draw(minutesByDate) {
            minutesByDate = minutesByDate || {};
            hide(empty);
            hide(error);
            Array.prototype.slice.call(root.querySelectorAll('.steam-heatmap-rendered,.steam-heatmap-echart-legend')).forEach(function (node) {
                node.parentNode.removeChild(node);
            });

            ensureEcharts(root)
                .then(function () {
                    hide(loading);
                    if (!renderEcharts(root, dates, minutesByDate, theme, showLegend, start, end)) {
                        show(error);
                    }
                })
                .catch(function () {
                    hide(loading);
                    show(error);
                });
        }

        fetchJson(API_BASE + '/heatmap/records?startDate=' + fmt(start) + '&endDate=' + fmt(end) + '&page=1&size=' + Math.max(days, 365))
            .then(function (data) {
                draw(parseRecords(data));
            })
            .catch(function () {
                // 接口失败时仍渲染一个空 ECharts 日历骨架，避免页面卡在加载状态。
                draw({});
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


    function localizePlaytimeText(text) {
        if (!text) return text;
        return String(text)
            .replace(/(\d+(?:[.,]\d+)?)\s*h\b/gi, '$1小时')
            .replace(/(\d+(?:[.,]\d+)?)\s*m\b/gi, '$1分钟');
    }

    function initPlaytimeLocalization() {
        var nodes = Array.prototype.slice.call(document.querySelectorAll('.steam-game-time, .steam-stat-value'));
        nodes.forEach(function (node) {
            var original = node.textContent || '';
            var localized = localizePlaytimeText(original);
            if (localized !== original) {
                node.textContent = localized;
            }
            var title = node.getAttribute('title');
            if (title) {
                node.setAttribute('title', localizePlaytimeText(title));
            }
        });
    }

    function scheduleHeatmapInit() {
        var root = qs('#steam-heatmap');
        if (!root || root.dataset.loaded === 'true' || root.dataset.scheduled === 'true') return;
        root.dataset.scheduled = 'true';

        // 先立即显示加载层，避免“空白停顿”；真正的数据请求仍然等页面 load/idle 之后再开始。
        var chartBox = qs('#steam-heatmap-chart', root);
        var loading = qs('#steam-heatmap-loading', root);
        var defer = qs('#steam-heatmap-defer', root);
        var empty = qs('#steam-heatmap-empty', root);
        var error = qs('#steam-heatmap-error', root);
        hide(defer);
        hide(empty);
        hide(error);
        show(loading);
        if (chartBox) chartBox.hidden = true;

        var delay = Math.max(0, toInt(root.dataset.loadDelay, 0));

        function startWhenIdle() {
            if (!root.isConnected) return;
            var run = function () {
                if (!root.isConnected) return;
                initHeatmap();
            };

            // Give the browser one more paint opportunity after the whole page finishes loading.
            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    if ('requestIdleCallback' in window) {
                        window.requestIdleCallback(run, { timeout: 3000 });
                    } else {
                        setTimeout(run, 0);
                    }
                });
            });
        }

        function afterPageLoaded() {
            setTimeout(startWhenIdle, delay);
        }

        if (document.readyState === 'complete') {
            afterPageLoaded();
        } else {
            window.addEventListener('load', afterPageLoaded, { once: true });
        }
    }

    function initSteamDiyPage() {
        initPlaytimeLocalization();
        initAchievements();
        scheduleHeatmapInit();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSteamDiyPage, { once: true });
    } else {
        initSteamDiyPage();
    }
    document.addEventListener('pjax:complete', initSteamDiyPage);
    document.addEventListener('pjax:success', initSteamDiyPage);

    if (!window.__steamHeatmapThemeObserver) {
        window.__steamHeatmapThemeObserver = true;
        new MutationObserver(function () {
            var root = qs('#steam-heatmap');
            if (!root || !window.echarts) return;
            root.dataset.loaded = 'false';
            root.dataset.scheduled = 'false';
            initHeatmap();
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
})();
