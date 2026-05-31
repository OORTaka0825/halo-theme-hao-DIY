(() => {
    /* === QQ 昵称+邮箱补丁，可在主题后台切换 === */
const __QQ_NICK_MODE__ =
    GLOBAL_CONFIG &&
    GLOBAL_CONFIG.source &&
    GLOBAL_CONFIG.source.twikoo &&
    GLOBAL_CONFIG.source.twikoo.qqNickMode
        ? GLOBAL_CONFIG.source.twikoo.qqNickMode
        : 'default';

const __CF_PROXY_URL__ =
    GLOBAL_CONFIG &&
    GLOBAL_CONFIG.source &&
    GLOBAL_CONFIG.source.twikoo &&
    GLOBAL_CONFIG.source.twikoo.qqNickCustomApi
        ? GLOBAL_CONFIG.source.twikoo.qqNickCustomApi.trim()
        : '';

const __QQ_NICK_ENABLE__ = __QQ_NICK_MODE__ === 'custom' && __CF_PROXY_URL__ !== '';

    async function __manual_fetchNick__(qq) {
        try {
            const r = await fetch(`${__CF_PROXY_URL__}${qq}`, { cache: 'no-store' });
            if (!r.ok) return '神秘用户'; 
            const j = await r.json();
            
            // 核心修改在这里：先取值，再判定
            const name = (j.data && j.data.name) ? j.data.name : '';
            return (!name || name === 'null') ? '神秘用户' : name;
            
        } catch (e) {
            console.error('[Twikoo补丁] 获取昵称失败:', e);
            return '神秘用户';
        }
    }

    async function __manual_tryFill__(root, src) {
        const scope = (src && (src.closest("form") || src.closest(".tk-reply") || src.closest(".tk-comment") || src.closest("#twikoo"))) || root;
        const nickInput = scope.querySelector('input[name="nick"], input[placeholder*="昵称"]');
        if (!nickInput) return;
        
        const qqMatch = nickInput.value.trim().match(/^\d{5,11}$/);
        if (!qqMatch) return;
        
        const qq = qqMatch[0];
        const name = await __manual_fetchNick__(qq);
        
        if (name) {
            // 1. 填充并强化同步昵称
            nickInput.value = name;
            ['input', 'change', 'blur'].forEach(evt => {
                nickInput.dispatchEvent(new Event(evt, { bubbles: true }));
            });
            
            // 2. 填充并强化同步邮箱
            const mailInput = scope.querySelector('input[name="mail"], input[type="email"]');
            if (mailInput) {
                const mailVal = qq + '@qq.com';
                mailInput.value = mailVal;
                ['input', 'change', 'blur'].forEach(evt => {
                    mailInput.dispatchEvent(new Event(evt, { bubbles: true }));
                });
            }

            // 3. 写入持久化存储，确保 Twikoo 提交逻辑抓取
            try {
                localStorage.setItem('twikoo_nick', name);
                localStorage.setItem('twikoo_mail', qq + '@qq.com');
            } catch (e) {}
        }
    }

    function __manual_bind__() {
    if (!__QQ_NICK_ENABLE__) return;

    const box = document.getElementById('twikoo');
    if (!box || box.__manualBound__) return;

        const sel = 'input[name="nick"], input[placeholder*="昵称"]';
        
        box.addEventListener('keydown', e => {
            const t = e.target;
            if ((e.key === 'Enter' || e.keyCode === 13) && t && t.matches && t.matches(sel)) {
                e.preventDefault();
                __manual_tryFill__(box, t);
            }
        }, true);

        box.addEventListener('blur', e => {
            const t = e.target;
            if (t && t.matches && t.matches(sel)) {
                __manual_tryFill__(box, t);
            }
        }, true);
    }

    if (!document.getElementById('post-comment')) return;

    const init = () => {
        twikoo.init(Object.assign({
            el: '#twikoo-wrap',
            envId: GLOBAL_CONFIG.source.twikoo.twikooUrl,
            region: '',
            path: location.pathname.replace(/\/page\/\d$/, ""),
            onCommentLoaded: function () {
                try { __manual_bind__(); } catch(e) {}

                if (typeof btf === 'object') btf.loadLightbox(document.querySelectorAll('#twikoo .tk-content img:not(.tk-owo-emotion)'));
                if (typeof hljs === 'object') hljs.highlightAll();
                
                if (typeof Prism === 'object' && typeof Prism.highlightAll === 'function') {
                    try { Prism.highlightAll(); } catch(e) {}
                }

                (function __fixTkExtraGaps__(root) {
                    try {
                        const container = root.getElementById ? root.getElementById('twikoo') : root;
                        (container || root).querySelectorAll('.tk-extra .tk-icon + *').forEach(el => {
                            el.normalize();
                            el.childNodes.forEach(n => {
                                if (n.nodeType === 3) {
                                    n.textContent = n.textContent.replace(/[\u00A0\u202F\u2009\u200A\u200B\uFEFF]/g, ' ').replace(/\s+/g, ' ').replace(/^\s+/, '');
                                }
                            });
                        });
                    } catch (e) {}
                })(document);
            }
        }, null));
    }

    const getCount = () => {
        twikoo.getCommentsCount({
            envId: GLOBAL_CONFIG.source.twikoo.twikooUrl,
            region: '',
            urls: [window.location.pathname],
            includeReply: true
        }).then(res => {
            const countEl = document.getElementById('twikoo-count');
            if (countEl) countEl.innerText = res[0].count;
        }).catch(() => {});
    }

    const runFn = () => {
        init();
        getCount();
    }

    const loadTwikoo = () => {
        if (typeof twikoo === 'object') {
            setTimeout(runFn, 0);
            return;
        }
        getScript(GLOBAL_CONFIG.source.twikoo.js).then(runFn);
    }

    if (!GLOBAL_CONFIG.source.comments.lazyload) {
        loadTwikoo();
    } else {
        window.loadOtherComment = loadTwikoo;
    }
})();