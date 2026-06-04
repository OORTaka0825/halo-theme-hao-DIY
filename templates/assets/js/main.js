document.addEventListener('DOMContentLoaded', function () {
    const $blogName = document.getElementById('site-name')
    let blogNameWidth = $blogName && $blogName.offsetWidth
    const $menusEle = document.querySelector('#menus .menus_items')
    let menusWidth = $menusEle && $menusEle.offsetWidth
    const $searchEle = document.querySelector('#search-button')
    let searchWidth = $searchEle && $searchEle.offsetWidth

    const adjustMenu = (change = false) => {
        if (change) {
            blogNameWidth = $blogName && $blogName.offsetWidth
            menusWidth = $menusEle && $menusEle.offsetWidth
            searchWidth = $searchEle && $searchEle.offsetWidth
        }
        const $nav = document.getElementById('nav')
        let t
        if (window.innerWidth < 768) t = true
        else t = blogNameWidth + menusWidth + searchWidth > $nav.offsetWidth - 120

        if (t) {
            $nav.classList.add('hide-menu')
        } else {
            $nav.classList.remove('hide-menu')
        }
    }

    // 初始化header
    const initAdjust = () => {
        adjustMenu()
        document.getElementById('nav').classList.add('show')
    }

    // sidebar menus
    const sidebarFn = () => {
        const $toggleMenu = document.getElementById('toggle-menu')
        const $mobileSidebarMenus = document.getElementById('sidebar-menus')
        const $menuMask = document.getElementById('menu-mask')
        const $body = document.body

        function openMobileSidebar() {
            btf.sidebarPaddingR()
            $body.style.overflow = 'hidden'
            btf.fadeIn($menuMask, 0.5)
            $mobileSidebarMenus.classList.add('open')
        }

        function closeMobileSidebar() {
            $body.style.overflow = ''
            $body.style.paddingRight = ''
            btf.fadeOut($menuMask, 0.5)
            $mobileSidebarMenus.classList.remove('open')
        }

        $toggleMenu.addEventListener('click', openMobileSidebar)

        $menuMask.addEventListener('click', e => {
            if ($mobileSidebarMenus.classList.contains('open')) {
                closeMobileSidebar()
            }
        })

        window.addEventListener('resize', e => {
            if (btf.isHidden($toggleMenu)) {
                if ($mobileSidebarMenus.classList.contains('open')) closeMobileSidebar()
            }
        })
    }

    /**
     * 首頁top_img底下的箭頭
     */
    const scrollDownInIndex = () => {
        const $scrollDownEle = document.getElementById('scroll-down')
        const $homeTop = document.getElementById('home_top')
        $scrollDownEle && $scrollDownEle.addEventListener('click', function () {
            $homeTop &&  btf.scrollToDest($homeTop.offsetTop, 300)

        })
    }


    /**
     * justified-gallery 圖庫排版
     * 需要 jQuery
     */

    let detectJgJsLoad = false
    const runJustifiedGallery = function (ele) {

        if (detectJgJsLoad) btf.initJustifiedGallerys(ele)
        else {
            $('head').append(`<link rel="stylesheet" type="text/css" href="${GLOBAL_CONFIG.source.justifiedGallery.css}">`)
            $.getScript(`${GLOBAL_CONFIG.source.justifiedGallery.js}`, function () {

                btf.initJustifiedGallerys(ele)
            })
            detectJgJsLoad = true
        }
    }

    /**
     * fancybox
     */
    const addFancybox = function (ele) {
        const runFancybox = (ele) => {
            ele.each(function (i, o) {
                const $this = $(o)
                const lazyloadSrc = $this.attr('data-lazy-src') || $this.attr('src')
                const dataCaption = $this.attr('alt') || ''
                $this.wrap(`<a href="${lazyloadSrc}" data-fancybox="images" class="fancybox" data-srcset="${lazyloadSrc}"></a>`)

            })

            $().fancybox({
                selector: '[data-fancybox]',
                loop: true,
                transitionEffect: 'slide',
                protect: true,
                buttons: ['slideShow', 'fullScreen', 'thumbs', 'close'],
                hash: false,
              caption: function () { return '' }
})
        }

        if (typeof $.fancybox === 'undefined') {
            // $('head').append(`<link rel="stylesheet" type="text/css" href="${GLOBAL_CONFIG.source.fancybox.css}">`)
            $.getScript(`${GLOBAL_CONFIG.source.fancybox.js}`, function () {
                runFancybox($(ele))
            })
        } else {
            runFancybox($(ele))
        }
    }

    const jqLoadAndRun = () => {
        const $fancyboxEle = GLOBAL_CONFIG.lightbox === 'fancybox'
            ? document.querySelectorAll('#article-container :not(a):not(.rss-plan-info-group):not(.no-lightbox) > img, #article-container > img,.bber-container-img > img')
            : []
        const fbLengthNoZero = $fancyboxEle.length > 0
        const $jgEle = document.querySelectorAll('#article-container .gallery')
        const jgLengthNoZero = $jgEle.length > 0

        if (jgLengthNoZero || fbLengthNoZero) {
            btf.isJqueryLoad(() => {
                jgLengthNoZero && runJustifiedGallery($jgEle)
                fbLengthNoZero && addFancybox($fancyboxEle)
            })
        }
    }

    /**
     *  toc
     */
    const tocFn = function () {
        const postContent = document.querySelector('.post-content');
        if (postContent == null) return;

        const titles = postContent.querySelectorAll('h1,h2,h3,h4,h5,h6');

        // 目录点击后，标题距离浏览器顶部的预留高度。
        // 你要的“图二效果”就改这里：数值越大，标题露得越靠下。
        const TOC_VISIBLE_OFFSET = 140;

        const hideMobileTocButton = () => {
            const $mobileTocButton = document.getElementById("mobile-toc-button")
            if ($mobileTocButton) {
                $('#mobile-toc-button').attr('style', 'display: none');
            }
        }

        if (titles.length === 0 || !titles) {
            const cardToc = document.getElementById("card-toc");
            cardToc?.remove();
            hideMobileTocButton();
            return;
        }

        // 文章页侧栏未添加“目录”卡片时，不初始化 tocbot，避免 #card-toc 为空导致 JS 报错
        const $cardTocLayout = document.getElementById('card-toc')
        if (!$cardTocLayout) {
            hideMobileTocButton();
            return;
        }
        const $cardToc = $cardTocLayout.getElementsByClassName('toc-content')[0]
        if (!$cardToc) {
            hideMobileTocButton();
            return;
        }

        // PJAX 或重复进入文章页时，先销毁旧实例，防止目录高亮和锚点计算错位
        try {
            tocbot.destroy();
        } catch (e) {}

        tocbot.init({
            tocSelector: '.toc-content',
            contentSelector: '.post-content',
            headingSelector: 'h1,h2,h3,h4,h5,h6',
            listItemClass: 'toc-item',
            activeLinkClass: 'active',
            activeListItemClass: 'active',
            // 高亮判断必须和实际滚动预留高度一致，否则会出现“点四高亮三”
            headingsOffset: TOC_VISIBLE_OFFSET,
            // 关闭 tocbot 自带点击滚动，只保留它生成目录和滚动高亮；点击滚动由下面这一处统一处理
            scrollSmooth: false,
            tocScrollOffset: 80,
        });

        // 目录是同页锚点，不应该被 PJAX 当成页面跳转处理
        $cardToc.querySelectorAll('a.toc-link').forEach(link => {
            link.setAttribute('data-no-pjax', '');
        });

        const getTocTarget = (href) => {
            if (!href) return null;
            const hashIndex = href.indexOf('#');
            if (hashIndex === -1) return null;
            const rawId = href.slice(hashIndex + 1);
            if (!rawId) return null;

            let decodedId = rawId;
            try {
                decodedId = decodeURIComponent(rawId);
            } catch (e) {}

            return document.getElementById(decodedId) || document.getElementById(rawId);
        }

        const setTocActive = (tocLink) => {
            if (!tocLink) return;
            $cardToc.querySelectorAll('a.toc-link.active').forEach(link => link.classList.remove('active'));
            $cardToc.querySelectorAll('.toc-item.active').forEach(item => item.classList.remove('active'));
            tocLink.classList.add('active');
            const li = tocLink.closest('.toc-item');
            if (li) li.classList.add('active');
        }

        // 只绑定一次，避免 PJAX 后重复绑定导致多次滚动
        if (!$cardToc.dataset.haoTitleVisibleClick) {
            $cardToc.dataset.haoTitleVisibleClick = 'true';
            $cardToc.addEventListener('click', (event) => {
                const tocLink = event.target.closest && event.target.closest('a.toc-link');
                if (tocLink && $cardToc.contains(tocLink)) {
                    // 阻止浏览器默认 #锚点跳转、PJAX、tocbot 自带点击逻辑抢滚动
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();

                    const target = getTocTarget(tocLink.getAttribute('href') || tocLink.hash);
                    if (target) {
                        const targetTop = target.getBoundingClientRect().top + window.pageYOffset - TOC_VISIBLE_OFFSET;
                        window.scrollTo({
                            top: Math.max(0, targetTop),
                            behavior: 'smooth'
                        });

                        // 不使用 location.hash，避免浏览器再次执行默认锚点跳转
                        if (window.history && window.history.replaceState && target.id) {
                            window.history.replaceState(null, '', location.pathname + location.search + '#' + encodeURIComponent(target.id));
                        }

                        // 点击后先立即高亮当前目录，滚动过程中 tocbot 会继续接管滚动高亮
                        setTocActive(tocLink);
                    }
                }

                if (window.innerWidth < 900) {
                    $cardTocLayout.classList.remove("open");
                }
            }, true);
        }
    }



    /**
     * Rightside
     */
    const rightSideFn = {
        switchReadMode: () => { // read-mode
            const $body = document.body
            $body.classList.add('read-mode')
            const newEle = document.createElement('button')
            newEle.type = 'button'
            newEle.className = 'haofont hao-icon-sign-out-alt exit-readmode'
            $body.appendChild(newEle)

            function clickFn () {
                $body.classList.remove('read-mode')
                newEle.remove()
                newEle.removeEventListener('click', clickFn)
            }

            newEle.addEventListener('click', clickFn)
        },
        showOrHideBtn: () => { // rightside 點擊設置 按鈕 展開
            document.getElementById('rightside-config-hide').classList.toggle('show')
        },
        scrollToTop: () => { // Back to top
            btf.scrollToDest(0, 500)
        },
        hideAsideBtn: () => { // Hide aside
            const $htmlDom = document.documentElement.classList
            $htmlDom.contains('hide-aside')
                ? saveToLocal.set('aside-status', 'show', 2)
                : saveToLocal.set('aside-status', 'hide', 2)
            $htmlDom.toggle('hide-aside')
        },
        runMobileToc: item => {
            const tocEle = document.getElementById("card-toc");
            tocEle.style.transformOrigin = `right ${item.getBoundingClientRect().top + 17}px`;
            tocEle.style.transition = "transform 0.3s ease-in-out";
            tocEle.classList.toggle("open");
            tocEle.addEventListener(
                "transitionend",
                () => {
                    tocEle.style.transition = "";
                    tocEle.style.transformOrigin = "";
                },
                { once: true }
            );
        },
    }

    document.getElementById('rightside').addEventListener('click', function (e) {
        const $target = e.target.id || e.target.parentNode.id
        switch ($target) {
            case 'go-up':
                rightSideFn.scrollToTop()
                break
            case 'rightside-config':
                rightSideFn.showOrHideBtn()
                break
            case "mobile-toc-button":
                rightSideFn.runMobileToc(this);
                break;
            case 'readmode':
                rightSideFn.switchReadMode()
                break
            case 'darkmode':
                navFn.switchDarkMode();
                break
            case 'hide-aside-btn':
                rightSideFn.hideAsideBtn()
                break
            default:
                break
        }
    })

    /**
     * 滾動處理
     */
    const scrollFn = function () {
        const $postComment = document.getElementById('post-comment')
        const $rightside = document.getElementById('rightside')
        const innerHeight = window.innerHeight + 0

        if ($postComment) {
            $('#to_comment').attr('style', 'display: block');
        } else {
            $('#to_comment').attr('style', 'display: none');
        }

        // 當滾動條小于 0 的時候
        if (document.body.scrollHeight <= innerHeight) {
            $rightside.style.cssText = 'opacity: 1; transform: translateX(-58px)'
            /* no early return: always bind scroll even if first screen is short */
        }

        let initTop = 0
        let isChatShow = true
        const $header = document.getElementById('page-header')
        const $gulitop = document.getElementById('guli_top')
        const $cookies_window = document.getElementById('cookies-window')
        const isChatBtnHide = typeof chatBtnHide === 'function'
        const isChatBtnShow = typeof chatBtnShow === 'function'
        window.addEventListener('scroll', btf.throttle(function (e) {
            const currentTop = window.scrollY || document.documentElement.scrollTop
            const isDown = scrollDirection(currentTop)
            if (currentTop > 0) {
                if (isDown) {
                    if ($header.classList.contains('nav-visible')) $header.classList.remove('nav-visible')
                    if (isChatBtnShow && isChatShow === true) {
                        chatBtnHide()
                        isChatShow = false
                    }
                } else {
                    if (!$header.classList.contains('nav-visible')) $header.classList.add('nav-visible')
                    if (isChatBtnHide && isChatShow === false) {
                        chatBtnShow()
                        isChatShow = true
                    }
                }


                $header.classList.add('nav-fixed')
                if($cookies_window!=null && $cookies_window!=''){
                    $cookies_window.classList.add('cw-hide')
                }
                if (window.getComputedStyle($rightside).getPropertyValue('opacity') === '0') {
                    $rightside.style.cssText = 'opacity: 0.8; transform: translateX(-58px)'
                }
            } else {
                if (currentTop === 0) {
                    $header.classList.remove('nav-fixed', 'nav-visible')
                }
                $rightside.style.cssText = "opacity: ''; transform: ''"
            }

            if (document.body.scrollHeight <= innerHeight) {
                $rightside.style.cssText = 'opacity: 0.8; transform: translateX(-58px)'
            }
        }, 200))

        // find the scroll direction
        function scrollDirection (currentTop) {
            const result = currentTop > initTop // true is down & false is up
            initTop = currentTop
            return result
        }
    }

    /**
     * menu
     * 側邊欄sub-menu 展開/收縮
     * 解決menus在觸摸屏下，滑動屏幕menus_item_child不消失的問題（手機hover的bug)
     */
    const clickFnOfSubMenu = function () {
        document.querySelectorAll('#sidebar-menus .expand').forEach(function (e) {
            e.addEventListener('click', function () {
                this.classList.toggle('hide')
                const $dom = this.parentNode.nextElementSibling
                if (btf.isHidden($dom)) {
                    $dom.style.display = 'block'
                } else {
                    $dom.style.display = 'none'
                }
            })
        })

        window.addEventListener('touchmove', function (e) {
            const $menusChild = document.querySelectorAll('#nav .menus_item_child')
            $menusChild.forEach(item => {
                if (!btf.isHidden(item)) item.style.display = 'none'
            })
        })
    }

    /**
     * 複製時加上版權信息
     */
    const addCopyright = () => {
        const copyright = GLOBAL_CONFIG.copyright
        document.body.oncopy = (e) => {
            e.preventDefault()
            let textFont;
            const copyFont = window.getSelection(0).toString()
            if (copyFont.length > copyright.limitCount) {
                textFont = copyFont + '\n' + '\n' + '\n' +
                    copyright.languages.author + '\n' +
                    copyright.languages.link + window.location.href + '\n' +
                    copyright.languages.source + '\n' +
                    copyright.languages.info
            } else {
                textFont = copyFont
            }
            if (e.clipboardData) {
                return e.clipboardData.setData('text', textFont)
            } else {
                return window.clipboardData.setData('text', textFont)
            }
        }
    }

    /**
     * 網頁運行時間
     */
    const addRuntime = () => {
        const $runtimeCount = document.getElementById('runtimeshow');
        if ($runtimeCount) {
            var s1 = $runtimeCount.innerText;;//建站时间
            if (s1) {
                s1 = new Date(s1.replace(/-/g, "/"));
                s2 = new Date();
                var days = s2.getTime() - s1.getTime();
                var number_of_days = parseInt(days / (1000 * 60 * 60 * 24));
                $runtimeCount.innerText = number_of_days + "天";
            }
        }
    }

    /**
     * 最後一次更新時間
     */
    const addLastPushDate = () => {
        const $lastPushDateItem = document.getElementById('last-push-date')
        if ($lastPushDateItem) {
            const lastPushDate = $lastPushDateItem.getAttribute('data-lastPushDate')
            $lastPushDateItem.innerText = btf.diffDate(lastPushDate, true)
        }
    }

    /**
     * table overflow
     */
    const addTableWrap = function () {
        const $table = document.querySelectorAll('#article-container :not(.highlight) > table, #article-container > table')
        if ($table.length) {
            $table.forEach(item => {
                btf.wrap(item, 'div', '', 'table-wrap')
            })
        }
    }

    /**
     * tag-hide
     */
    const clickFnOfTagHide = function () {
        const $hideInline = document.querySelectorAll('#article-container .hide-button')
        if ($hideInline.length) {
            $hideInline.forEach(function (item) {
                item.addEventListener('click', function (e) {
                    const $this = this
                    const $hideContent = $this.nextElementSibling
                    $this.classList.toggle('open')
                    if ($this.classList.contains('open')) {
                        if ($hideContent.querySelectorAll('.gallery').length > 0) {
                            btf.initJustifiedGallerys($hideContent.querySelectorAll('.gallery'))
                        }
                    }
                })
            })
        }
    }

    const tabsFn = {
        clickFnOfTabs: function () {
            document.querySelectorAll('#article-container .tab > button').forEach(function (item) {
                item.addEventListener('click', function (e) {
                    const $this = this
                    const $tabItem = $this.parentNode

                    if (!$tabItem.classList.contains('active')) {
                        const $tabContent = $tabItem.parentNode.nextElementSibling
                        const $siblings = btf.siblings($tabItem, '.active')[0]
                        $siblings && $siblings.classList.remove('active')
                        $tabItem.classList.add('active')
                        const tabId = $this.getAttribute('data-href').replace('#', '')
                        const childList = [...$tabContent.children]
                        childList.forEach(item => {
                            if (item.id === tabId) item.classList.add('active')
                            else item.classList.remove('active')
                        })
                        const $isTabJustifiedGallery = $tabContent.querySelectorAll(`#${tabId} .gallery`)
                        if ($isTabJustifiedGallery.length > 0) {
                            btf.initJustifiedGallerys($isTabJustifiedGallery)
                        }
                    }
                })
            })
        },
        backToTop: () => {
            document.querySelectorAll('#article-container .tabs .tab-to-top').forEach(function (item) {
                item.addEventListener('click', function () {
                    btf.scrollToDest(btf.getEleTop(btf.getParents(this, '.tabs')), 300)
                })
            })
        }
    }

    const toggleCardCategory = function () {
        const $cardCategory = document.querySelectorAll('#aside-cat-list .card-category-list-item.parent i')
        if ($cardCategory.length) {
            $cardCategory.forEach(function (item) {
                item.addEventListener('click', function (e) {
                    e.preventDefault()
                    const $this = this
                    $this.classList.toggle('expand')
                    const $parentEle = $this.parentNode.nextElementSibling
                    if (btf.isHidden($parentEle)) {
                        $parentEle.style.display = 'block'
                    } else {
                        $parentEle.style.display = 'none'
                    }
                })
            })
        }
    }

    const addPostOutdateNotice = function () {
        const data = GLOBAL_CONFIG.noticeOutdate
        const diffDay = btf.diffDate("2022-11-04 20:08:15")
        if (diffDay >= data.limitDay) {
            const ele = document.createElement('div')
            ele.className = 'post-outdate-notice'
            ele.textContent = data.messagePrev + ' ' + diffDay + ' ' + data.messageNext
            const $targetEle = document.getElementById('article-container')
            if (data.position === 'top') {
                $targetEle.insertBefore(ele, $targetEle.firstChild)
            } else {
                $targetEle.appendChild(ele)
            }
        }
    }

    const lazyloadImg = () => {
        window.lazyLoadInstance = new LazyLoad({
            elements_selector: 'img',
            threshold: 0,
            data_src: 'lazy-src',
            callback_error: (img) => {
                img.setAttribute("srcset", GLOBAL_CONFIG.lazyload.error);
            }
        })
    }

    const unRefreshFn = function () {
        window.addEventListener('resize', adjustMenu)
        window.addEventListener('orientationchange', () => {
            setTimeout(adjustMenu(true), 100)
        })

        clickFnOfSubMenu()
        GLOBAL_CONFIG.lazyload.enable && lazyloadImg()
        GLOBAL_CONFIG.copyright !== undefined && addCopyright()
    }

    window.refreshFn = function () {
        initAdjust();


        if (GLOBAL_CONFIG.isPost) {
            addRuntime();
            tocFn();
        } else {
            addLastPushDate()
            toggleCardCategory()
            addRuntime()
        }

        sidebarFn()
        GLOBAL_CONFIG.isHome && scrollDownInIndex()
        scrollFn()
        addTableWrap()
        clickFnOfTagHide()
        tabsFn.clickFnOfTabs()
        tabsFn.backToTop()
        jqLoadAndRun()
    }

    refreshFn()
    unRefreshFn()
})
