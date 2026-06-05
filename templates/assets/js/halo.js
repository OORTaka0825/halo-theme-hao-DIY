let halo = {
    darkComment: () => {
        if (document.querySelector('#comment div').shadowRoot.querySelector('.halo-comment-widget').classList != null) {
            let commentDOMclass = document.querySelector('#comment div').shadowRoot.querySelector('.halo-comment-widget').classList
            if (commentDOMclass.contains('light'))
                commentDOMclass.replace('light', 'dark')
            else
                commentDOMclass.replace('dark', 'light')
        }

    },

    dataCodeTheme: () => {

        var t = document.documentElement.getAttribute('data-theme')
        var e = document.querySelector("link[data-code-theme=light]"),
            o = document.querySelector("link[data-code-theme=dark]");
        (o || e) && ("light" === t ? (o.disabled = !0, e.disabled = !1) : (e.disabled = !0, o.disabled = !1))

    },

    /**
     * 代码
     * 只适用于halo的代码渲染
     */
    addPrismTool: () => {
        if (typeof Prism === 'undefined' || typeof document === 'undefined') {
            return;
        }

        if (!Prism.plugins.toolbar) {
            console.warn('Copy to Clipboard plugin loaded before Toolbar plugin.');

            return;
        }

        const enable = GLOBAL_CONFIG.prism.enable;
        if (!enable) return;
        const isEnableTitle = GLOBAL_CONFIG.prism.enable_title;
        const isEnableHr = GLOBAL_CONFIG.prism.enable_hr;
        const isEnableLine = GLOBAL_CONFIG.prism.enable_line;
        const isEnableCopy = GLOBAL_CONFIG.prism.enable_copy;
        const isEnableExpander = GLOBAL_CONFIG.prism.enable_expander;
        const prismLimit = GLOBAL_CONFIG.prism.prism_limit;
        const isEnableHeightLimit = GLOBAL_CONFIG.prism.enable_height_limit;

        // https://stackoverflow.com/a/30810322/7595472

        /** @param {CopyInfo} copyInfo */
        function fallbackCopyTextToClipboard(copyInfo) {
            var textArea = document.createElement('textarea');
            textArea.value = copyInfo.getText();

            // Avoid scrolling to bottom
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.position = 'fixed';

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                var successful = document.execCommand('copy');
                setTimeout(function () {
                    if (successful) {
                        copyInfo.success();
                    } else {
                        copyInfo.error();
                    }
                }, 1);
            } catch (err) {
                setTimeout(function () {
                    copyInfo.error(err);
                }, 1);
            }

            document.body.removeChild(textArea);
        }

        /** @param {CopyInfo} copyInfo */
        function copyTextToClipboard(copyInfo) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(copyInfo.getText()).then(copyInfo.success, function () {
                    // try the fallback in case `writeText` didn't work
                    fallbackCopyTextToClipboard(copyInfo);
                });
            } else {
                fallbackCopyTextToClipboard(copyInfo);
            }
        }

        /**
         * Selects the text content of the given element.
         *
         * @param {Element} element
         */
        function selectElementText(element) {
            // https://stackoverflow.com/a/20079910/7595472
            window.getSelection().selectAllChildren(element);
        }

        /**
         * Traverses up the DOM tree to find data attributes that override the default plugin settings.
         *
         * @param {Element} startElement An element to start from.
         * @returns {Settings} The plugin settings.
         * @typedef {Record<"copy" | "copy-error" | "copy-success" | "copy-timeout", string | number>} Settings
         */
        function getSettings(startElement) {
            /** @type {Settings} */
            var settings = {
                'copy': 'Copy',
                'copy-error': 'Press Ctrl+C to copy',
                'copy-success': 'Copied!',
                'copy-timeout': 5000
            };

            var prefix = 'data-prismjs-';
            for (var key in settings) {
                var attr = prefix + key;
                var element = startElement;
                while (element && !element.hasAttribute(attr)) {
                    element = element.parentElement;
                }
                if (element) {
                    settings[key] = element.getAttribute(attr);
                }
            }
            return settings;
        }

        var r = Prism.plugins.toolbar.hook = function (a) {

            var r = a.element.parentNode;
            var toolbar = r.nextElementSibling;

            //标题
            isEnableTitle && toolbar.classList.add("c-title")
            //标题分割线
            isEnableHr && toolbar.classList.add("c-hr")
            var customItem = toolbar.querySelector('.custom-item');
            var __reuse = !!customItem;
            if (!customItem) {
                customItem = document.createElement("div");
                customItem.className = 'custom-item absolute top-0'
            }

            //复制
            if (isEnableCopy) {
                var copy = customItem.querySelector('.copy-button') || document.createElement("i");

                copy.className = 'haofont hao-icon-paste copy-button code-copy cursor-pointer'
                if (!copy.parentNode) { customItem.appendChild(copy)

                copy.addEventListener('click', function () {
                    copyTextToClipboard({
                        getText: function () {
                            return a.element.textContent;
                        },
                        success: function () {
                            btf.snackbarShow('复制成功')
                            setState('copy-success');
                            resetText();
                        },
                        error: function () {
                            setState('copy-error');

                            setTimeout(function () {
                                selectElementText(a.element);
                            }, 1);

                            resetText();
                        }
                    });

                }); }

            }

const prismToolsFn = function (e) {
    const $t = e.target.classList;
    if ($t.contains('code-expander')) prismShrinkFn(this);
};

// 折叠图标（右上角）：默认“向左”
            if (isEnableExpander) {
                // 先清理右上角已有的箭头，确保只留一个
                try {
                    customItem.querySelectorAll('.code-expander, i.hao-icon-angle-left, i.hao-icon-angle-down').forEach(function(n){ n.remove(); });
                } catch(e) {}
                // 创建唯一的箭头（默认向左）
                var expander = document.createElement('i');
                try {
                    var _wrap = r ? r.querySelector('.code-expand-btn') : null;
                    var _isExpanded = !!(_wrap && _wrap.classList && _wrap.classList.contains('expand-done'));
                    expander.className = 'fa-sharp fa-solid haofont code-expander cursor-pointer ' + (_isExpanded ? 'hao-icon-angle-down' : 'hao-icon-angle-left');
                } catch(e) {
                    expander.className = 'fa-sharp fa-solid haofont hao-icon-angle-left code-expander cursor-pointer';
                }
                customItem.appendChild(expander)
                expander.addEventListener('click', prismToolsFn)
            }
            // 底部“展开”按钮：点击后进入全量，并把右上角图标切为“向下”
            const _saveExpandScrollY = (el)=>{try{el.dataset._expandScrollY = String(window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0);}catch(e){}};
const _restoreExpandScrollY = (el)=>{try{var y=parseInt(el.dataset._expandScrollY||'');if(!isNaN(y)){setTimeout(function(){window.scrollTo({top:y,behavior:'auto'});},0);}}catch(e){}};


const expandCode = function () {
                // 切换“限制高度 ↔ 全量展开”
                const isExpanded = r.classList.contains('expand-done');
                if (isExpanded) {
                    // 已展开 -> 收起到限制高度
                    r.classList.remove('expand-done');
                    this.classList.remove('expand-done'); // 底部箭头恢复“向下”
                    this.style.display = 'flex'; // 始终显示在底部
                    try { r.style.paddingBottom = (this.offsetHeight + 5) + 'px'; } catch (e) {}
                    _restoreExpandScrollY(r);
                    try {
                        if (expander) {
                            expander.classList.remove('hao-icon-angle-down');
                            expander.classList.add('hao-icon-angle-left'); // 右上角恢复“向左”
}
                    } catch (e) {}
                } else {
                    // 限制高度 -> 全量展开
                    _saveExpandScrollY(r);
                    r.classList.add('expand-done');
                    this.classList.add('expand-done'); // 底部箭头翻转“向上”
                    this.style.display = 'flex';        // 不要隐藏
                    try { r.style.paddingBottom = (this.offsetHeight + 5) + 'px'; } catch (e) {}
                    try {
                        if (expander) {
                            expander.classList.remove('hao-icon-angle-left');
                            expander.classList.add('hao-icon-angle-down'); // 右上角切为“向下”
}
                    } catch (e) {}
                }
            };

            if (isEnableHeightLimit && r.offsetHeight > prismLimit) {
                r.classList.add("close")
                const ele = document.createElement("div");
                ele.className = "code-expand-btn";
                ele.innerHTML = '<i class="haofont hao-icon-angle-double-down"></i>';
                ele.addEventListener("click", expandCode);
                r.offsetParent.appendChild(ele);
                try { r.style.paddingBottom = (ele.offsetHeight + 5) + "px"; } catch (e) {}
            }

            // 右上角箭头：仅在「限制高度 ↔ 全量」之间切换；不再进入“仅标题”折叠
            const prismShrinkFn = () => {
                const $btnWrap = r.offsetParent.lastElementChild;
                const hasBottomBtn = $btnWrap && $btnWrap.classList && $btnWrap.classList.contains('code-expand-btn');

                // A：当前是“全量展开”→ 点击右上角 = 回到“限制高度”
                if (r.classList.contains('expand-done')) {
                    r.classList.remove('expand-done');
                    if (hasBottomBtn) {
                        $btnWrap.style.display = 'flex';
                        $btnWrap.classList.remove('expand-done'); // 底部箭头恢复“向下”
                        try { r.style.paddingBottom = ($btnWrap.offsetHeight + 5) + 'px'; } catch (e) {}
                    }
                    
                    try {
                        if (expander) {
                            expander.classList.remove('hao-icon-angle-down');
                            expander.classList.add('hao-icon-angle-left'); // 右上角恢复“向左”
}
                    } catch (e) {}
                    _restoreExpandScrollY(r);
                    return;
                }

                // B：当前是“限制高度”→ 点击右上角 = 全量展开
                r.classList.add('expand-done');
                if (hasBottomBtn) {
                    $btnWrap.classList.add('expand-done'); // 与底部逻辑保持一致（随后隐藏）
                    $btnWrap.style.display = 'flex';
                    try { r.style.paddingBottom = ($btnWrap.offsetHeight + 5) + 'px'; } catch (e) {}
                }
                try {
                    if (expander) {
                        expander.classList.remove('hao-icon-angle-left');
                        expander.classList.add('hao-icon-angle-down'); // 右上角切为“向下”
}
                } catch (e) {}
            };

            if (!__reuse) toolbar.appendChild(customItem)
            
            

            var settings = getSettings(a.element);

            function resetText() {
                setTimeout(function () {
                    setState('copy');
                }, settings['copy-timeout']);
            }

            /** @param {"copy" | "copy-error" | "copy-success"} state */
            function setState(state) {
                copy.setAttribute('data-copy-state', state);
            }

        };
        Prism.hooks.add("complete", r)
    },

    addScript: (e, t, n) => {
        if (document.getElementById(e))
            return n ? n() : void 0;
        let a = document.createElement("script");
        a.src = t,
            a.id = e,
        n && (a.onload = n),
            document.head.appendChild(a)
    },

    danmu: () => {
        const e = new EasyDanmakuMin({
            el: "#danmu",
            line: 10,
            speed: 20,
            hover: !0,
            loop: !0
        });
        let t = saveToLocal.get("danmu");
        if (t)
            e.batchSend(t, !0);
        else {
            let n = [];
            if (GLOBAL_CONFIG.source.comments.use == 'Twikoo') {
                fetch(GLOBAL_CONFIG.source.twikoo.twikooUrl, {
                    method: "POST",
                    body: JSON.stringify({
                        event: "GET_RECENT_COMMENTS",
                        accessToken: GLOBAL_CONFIG.source.twikoo.accessToken,
                        includeReply: !1,
                        pageSize: 5
                    }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).then((e => e.json())).then((({data: t}) => {
                        t.forEach((e => {
                                null == e.avatar && (e.avatar = "https://cravatar.cn/avatar/d615d5793929e8c7d70eab5f00f7f5f1?d=mp"),
                                    n.push({
                                        avatar: e.avatar,
                                        content: e.nick + "：" + btf.changeContent(e.comment),
                                        href: e.url + '#' + e.id

                                    })
                            }
                        )),
                            e.batchSend(n, !0),
                            saveToLocal.set("danmu", n, .02)
                    }
                ))
            }
            if (GLOBAL_CONFIG.source.comments.use == 'Artalk') {
                const statheaderList = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Origin': window.location.origin
                    },
                    body: new URLSearchParams({
                        'site_name': GLOBAL_CONFIG.source.artalk.siteName,
                        'limit': '100',
                        'type': 'latest_comments'
                    })
                }
                fetch(GLOBAL_CONFIG.source.artalk.artalkUrl + 'api/stat', statheaderList)
                    .then((e => e.json())).then((({data: t}) => {
                        t.forEach((e => {
                                n.push({
                                    avatar: 'https://cravatar.cn/avatar/' + e.email_encrypted + '?d=mp&s=240',
                                    content: e.nick + "：" + btf.changeContent(e.content_marked),
                                    href: e.page_url + '#atk-comment-' + e.id

                                })
                            }
                        )),
                            e.batchSend(n, !0),
                            saveToLocal.set("danmu", n, .02)
                    }
                ))
            }
            if (GLOBAL_CONFIG.source.comments.use == 'Waline') {
                const loadWaline = () => {
                    Waline.RecentComments({
                        serverURL: GLOBAL_CONFIG.source.waline.serverURL,
                        count: 50
                    }).then(({comments}) => {
                        const walineArray = comments.map(e => {
                            return {
                                'content': e.nick + "：" + btf.changeContent(e.comment),
                                'avatar': e.avatar,
                                'href': e.url + '#' + e.objectId,
                            }
                        })
                        e.batchSend(walineArray, !0),
                            saveToLocal.set("danmu", walineArray, .02)
                    })
                }
                if (typeof Waline === 'object') loadWaline()
                else getScript(GLOBAL_CONFIG.source.waline.js).then(loadWaline)
            }

        }
        document.getElementById("danmuBtn").innerHTML = "<button class=\"hideBtn\" onclick=\"document.getElementById('danmu').classList.remove('hidedanmu')\">显示弹幕</button> <button class=\"hideBtn\" onclick=\"document.getElementById('danmu').classList.add('hidedanmu')\">隐藏弹幕</button>"
    },

    changeMarginLeft(element) {
        var randomMargin = Math.floor(Math.random() * 901) + 100; // 生成100-1000之间的随机数
        element.style.marginLeft = randomMargin + 'px';
    },

    getTopSponsors() {
        var user_id = GLOBAL_CONFIG.source.power.userId
        var show_num = GLOBAL_CONFIG.source.power.showNum

        function getPower() {
            const url = GLOBAL_CONFIG.source.power.url + user_id
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (200 === data["ec"]) {
                        var values = data["data"]["list"]
                        saveToLocal.set('power-data', JSON.stringify(values), 10 / (60 * 24))
                        renderer(values);
                    }

                })
        }

        function renderer(values) {
            var data = getArrayItems(values, 1);
            let powerStar = document.getElementById("power-star")
            if (values.length === 0) {
                powerStar.href = GLOBAL_CONFIG.source.power.powerLink
                powerStar.innerHTML = ` 
                        <div id="power-star-image" style="background-image: url('/themes/theme-hao/assets/images/afadian/afadian.webp')">
                        </div>
                        <div class="power-star-body">
                            <div id="power-star-title">还没有人赞助～</div>
                            <div id="power-star-desc">为爱发电，点击赞助</div>
                        </div>`;
            } else {
                if (powerStar) {
                    powerStar.href = "https://afdian.net/u/" + data[0].user_id
                    powerStar.innerHTML = ` 
                        <div id="power-star-image" style="background-image: url(${data[0].avatar})">
                        </div>
                        <div class="power-star-body">
                            <div id="power-star-title">${data[0].name}</div>
                            <div id="power-star-desc">更多支持，为爱发电</div>
                        </div>`;
                }

                if (values.length > 1) {
                    var i = 0;
                    var htmlText = '';
                    for (let value of values) {
                        if (i > parseInt(show_num)) {
                            break;
                        }
                        htmlText += ` <a href="${"https://afdian.net/u/" + value["user_id"]}" rel="external nofollow" target="_blank" th:title="${value["name"]}">${value["name"]}</a>`;
                        i = i + 1;
                    }
                    if (document.getElementById("power-item-link")) {
                        document.getElementById("power-item-link").innerHTML = htmlText;
                    }
                }
            }
        }

        function init() {
            const data = saveToLocal.get('power-data')
            if (data) {
                renderer(JSON.parse(data))
            } else {
                getPower()
            }
        }

        document.getElementById("power-star") && init()
    },

    checkAd() {
        var default_enable = GLOBAL_CONFIG.source.footer.default_enable
        if (default_enable) {
            var adElement = document.getElementById("footer-banner");
            var notMusic = document.body.getAttribute("data-type") != "music"; // 检测是否为音乐页面
            if ((adElement.offsetWidth <= 0 || adElement.offsetHeight <= 0) && notMusic) {
                // 元素不可见，可能被拦截
                console.log("Element may be blocked by AdBlocker Ultimate");
                alert("页脚信息可能被AdBlocker Ultimate拦截，请检查广告拦截插件！")
            }
        }
    }
};

/* === 复制本文链接（挂到文章底部分享区的“链条图标”，支持 PJAX）=== */
(function () {
  function mountCopyOnShareLink() {
    if (typeof ClipboardJS === 'undefined') return;

    // 清理旧实例，避免 PJAX 叠加
    if (window.__shareLinkCopy__) {
      window.__shareLinkCopy__.destroy();
      window.__shareLinkCopy__ = null;
    }

    window.__shareLinkCopy__ = new ClipboardJS('.share-link .haofont.hao-icon-link', {
      text: () => location.href.split('#')[0]
    });

    const ok = () => (window.btf && btf.snackbarShow) ? btf.snackbarShow('链接已复制') : console.log('copied');
    window.__shareLinkCopy__.on('success', ok);
    window.__shareLinkCopy__.on('error', () => {
      try {
        const t = document.createElement('textarea');
        t.value = location.href.split('#')[0];
        t.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.appendChild(t); t.select();
        document.execCommand('copy'); document.body.removeChild(t);
        ok();
      } catch (_) {}
    });
  }

  // 首屏 & PJAX 完成后都挂载
  window.addEventListener('load', mountCopyOnShareLink);
  document.addEventListener('pjax:complete', mountCopyOnShareLink);
  document.addEventListener('page:loaded', mountCopyOnShareLink);
})();

window.addEventListener('resize', function(){
  try{
    document.querySelectorAll('.code-expand-btn').forEach(function(btn){
      var pre = btn && btn.parentElement ? btn.parentElement.querySelector('pre') : null;
      if (!pre) return;
      pre.style.paddingBottom = (btn.offsetHeight + 5) + 'px';
    });
  }catch(e){}
});




if (!window.__hao_code_expand_sync__) {
  window.__hao_code_expand_sync__ = true;
  document.addEventListener('click', function(ev){
    try {
      var t = ev.target;
      if (!t || !t.closest) return;
      var wrap = t.closest('.code-expand-btn');
      if (!wrap) return;
      // After the UI toggled classes, sync the arrow
      setTimeout(function(){
        try {
          var root = wrap.closest('.code-toolbar');
          if (!root) return;
          var exp = root.querySelector('.custom-item .code-expander');
          if (!exp) return;
          var expanded = wrap.classList.contains('expand-done');
          if (expanded){ exp.classList.remove('hao-icon-angle-left'); exp.classList.add('hao-icon-angle-down'); }
          else { exp.classList.remove('hao-icon-angle-down'); exp.classList.add('hao-icon-angle-left'); }
        } catch(e) {}
      }, 0);
    } catch(e) {}
  }, true);
}

