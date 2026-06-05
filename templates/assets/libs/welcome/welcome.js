// 访客欢迎信息模块（适配 Cloudflare Worker 版） —— PJAX安全版
let ipLocation;

// 默认中心点（博主位置）
const WELCOME_DEFAULT_CENTER = { lng: 111.64, lat: 21.54 };

function getWelcomeCenter() {
  const cfg = (window.GLOBAL_CONFIG && GLOBAL_CONFIG.source && GLOBAL_CONFIG.source.welcome)
    ? GLOBAL_CONFIG.source.welcome : {};
  const rawLng = (cfg.locationLng ?? '').toString().trim();
  const rawLat = (cfg.locationLat ?? '').toString().trim();
  const lng = rawLng === '' ? NaN : Number(rawLng);
  const lat = rawLat === '' ? NaN : Number(rawLat);
  return {
    lng: Number.isFinite(lng) ? lng : WELCOME_DEFAULT_CENTER.lng,
    lat: Number.isFinite(lat) ? lat : WELCOME_DEFAULT_CENTER.lat
  };
}

function getDistance(e1, n1, e2, n2) {
  const R = 6371;
  const { sin, cos, asin, PI, hypot } = Math;
  const P = (e, n) => { e*=PI/180; n*=PI/180; return {x:cos(n)*cos(e), y:cos(n)*sin(e), z:sin(n)}; };
  const a = P(e1,n1), b = P(e2,n2);
  const c = hypot(a.x-b.x, a.y-b.y, a.z-b.z);
  return Math.round(asin(c/2) * 2 * R);
}

function fetchIpLocation() {
  let myUrl = (GLOBAL_CONFIG?.source?.welcome?.key || "").trim();

  if (!myUrl || !myUrl.startsWith('http')) {
    //console.log("Welcome Script: 未检测到有效的完整接口链接，已跳过请求。");
    return; 
  }

  $.ajax({
    type: 'get',
    url: myUrl,
    dataType: 'json',
    success: function (res) {
      const d = res.data || res; 
      if (res.code === 200 || res.status === "success" || d.ip) {
        
        // 核心修正：补全省份和城市的“省/市”后缀，确保 switch 匹配成功
        let p = d.prov || d.region || d.regionName || "";
        let c = d.city || "";
        if (p && !p.endsWith("省") && !p.endsWith("市") && !p.endsWith("自治区") && !p.endsWith("特别行政区")) p += "省";
        if (c && !c.endsWith("市") && !c.endsWith("区") && !c.endsWith("县")) c += "市";

        ipLocation = {
          ip: d.ip || d.query,
          location: { 
            lat: parseFloat(d.lat) || 0, 
            lng: parseFloat(d.lng) || parseFloat(d.lon) || 0 
          },
          ad_info: {
            nation: (d.country === "CN" || d.country === "United States" || d.country === "US" || d.country === "中国") ? "中国" : (d.country || "外国"),
            province: p, 
            city: c,
            district: d.district || ""
          }
        };
        showWelcome();
      }
    }
  });
}

function showWelcome() {
  if (!ipLocation) return;
  var box = document.getElementById('welcome-info');
  if (!box) return;

  const { lng: myLng, lat: myLat } = getWelcomeCenter();
  const dist = getDistance(myLng, myLat, ipLocation.location.lng, ipLocation.location.lat);

  let nation = ipLocation.ad_info.nation;
  let province = ipLocation.ad_info.province || "";
  let city = ipLocation.ad_info.city || "";
  let district = ipLocation.ad_info.district || "";
  let ip = ipLocation.ip;
  let desc = '带我去你的城市逛逛吧！';
  let pos = "";

  // 区分国内与国外逻辑
  if (nation === "中国" || nation === "CN") {
    // 强制拼接成：广东省 深圳市 区
    pos = `${province} ${city} ${district}`.trim();
    
    switch (province) {
      case "北京市": desc = "北——京——欢迎你~"; break;
      case "天津市": desc = "讲段相声吧"; break;
      case "河北省": desc = "山势巍巍成壁垒，天下雄关铁马金戈由此向，无限江山"; break;
      case "江苏省":
        switch (city) {
          case "南京市": desc = "这是我挺想去的城市啦"; break;
          case "苏州市": desc = "上有天堂，下有苏杭"; break;
          default: desc = "散装是必须要散装的"; break;
        }
        break;
      case "广东省":
    switch (city) {
      case "广州市": desc = "看小蛮腰，喝早茶了嘛~"; break;
      case "深圳市": desc = "今天你逛商场了嘛~"; break;
      case "阳江市": desc = "阳西！博主家乡~ 欢迎来玩~"; break;
      case "佛山市": desc = "黄飞鸿的故乡，咏春拳打一套~"; break;
      case "东莞市": desc = "世界工厂，今天搬砖辛苦啦~"; break;
      case "珠海市": desc = "看情侣路，去长隆玩了嘛~"; break;
      case "中山市": desc = "孙中山故里，今天去哪里吃乳鸽？"; break;
      case "惠州市": desc = "去西湖散步，去海边看日出了吗？"; break;
      case "江门市": desc = "五邑侨乡，陈皮炖汤喝了吗？"; break;
      case "汕头市": desc = "牛肉火锅安排上了吗？潮汕美食名不虚传~"; break;
      case "湛江市": desc = "去吃生蚝了吗？海鲜大餐走起~"; break;
      case "茂名市": desc = "荔枝之乡，今天吃得甜甜的吗？"; break;
      case "肇庆市": desc = "鼎湖山空气好，去洗洗肺吗？"; break;
      case "清远市": desc = "去泡温泉，或者去漂流了吗？"; break;
      case "韶关市": desc = "丹霞地貌，去爬山运动了吗？"; break;
      case "揭阳市": desc = "古城文化，今天有逛逛嘛？"; break;
      case "梅州市": desc = "客家文化浓厚，腌面吃了吗？"; break;
      case "汕尾市": desc = "海滨小城，今天看海了吗？"; break;
      case "潮州市": desc = "逛牌坊街，牛肉丸吃爽了吗？"; break;
      case "河源市": desc = "万绿湖畔，今天有去吸氧吗？"; break;
      case "云浮市": desc = "禅宗文化，今天心情宁静吗？"; break;
      default: desc = "来两斤福建人~"; break;
    }
        break;
      case "河南省":
        switch (city) {
          case "郑州市": desc = "豫州之域，天地之中"; break;
          case "南阳市": desc = "臣本布衣，躬耕于南阳，此南阳非彼南阳！"; break;
          case "驻马店市": desc = "峰峰有奇石，石石挟仙气嵖岈山的花很美哦！"; break;
          case "开封市": desc = "刚正不阿包青天"; break;
          case "洛阳市": desc = "洛阳牡丹甲天下"; break;
          default: desc = "可否带我品尝河南烩面啦？"; break;
        }
        break;
      case "湖南省": desc = "74751，长沙斯塔克"; break;
      case "四川省": desc = "康康川妹子"; break;
      case "广西壮族自治区": desc = "桂林山水甲天下"; break;
      case "新疆维吾尔自治区": desc = "驼铃古道丝绸路，胡马犹闻唐汉风"; break;
      case "香港特别行政区": desc = "永定贼有残留地鬼嚎，迎击光非岁玉"; break;
      case "浙江省": desc = "上有天堂，下有苏杭，今天去西湖了嘛~"; break;
      case "福建省": desc = "去武夷山喝杯岩茶，今天心情不错吧~"; break;
      case "山东省": desc = "好客山东，今天又去喝啤酒了吗？"; break;
      case "辽宁省": desc = "东北老铁，说话带点儿海蛎子味没？"; break;
      case "吉林省": desc = "去看长白山天池了嘛？好山好水好风光~"; break;
      case "黑龙江省": desc = "哈尔滨的雪景看过了吗？感觉冷不冷？"; break;
      case "安徽省": desc = "黄山云海非常美，去打卡了吗？"; break;
      case "湖北省": desc = "武汉的热干面吃了吗？黄鹤楼登高望远~"; break;
      case "江西省": desc = "庐山风景如画，记得去爬爬山哟~"; break;
      case "海南省": desc = "椰风海韵，去三亚潜水了吗？"; break;
      case "山西省": desc = "山西面食种类多，今天吃了几种呀？"; break;
      case "陕西省": desc = "古都长安，肉夹馍还是那么香吗？"; break;
      case "甘肃省": desc = "大漠孤烟直，去敦煌看飞天了嘛？"; break;
      case "青海省": desc = "青海湖的水真蓝，去转转湖嘛？"; break;
      case "云南省": desc = "彩云之南，今天去大理发呆了吗？"; break;
      case "贵州省": desc = "多彩贵州，酸汤鱼确实很开胃呢~"; break;
      case "西藏自治区": desc = "圣地拉萨，今天离云端更近了嘛？"; break;
      case "内蒙古自治区": desc = "天苍苍野茫茫，今天去草原骑马了嘛？"; break;
      case "宁夏回族自治区": desc = "塞上江南，大漠风光真是独特呢~"; break;
      case "澳门特别行政区": desc = "澳门风云，今天去走走逛逛了嘛？"; break;
      case "台湾省": desc = "宝岛风光无限，记得吃好喝好呀~"; break;
      case "重庆市": desc = "山城火锅真的辣，今天挑战了几分辣？"; break;
      case "上海市": desc = "魔都节奏快，今天在陆家嘴看风景了吗？"; break;
      default: desc = `来自 ${city || province} 的小伙伴你好呀~`;
    }
  } else {
    // 国外显示：国家 + 城市 (若无城市只显示国家)
    pos = city ? `${nation} ${city}` : nation;
    switch (nation) {
      case "US": case "United States": case "美国": pos = "美国 " + city; desc = "Let us live in peace!"; break;
      case "JP": case "Japan": case "日本": pos = "日本 " + city; desc = "よろしく，一起去看樱花吗"; break;
      case "UK": case "United Kingdom": case "英国": pos = "英国 " + city; desc = "想同你一起夜乘伦敦眼"; break;
      case "RU": case "Russia": case "俄罗斯": pos = "俄罗斯 " + city; desc = "干了这瓶伏特加！"; break;
      case "FR": case "France": case "法国": pos = "法国 " + city; desc = "C'est La Vie"; break;
      case "DE": case "Germany": case "德国": pos = "德国 " + city; desc = "Die Zeit verging im Fluge."; break;
      case "AU": case "Australia": case "澳大利亚": pos = "澳大利亚 " + city; desc = "一起去大堡礁吧！"; break;
      case "CA": case "Canada": case "加拿大": pos = "加拿大 " + city; desc = "拾起一片枫叶赠予你"; break;
      default: desc = "带我去你的国家逛逛吧";
    }
  }

  const hour = new Date().getHours();
  let greet = "😴 夜深了，早点休息~";
  if (hour >= 5 && hour < 11) greet = "🌤️ 早上好，一日之计在于晨";
  else if (hour >= 11 && hour < 13) greet = "☀️ 中午好，记得午休喔~";
  else if (hour >= 13 && hour < 17) greet = "🕞 下午好，饮茶先啦！";
  else if (hour >= 17 && hour < 19) greet = "🚶‍♂️ 即将下班，记得按时吃饭~";
  else if (hour >= 19 && hour < 24) greet = "🌙 晚上好，夜生活嗨起来！";

  if (ip.includes(":")) ip = "好复杂，咱看不懂~(ipv6)";

  const html = `欢迎 <b><span style="color: var(--kouseki-ip-color);">${pos}</span></b> 的小友 💖<br>
    ${desc}🍂<br>
    当前位置距博主约 <b><span style="color: var(--kouseki-ip-color)">${dist}</span></b> 公里！<br>
    您的IP地址为：<b><span class="ip-blur">${ip}</span></b><br>
    ${greet} <br>`;

  box.innerHTML = html;
}

(function () {
  if (window.__WELCOME_BIND_ONCE__) return;
  window.__WELCOME_BIND_ONCE__ = true;

  function pjaxRecalc() {
    var box = document.getElementById('welcome-info');
    if (!box) return;
    try { window.showWelcome && window.showWelcome(); } catch (e) {}
    try { window.fetchIpLocation && window.fetchIpLocation(); } catch (e) {}
  }

  window.addEventListener('load', function () {
    try { window.fetchIpLocation && window.fetchIpLocation(); } catch (e) {}
  });

  document.addEventListener('pjax:complete', pjaxRecalc);
  document.addEventListener('pjax:success',  pjaxRecalc);
  document.addEventListener('page:loaded',   pjaxRecalc);
})();