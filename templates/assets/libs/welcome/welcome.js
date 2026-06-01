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
function cleanText(v) {
  return (v ?? '').toString().trim();
}

function isChinaCountry(v) {
  const s = cleanText(v);
  return [
    '中国',
    'CN',
    'China',
    '中华人民共和国'
  ].includes(s);
}

function normalizeProvince(v) {
  let p = cleanText(v);

  // 新接口有时可能返回“中国 广东省”，这里把“中国”去掉
  p = p
    .replace(/^中国\s*/g, '')
    .replace(/^中华人民共和国\s*/g, '')
    .replace(/\s+/g, '');
    if (['HK', 'HKG', 'HongKong', 'Hong Kong', '香港'].includes(p)) {
      return '香港特别行政区';
  }

  if (['MO', 'Macau', 'Macao', '澳门'].includes(p)) {
    return '澳门特别行政区';
  }

  if (['TW', 'Taiwan', '台湾'].includes(p)) {
    return '台湾省';
  }
  if (!p) return '';

  // 直辖市
  if (['北京', '天津', '上海', '重庆'].includes(p)) return p + '市';

  // 港澳台
  if (p === '香港') return '香港特别行政区';
  if (p === '澳门') return '澳门特别行政区';
  if (p === '台湾') return '台湾省';

  // 自治区
  if (p === '广西') return '广西壮族自治区';
  if (p === '内蒙古') return '内蒙古自治区';
  if (p === '宁夏') return '宁夏回族自治区';
  if (p === '新疆') return '新疆维吾尔自治区';
  if (p === '西藏') return '西藏自治区';

  // 已经有后缀就不处理
  if (
    p.endsWith('省') ||
    p.endsWith('市') ||
    p.endsWith('自治区') ||
    p.endsWith('特别行政区')
  ) {
    return p;
  }

  return p + '省';
}

function normalizeCity(v) {
  let c = cleanText(v).replace(/\s+/g, '');

  if (!c) return '';

  if (['HK', 'HKG', 'HongKong', 'Hong Kong', '香港'].includes(c)) {
  return '香港';
}

  if (['MO', 'Macau', 'Macao', '澳门'].includes(c)) {
    return '澳门';
  }

  if (['TW', 'Taiwan', '台湾'].includes(c)) {
    return '台湾';
  }

  if (
    c.endsWith('市') ||
    c.endsWith('区') ||
    c.endsWith('县') ||
    c.endsWith('州') ||
    c.endsWith('盟')
  ) {
    return c;
  }

  return c + '市';
}

function normalizeDistrict(v) {
  return cleanText(v).replace(/\s+/g, '');
}

function shortProvinceName(province) {
  let p = cleanText(province);

  // 国内显示不要“中国”，也不要“省”
  p = p.replace(/^中国\s*/g, '');

  if (p.endsWith('省')) return p.slice(0, -1);

  // 直辖市显示“北京/上海/重庆/天津”，避免变成“北京北京市”
  if (['北京市', '天津市', '上海市', '重庆市'].includes(p)) {
    return p.slice(0, -1);
  }

  // 自治区、特别行政区可以保留较短名称
  p = p
    .replace('壮族自治区', '')
    .replace('维吾尔自治区', '')
    .replace('回族自治区', '')
    .replace('自治区', '')
    .replace('特别行政区', '');

  return p;
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
        
        // 兼容新旧接口字段：ipwho.is / ip-api.com / 你自己 Worker 包装后的 data
const rawCountry = d.country || d.countryCode || d.country_code || '';
const rawCountryCode = d.countryCode || d.country_code || '';
const isChina = isChinaCountry(rawCountry) || isChinaCountry(rawCountryCode);

// 新接口可能是 prov，也可能是 region / regionName
let p = normalizeProvince(
  d.prov ||
  d.countryRegion ||
  d.region ||
  d.regionName ||
  d.countryCode ||
  d.country_code ||
  d.country ||
  ''
);

let c = normalizeCity(d.city || '');
let dis = normalizeDistrict(d.district || '');

// 如果省份被错误写成“中国 广东省”，上面的 normalizeProvince 会修成“广东省”
// 如果接口把 province 传成“中国”，但 region 里才是真省份，这里再兜底一次
if (p === '中国省' || p === '中国') {
  p = normalizeProvince(d.region || d.regionName || d.countryRegion || '');
}

// 经纬度兼容 lat/lng 和 latitude/longitude
const lat = parseFloat(d.lat ?? d.latitude) || 0;
const lng = parseFloat(d.lng ?? d.lon ?? d.longitude) || 0;

ipLocation = {
  ip: d.ip || d.query,
  location: {
    lat,
    lng
  },
  ad_info: {
    nation: isChina ? "中国" : (d.country || d.countryCode || d.country_code || "外国"),
    province: p,
    city: c,
    district: dis
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
    // 国内显示规则：广东深圳市，不显示“中国”，也不显示“省”
const shortProvince = shortProvinceName(province);

// 港澳台单独显示，避免显示成“HKG 香港”“香港 香港”
if (
  province === '香港特别行政区' ||
  province === 'HKG' ||
  province === 'HK' ||
  city === '香港'
) {
  province = '香港特别行政区';
  city = '香港';
  pos = `香港${district ? ' ' + district : ''}`.trim();
} else if (
  province === '澳门特别行政区' ||
  province === 'MO' ||
  city === '澳门'
) {
  province = '澳门特别行政区';
  city = '澳门';
  pos = `澳门${district ? ' ' + district : ''}`.trim();
} else if (province === '台湾省' || province === 'TW' || city === '台湾') {
  province = '台湾省';
  city = city || '台湾';
  pos = city && city !== '台湾'
    ? `台湾 ${city}${district ? ' ' + district : ''}`.trim()
    : '台湾';
} else if (
  ['北京市', '天津市', '上海市', '重庆市'].includes(province) &&
  city === province
) {
  pos = `${city}${district ? ' ' + district : ''}`.trim();
} else {
  pos = `${shortProvince} ${city}${district ? ' ' + district : ''}`.trim();
}
    
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
  const cityText = city ? " " + city : "";
  const geoText = [nation, province, city, district].filter(Boolean).join("|");

  const hasGeo = (arr) => arr.some(k => geoText.includes(k));

  if (hasGeo(["HK", "HKG", "HongKong", "Hong Kong", "香港"])) {
    pos = "香港"; desc = "东方之珠，夜景应该很好看吧~";
  } else if (hasGeo(["MO", "Macau", "Macao", "澳门"])) {
    pos = "澳门"; desc = "澳门风云，今天去走走逛逛了嘛？";
  } else if (hasGeo(["SG", "SGP", "Singapore", "新加坡"])) {
    pos = "新加坡"; desc = "花园城市的小伙伴，今天也很清爽呀~";
  } else {
    pos = city ? `${nation} ${city}` : nation;

    switch (nation) {
      case "US": case "United States": case "美国": pos = "美国" + cityText; desc = "Let us live in peace!"; break;
      case "JP": case "Japan": case "日本": pos = "日本" + cityText; desc = "よろしく，一起去看樱花吗"; break;
      case "UK": case "GB": case "United Kingdom": case "英国": pos = "英国" + cityText; desc = "想同你一起夜乘伦敦眼"; break;
      case "RU": case "Russia": case "俄罗斯": pos = "俄罗斯" + cityText; desc = "干了这瓶伏特加！"; break;
      case "FR": case "France": case "法国": pos = "法国" + cityText; desc = "C'est La Vie"; break;
      case "DE": case "Germany": case "德国": pos = "德国" + cityText; desc = "Die Zeit verging im Fluge."; break;
      case "AU": case "Australia": case "澳大利亚": pos = "澳大利亚" + cityText; desc = "一起去大堡礁吧！"; break;
      case "CA": case "Canada": case "加拿大": pos = "加拿大" + cityText; desc = "拾起一片枫叶赠予你"; break;

      case "MY": case "Malaysia": case "马来西亚": pos = "马来西亚" + cityText; desc = "椰风和咖喱香，今天也要开心呀~"; break;
      case "TH": case "Thailand": case "泰国": pos = "泰国" + cityText; desc = "萨瓦迪卡，今天也要微笑呀~"; break;
      case "KR": case "South Korea": case "Korea": case "韩国": pos = "韩国" + cityText; desc = "안녕하세요，一起去吃烤肉吗~"; break;
      case "VN": case "Vietnam": case "越南": pos = "越南" + cityText; desc = "来一碗越南粉，慢慢感受街头烟火气~"; break;
      case "ID": case "Indonesia": case "印度尼西亚": case "印尼": pos = "印度尼西亚" + cityText; desc = "千岛之国，海风一定很温柔吧~"; break;
      case "PH": case "Philippines": case "菲律宾": pos = "菲律宾" + cityText; desc = "海岛阳光正好，记得开心冲浪呀~"; break;
      case "IN": case "India": case "印度": pos = "印度" + cityText; desc = "恒河风吹来远方的故事~"; break;

      case "AE": case "UAE": case "United Arab Emirates": case "阿联酋": pos = "阿联酋" + cityText; desc = "沙漠与高楼相映，今天也很闪耀呀~"; break;
      case "SA": case "Saudi Arabia": case "沙特": case "沙特阿拉伯": pos = "沙特阿拉伯" + cityText; desc = "沙海辽阔，愿你今天一路顺风~"; break;
      case "TR": case "Turkey": case "Türkiye": case "土耳其": pos = "土耳其" + cityText; desc = "横跨欧亚的风，带来一点浪漫~"; break;

      case "IT": case "Italy": case "意大利": pos = "意大利" + cityText; desc = "披萨和古城都很浪漫呢~"; break;
      case "ES": case "Spain": case "西班牙": pos = "西班牙" + cityText; desc = "阳光、海岸和弗拉明戈，真不错呀~"; break;
      case "NL": case "Netherlands": case "荷兰": pos = "荷兰" + cityText; desc = "风车、郁金香和运河，都在向你问好~"; break;
      case "CH": case "Switzerland": case "瑞士": pos = "瑞士" + cityText; desc = "雪山湖泊之间，空气应该很清甜吧~"; break;
      case "SE": case "Sweden": case "瑞典": pos = "瑞典" + cityText; desc = "北欧的风很安静，愿你今天也从容~"; break;
      case "NO": case "Norway": case "挪威": pos = "挪威" + cityText; desc = "峡湾和极光都很美，真想去看看~"; break;
      case "FI": case "Finland": case "芬兰": pos = "芬兰" + cityText; desc = "森林与湖泊之间，今天也要温柔呀~"; break;

      case "NZ": case "New Zealand": case "新西兰": pos = "新西兰" + cityText; desc = "风吹过牧场和雪山，真想去看看~"; break;
      case "BR": case "Brazil": case "巴西": pos = "巴西" + cityText; desc = "桑巴节奏响起来，快乐也跟着来了~"; break;
      case "MX": case "Mexico": case "墨西哥": pos = "墨西哥" + cityText; desc = "热烈的阳光和玉米香气，今天也很有活力~"; break;
      case "ZA": case "South Africa": case "南非": pos = "南非" + cityText; desc = "好望角的风，应该也吹到了你那里~"; break;

      default: desc = "带我去你的国家逛逛吧"; break;
    }
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