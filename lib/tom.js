"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var axios_1 = require("axios");
var Cookie = /** @class */ (function () {
    function Cookie(cookie) {
        var _this = this;
        this.additions = ['additions', 'latitude', 'longitude', 'cookie', '_stringValue'];
        this.cookie = cookie;
        var a = cookie.split('; ');
        a.forEach(function (cookieValue) {
            if (cookieValue.indexOf('=') != -1) {
                var b = cookieValue.split('=');
                _this[b[0]] = b[1];
            }
        });
    }
    Object.defineProperty(Cookie.prototype, "stringValue", {
        get: function () {
            var _this = this;
            if (!this._stringValue) {
                var latlng = this.latlng || this.latlon;
                if (latlng && latlng.indexOf('%2C') !== -1) {
                    var latlngArray = latlng.split('%2C');
                    this.latitude = parseFloat(latlngArray[0]);
                    this.longitude = parseFloat(latlngArray[1]);
                    var timestamp = new Date().getTime();
                    this.latlon = this.latlng = this.latitude + '%2C' + this.longitude + '%2C' + timestamp;
                }
                var stringValue_1 = '';
                Object.keys(this).forEach(function (key) {
                    if (_this.additions.indexOf(key) === -1 && _this[key] != undefined) {
                        if (stringValue_1 !== '') {
                            stringValue_1 += '; ';
                        }
                        stringValue_1 += key + "=" + _this[key];
                    }
                });
                this._stringValue = stringValue_1;
            }
            return this._stringValue;
        },
        set: function (value) {
            utils_1.TomUtil.error('can set value:' + value);
        },
        enumerable: true,
        configurable: true
    });
    return Cookie;
}());
var TomInstance = /** @class */ (function () {
    function TomInstance(options) {
        // 可配置的一些变量
        // 开始时间 单位：minute 11:20 17:20
        this.startClocks = [11 * 60 + 20, 17 * 60 + 20, 20 * 60 + 20];
        // 持续时间 单位：minute
        this.continuousTime = 60;
        // 一轮请求请求的页数 每页10条 3*10=30条
        this.requestCount = 3;
        // 每条请求等待的时间 s
        this.requestDelay = 1;
        // 请求完一轮之后等待的时间 s
        this.requestRoundDelay = 5;
        this.usingClockIndex = -1;
        this.oneDayMs = 24 * 60 * 60 * 1000;
        // 请求结果
        this.roundResult = [];
        // 缓存已经推荐的卡券id
        this.cache = [];
        // 是否是第一轮请求，第一轮请求不发送邮件
        this.isFirstRequestRound = false;
        utils_1.TomUtil.log('tom is start');
        var self = this;
        this.cookie = new Cookie(options.cookie);
        if (!this.cookie.dpid) {
            utils_1.TomUtil.error('请使用正确的cookie');
        }
        this.url = options.url;
        this.mailsender = new utils_1.TomMailSender(options.mailOptions);
        this.startClocksMs = this.startClocks.map(function (v) {
            // 时区的原因这边要减八小时
            return (v - 8 * 60) * 60 * 1000;
        });
        this.terminationClocksMs = this.startClocksMs.map(function (v) {
            return v + self.continuousTime * 60 * 1000;
        });
        this.startPolling();
    }
    TomInstance.prototype.startPolling = function () {
        setInterval(this.polling(), 10 * 60 * 1000);
    };
    TomInstance.prototype.polling = function () {
        var self = this;
        var now = new Date();
        var timeInterval = now.getTime() - Math.floor(now.getTime() / this.oneDayMs) * this.oneDayMs;
        if (this.isRequesting) {
            // judge if time is beyond terminationClock
            if (this.usingClockIndex >= 0 && timeInterval > this.terminationClocksMs[this.usingClockIndex]) {
                this.isRequesting = false;
                this.usingClockIndex = -1;
                clearInterval(this.requestTimer);
            }
        }
        else {
            var breakFlag = false;
            this.startClocksMs.forEach(function (v, i) {
                if (breakFlag) {
                    return;
                }
                // judge if time is during startClock and terminationClock
                if (timeInterval > v && timeInterval < self.terminationClocksMs[i]) {
                    self.isRequesting = true;
                    self.usingClockIndex = i;
                    var requestRoundTimeout = (self.requestCount * self.requestDelay + self.requestRoundDelay) * 1000;
                    self.requestTimer = setInterval(self.startRequestRound(requestRoundTimeout - 1000), requestRoundTimeout);
                    breakFlag = true;
                }
            });
        }
        utils_1.TomUtil.log();
        return this.polling.bind(this);
    };
    TomInstance.prototype.startRequestRound = function (exportTimeOut) {
        var self = this;
        this.roundResult = [];
        var internalRequestCount = this.requestCount;
        var _loop_1 = function () {
            var page = this_1.requestCount - internalRequestCount;
            var timeout = page * this_1.requestDelay;
            setTimeout(function () {
                self.request(page);
            }, timeout);
            internalRequestCount--;
        };
        var this_1 = this;
        while (internalRequestCount > 0) {
            _loop_1();
        }
        new Promise(function (resolve) {
            setTimeout(function () {
                resolve();
            }, exportTimeOut - 1000);
        }).then(function () {
            self.exportResult();
            self.isFirstRequestRound = false;
        });
        return this.startRequestRound.bind(this);
    };
    TomInstance.prototype.request = function (page) {
        var self = this;
        var cookie = this.cookie;
        var cookieStr = this.cookie.stringValue;
        var data = {
            lat: cookie.latitude,
            lng: cookie.longitude,
            appCityId: 3,
            locatedCityId: 3,
            dpId: cookie.dpid,
            page: page,
            pageSize: 10,
            couponCategory: 1
        };
        var requestRoundDelay = this.requestRoundDelay;
        axios_1.default({
            url: self.url,
            method: 'post',
            headers: {
                'Host': 'm.dianping.com',
                'Content-Type': 'application/json',
                'Cookie': cookieStr,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 TitansNoX/11.18.40 KNB/1.0 iOS/13.1 App/10210/10.19.1 dp/com.dianping.dpscope/10.19.1 dp/10.19.1 iPhone/iPhoneX WKWebView',
                'Connection': 'keep-alive',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-LanguageL': 'zh-cn',
            },
            data: data,
            timeout: requestRoundDelay * 1000
        }).then(function (response) {
            var data = response.data;
            if (data && data.code == 200) {
                // success
                var discountCouponList = data.data.data.discountCouponList;
                if (discountCouponList && discountCouponList.length) {
                    discountCouponList.forEach(function (v) {
                        var couponStatus = v.commonCouponDTO.couponStatus;
                        if (couponStatus === 1) {
                            var coupon = {
                                couponId: v.commonCouponDTO.couponId,
                                couponName: v.commonCouponDTO.couponName,
                                discountCost: v.commonCouponDTO.discountCost,
                                distance: v.shopBaseInfo.distance
                            };
                            self.recordCoupon(coupon);
                        }
                    });
                }
            }
        }).catch(function (error) {
            utils_1.TomUtil.error(error);
        });
    };
    TomInstance.prototype.recordCoupon = function (coupon) {
        try {
            if (this.cache.indexOf(coupon.couponId) > -1) {
                // find in cache
                return;
            }
            if (coupon.distance.indexOf('>') != -1 || parseFloat(coupon.distance) > 13) {
                // too far
                return;
            }
        }
        catch (error) {
            utils_1.TomUtil.error(error);
            return;
        }
        this.cache.push(coupon.couponId);
        this.roundResult.push(coupon);
    };
    TomInstance.prototype.exportResult = function () {
        if (!this.isFirstRequestRound && this.roundResult.length > 0) {
            var content_1 = '';
            this.roundResult.forEach(function (coupon) {
                content_1 += coupon.couponName + "\uFF0C\u8DDD\u79BB\uFF1A" + coupon.distance + "\uFF0C\u4EF7\u683C\uFF1A" + coupon.discountCost + "\n";
            });
            this.roundResult = [];
            this.mailsender.sendMail('好券推荐', content_1);
            utils_1.TomUtil.log(content_1);
        }
    };
    return TomInstance;
}());
var Tom = function (options) {
    new TomInstance(options);
};
exports.default = Tom;
//# sourceMappingURL=tom.js.map