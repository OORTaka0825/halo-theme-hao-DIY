(function () {
    'use strict';

    var API_BASE = '/apis/api.steam.timxs.com/v1alpha1';
    var DEFAULT_PAGE_SIZE = 12;
    var RECENT_LIMIT = 5;
    var HEATMAP_DAYS = 365;

    function qs(selector, root) {
        return (root || document).querySelector(selector);
    }

    function qsa(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    }

    function text(selector, value) {
        var el = qs(selector);
        if (el) el.textContent = value == null || value === '' ? '--' : String(value);
    }

    function attr(selector, name, value) {
        var el = qs(selector);
        if (el && value) el.setAttribute(name, value);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toInt(value, fallback) {
        var num = parseInt(value, 10);
        return Number.isFinite(num) ? num : fallback;
    }

    function getPage() {
        try {
            var params = new URLSearchParams(window.location.search);
            return Math.max(1, toInt(params.get('page'), 1));
        } catch (e) {
            return 1;
        }
    }

    function setPageUrl(page) {
        var url = new URL(window.location.href);
        url.searchParams.set('page', page);
        return url.pathname + url.search + url.hash;
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

    function showAlert() {
        var alert = qs('#steam-alert');
        if (alert) alert.hidden = false;
    }

    function gameStoreUrl(appId) {
        return appId ? 'https://store.steampowered.com/app/' + encodeURIComponent(appId) : 'javascript:void(0)';
    }

    function gameCard(game, recent) {
        game = game || {};
        var appId = game.appId || game.appid || '';
        var name = game.name || 'Unknown Game';
        var image = game.headerImageUrl || game.headerImage || '';
        var playtime = recent
            ? (game.playtime2WeeksFormatted || game.playtimeFormatted || '0 小时')
            : (game.playtimeForeverFormatted || game.playtimeFormatted || '0 小时');
        var badge = recent && game.inLibrary === false ? '<span class="steam-game-badge">库外</span>' : '';
        var imageHtml = image
            ? '<img loading="lazy" src="' + escapeHtml(image) + '" alt="' + escapeHtml(name) + '">'
            : '<div class="steam-game-cover-placeholder">Steam</div>';

        return '' +
            '<a class="steam-game-card" href="' + escapeHtml(gameStoreUrl(appId)) + '" target="_blank" rel="noopener external nofollow noreferrer">' +
            '  <div class="steam-game-cover">' + imageHtml + badge + '</div>' +
            '  <div class="steam-game-content">' +
            '    <h3 class="steam-game-name">' + escapeHtml(name) + '</h3>' +
            '    <span class="steam-game-time">' + escapeHtml(playtime) + '</span>' +
            '  </div>' +
            '</a>';
    }

    function renderProfile(profile, badges) {
        if (!profile || !profile.summary) return;
        var summary = profile.summary;
        text('#steam-persona-name', summary.personaName || 'Steam User');
        text('#steam-status-text', profile.statusText || '离线');
        text('#steam-level', 'Lv. ' + (profile.steamLevel || 0));
        if (badges) {
            text('#steam-badges', (badges.totalBadges || 0) + ' 徽章');
            text('#steam-xp', (badges.playerXp || 0) + ' XP');
        }
        attr('#steam-avatar', 'src', summary.avatarFull || summary.avatarMedium || summary.avatar);
        attr('#steam-profile-link', 'href', summary.profileUrl);
        var dot = qs('#steam-status-dot');
        if (dot && (profile.playing || summary.personaState > 0)) dot.classList.add('is-online');
    }

    function renderStats(stats) {
        if (!stats) return;
        text('#steam-total-games', stats.totalGames || 0);
        text('#steam-total-playtime', stats.totalPlaytimeFormatted || '0 小时');
        text('#steam-recent-playtime', stats.recentPlaytimeFormatted || '0 小时');
    }

    function renderRecent(games) {
        var box = qs('#steam-recent-games');
        if (!box) return;
        if (!Array.isArray(games) || games.length === 0) {
            box.innerHTML = '<div class="steam-empty">最近两周没有游玩记录，或者 Steam 数据暂时无法获取。</div>';
            return;
        }
        box.innerHTML = games.map(function (game) { return gameCard(game, true); }).join('');
    }

    function renderOwned(data, page, size) {
        var box = qs('#steam-owned-games');
        var desc = qs('#steam-games-desc');
        var pager = qs('#steam-pagination');
        if (!box) return;

        data = data || {};
        var items = Array.isArray(data.items) ? data.items : [];
        var total = toInt(data.total, items.length);
        var currentPage = toInt(data.page, page || 1);
        var pageSize = toInt(data.size, size || DEFAULT_PAGE_SIZE);
        var totalPages = toInt(data.totalPages, Math.max(1, Math.ceil(total / pageSize)));

        if (desc) desc.textContent = '显示游玩时长最长的 ' + items.length + ' / ' + total + ' 款游戏';

        if (items.length === 0) {
            box.innerHTML = '<div class="steam-empty">暂无游戏库数据。请确认 Steam 个人资料和游戏详情已设为公开。</div>';
        } else {
            box.innerHTML = items.map(function (game) { return gameCard(game, false); }).join('');
        }

        if (!pager) return;
        if (totalPages <= 1) {
            pager.hidden = true;
            pager.innerHTML = '';
            return;
        }
        pager.hidden = false;
        var prevDisabled = currentPage <= 1;
        var nextDisabled = currentPage >= totalPages;
        pager.innerHTML = '' +
            '<a class="steam-page-btn' + (prevDisabled ? ' disabled' : '') + '" href="' + (prevDisabled ? 'javascript:void(0)' : escapeHtml(setPageUrl(currentPage - 1))) + '">上一页</a>' +
            '<span class="steam-page-num current">' + currentPage + '</span>' +
            '<span class="steam-page-num">' + totalPages + '</span>' +
            '<a class="steam-page-btn' + (nextDisabled ? ' disabled' : '') + '" href="' + (nextDisabled ? 'javascript:void(0)' : escapeHtml(setPageUrl(currentPage + 1))) + '">下一页</a>';
    }

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function fmt(d) {
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function renderHeatmap(data, start, end) {
        var root = qs('#steam-heatmap');
        if (!root) return;
        var rawItems = Array.isArray(data && data.items) ? data.items : (Array.isArray(data) ? data : []);
        var minutesByDate = {};
        rawItems.forEach(function (item) {
            var spec = item && item.spec ? item.spec : item;
            if (!spec || !spec.date) return;
            var key = String(spec.date).slice(0, 10);
            var minutes = toInt(spec.playtimeMinutes || spec.minutes || spec.playtime || 0, 0);
            minutesByDate[key] = (minutesByDate[key] || 0) + minutes;
        });

        var dates = [];
        for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) dates.push(new Date(d));

        var cells = [];
        var leading = dates.length ? dates[0].getDay() : 0;
        for (var i = 0; i < leading; i++) cells.push('<span class="steam-heatmap-cell blank" aria-hidden="true"></span>');

        var hasData = false;
        dates.forEach(function (date) {
            var key = fmt(date);
            var minutes = minutesByDate[key] || 0;
            if (minutes > 0) hasData = true;
            var level = minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 120 ? 2 : minutes < 300 ? 3 : 4;
            cells.push('<span class="steam-heatmap-cell" data-level="' + level + '" title="' + key + '：' + minutes + ' 分钟"></span>');
        });

        var legend = '<div class="steam-heatmap-footer"><span>少</span>' +
            '<span class="steam-heatmap-cell" data-level="0"></span>' +
            '<span class="steam-heatmap-cell" data-level="1"></span>' +
            '<span class="steam-heatmap-cell" data-level="2"></span>' +
            '<span class="steam-heatmap-cell" data-level="3"></span>' +
            '<span class="steam-heatmap-cell" data-level="4"></span>' +
            '<span>多</span></div>';

        root.innerHTML = '<div class="steam-heatmap-scroll"><div class="steam-heatmap-grid">' + cells.join('') + '</div></div>' + legend;
        if (!hasData) root.insertAdjacentHTML('afterbegin', '<div class="steam-heatmap-empty">暂无热力图数据。开启追踪后，插件需要至少记录一次才会显示。</div>');
    }

    function loadHeatmap() {
        var end = new Date();
        var start = new Date();
        start.setDate(end.getDate() - HEATMAP_DAYS + 1);
        return fetchJson(API_BASE + '/heatmap/records?startDate=' + fmt(start) + '&endDate=' + fmt(end) + '&page=1&size=1000')
            .then(function (data) { renderHeatmap(data, start, end); })
            .catch(function () {
                var root = qs('#steam-heatmap');
                if (root) root.innerHTML = '<div class="steam-heatmap-error">热力图加载失败，请稍后刷新重试。</div>';
            });
    }

    function initSteamPage() {
        var root = qs('[data-steam-page]');
        if (!root || root.dataset.loaded === 'true') return;
        root.dataset.loaded = 'true';

        var page = getPage();
        var size = DEFAULT_PAGE_SIZE;

        Promise.allSettled([
            fetchJson(API_BASE + '/profile'),
            fetchJson(API_BASE + '/stats'),
            fetchJson(API_BASE + '/badges'),
            fetchJson(API_BASE + '/recent?limit=' + RECENT_LIMIT),
            fetchJson(API_BASE + '/games?page=' + page + '&size=' + size + '&sortBy=playtime_forever'),
            loadHeatmap()
        ]).then(function (results) {
            var profile = results[0].status === 'fulfilled' ? results[0].value : null;
            var stats = results[1].status === 'fulfilled' ? results[1].value : null;
            var badges = results[2].status === 'fulfilled' ? results[2].value : null;
            var recent = results[3].status === 'fulfilled' ? results[3].value : null;
            var owned = results[4].status === 'fulfilled' ? results[4].value : null;

            if (!profile || !stats || !owned) showAlert();
            renderProfile(profile, badges);
            renderStats(stats);
            renderRecent(recent);
            renderOwned(owned, page, size);

            if (window.lazyLoadInstance && typeof window.lazyLoadInstance.update === 'function') {
                window.lazyLoadInstance.update();
            }
        }).catch(showAlert);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSteamPage, { once: true });
    } else {
        initSteamPage();
    }
    document.addEventListener('pjax:complete', initSteamPage);
    document.addEventListener('pjax:success', initSteamPage);
})();
