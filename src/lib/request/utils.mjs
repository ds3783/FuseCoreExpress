/**
 * Created by ds3783 on 2017/5/18.
 * Request Utils
 */


/*
 * getUAInfo
 * 
 * return object like:
 * {
 *   isBot:false,
 *   isWinPhone:false,
 *   isIPhone:false,
 *   isIPad:false,
 *   isAndroid:false,
 *   isAndroidTablet:false,
 *   isTablet:false,
 *   isOtherMobile:false,
 *   isMobile:false,
 *   isWechatMiniProg:false,
 *   platform:"windows"|"ios"|"android"|"linux"|"macos"|"whatsapp"|"compatible"|"unknown",
 *   platformVersion:"10.3.1",
 *   browser:"msie"|"opera"|"firefox"|"chrome"|"facebook"|"weixin"|"safari"|"unknown",
 *   browserVersion:"10.3.1"
 * }
 * 
 * */
export function getUAInfo(req) {
    let ua = req.get('user-agent') || '';
    let result = {};
    result.isBot = /Sogou|sogou|trovit|ahrefs|semrush|Baiduspider|YisouSpider|MJ12bot|Daum|facebookexternalhit|crawler|LivelapBot|robot|spider|bingbot|trovitBot|Slurp|YandexBot|Googlebot|Applebot|okhttp|SocialRankIOBot|Twitterbot|Google Favicon|GrapeshotCrawler/.test(ua);

    result.isWinPhone = /Windows Phone/.test(ua);
    result.isIPhone = !result.isWinPhone && /iPhone;/.test(ua);
    result.isIPad = !result.isWinPhone && (/iPad;/.test(ua));
    result.isAndroid = !result.isWinPhone && /android/i.test(ua);
    result.isAndroidTablet = result.isAndroid && !/mobile/i.test(ua);
    result.isWechatMiniProg = /\sminiProgram/.test(ua);
    result.isTablet= result.isIPad || result.isAndroidTablet;
    result.isOtherMobile = !result.isWinPhone &&
        !result.isIPhone &&
        !result.isIPad &&
        !result.isAndroid &&
        /Mobile/.test(ua);

    result.isMobile = result.isWinPhone || result.isIPhone || result.isIPad || result.isAndroid || result.isOtherMobile;

    let platform = /Windows NT ([\d.]+)/.exec(ua);
    if (platform) {
        result.platform = 'windows';
        result.platformVersion = platform[1];
    } else if ((platform = /Android ([\d.]+)/.exec(ua))) {
        result.platform = 'android';
        result.platformVersion = platform[1];
    } else if ((platform = /CPU (iPhone )?OS ([\d_]+)/.exec(ua))) {
        result.platform = 'ios';
        result.platformVersion = platform[2].replace(/_/g, '.');
    } else if (/Linux/.test(ua)) {
        result.platform = 'linux';
        result.platformVersion = '';
    } else if ((platform = /Macintosh;.* Mac OS[^\d]*([\d_]+)/.exec(ua))) {
        result.platform = 'macos';
        result.platformVersion = platform[1].replace(/_/g, '.');
    } else if ((platform = /WhatsApp\/([\d.]+)/.exec(ua))) {
        result.platform = 'whatsapp';
        result.platformVersion = platform[1];
    } else if (/compatible/.test(ua)) {
        result.platform = 'compatible';
        result.platformVersion = '';
    } else {
        result.platform = 'unknown';
        result.platformVersion = '';
    }

    //browser
    //browserVersion
    let browser;
    if ((browser = /MSIE ([\d.]+)/.exec(ua))) {
        result.browser = 'msie';
        result.browserVersion = browser[1];
    } else if ((browser = /Trident\/7.0/.exec(ua))) {
        result.browser = 'msie';
        result.browserVersion = '11';
    } else if ((browser = /Edge\/([\d.]+)/.exec(ua))) {
        result.browser = 'msie';
        result.browserVersion = browser[1];
    } else if ((browser = /OPR\/([\d.]+)/.exec(ua))) {
        result.browser = 'opera';
        result.browserVersion = browser[2];
    } else if ((browser = /(Chrome|CriOS|Chromium)\/([\d.]+)/.exec(ua))) {
        result.browser = 'chrome';
        result.browserVersion = browser[2];
    } else if ((browser = /Firefox\/([\d.]+)/.exec(ua))) {
        result.browser = 'firefox';
        result.browserVersion = browser[1];
    } else if ((browser = /FBAV\/([\d.]+)/.exec(ua))) {
        result.browser = 'facebook';
        result.browserVersion = browser[1];
    } else if ((browser = /MicroMessenger\/([\d.]+)/.exec(ua))) {
        result.browser = 'weixin';
        result.browserVersion = browser[1];
    } else if ((browser = /WeChat\/([\d.]+)/.exec(ua))) {
        result.browser = 'weixin';
        result.browserVersion = browser[1];
    } else if ((browser = /Safari\/([\d.]+)/.exec(ua))) {
        result.browser = 'safari';
        result.browserVersion = browser[1];
    } else {
        result.browser = 'unknown';
        result.browserVersion = '';
    }

    return result;
}

/*
 * getLangInfo
 * 
 * return object like:
 * {
 *   languages:{
 *      "zh-CN":"0,8",
 *      "en":"0,6"
 *   },
 *   primaryLanguage:["zh-CN"],
 *   isEnglish:false,
 *   lang:"zh-cn"|"en"
 * }
 * 
 * */
export function getLangInfo(req, is4PC) {
    let result = {
        languages: {},
        primaryLanguage: [],
        isEnglish: false,
        lang: ''
    };

    let lang = req.get('accept-language') || '';
    //zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4
    let langs = [], q, max_q = 0;
    if (lang) {
        let langSplits = lang.split(/[,;]/);
        for (let item of langSplits) {
            if (!/^([\w-=.\d]+)$/.test(item)) {
                continue;
            }
            if ((q = /^q=([\d.]+)$/.exec(item))) {
                langs.forEach(function (it) {
                    if (!!it) {
                        result.languages[it] = q[1];
                    }
                });
                langs = [];
                max_q = Math.max(max_q, 1 * q[1]);
            } else {
                langs.push(item);
            }
        }
    }
    if (langs.length) {
        langs.forEach(function (item) {
            if (!!item) {
                result.languages[item] = 1;
            }
        });
        max_q = Math.max(max_q, 1);
    }

    Object.keys(result.languages).forEach(function (key) {
        let q = result.languages[key];
        if (1 * q === max_q) {
            result.primaryLanguage.push(key);
        }
    });


    if (is4PC) {
        if (!!req.cookies['N1']) {
            result.isEnglish = req.cookies['N1'] !== 'zh-cn';
        } else {
            result.isEnglish = true;
        }
    } else {
        result.isEnglish = true;
        result.primaryLanguage.forEach(function (lang) {
            if (/^zh-/.test(lang)) {
                result.isEnglish = false;
            }
        });
    }
    result.lang = result.isEnglish ? 'en' : 'zh-cn';
    return result;
}
 