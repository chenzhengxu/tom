import { TomMailSender, MailOptions, TomUtil } from './utils'
import Axios from 'axios'

class Cookie {
  latlng: string;
  latlon: string;
  network: string;
  _lxsdk_s: string;
  cityid: number;
  dper: string;
  dpid: string;
  _lx_utm: string;
  dp_pwa_v_: string;
  '_hc.v': string;
  _lxsdk_dpid: string;
  ci: number;
  __mta: string;
  _lxsdk: string;
  _lxsdk_cuid: string;
  _lxsdk_unoinid: string;
  // additions
  latitude: number;
  longitude: number;
  cookie: string;
  _stringValue: string;
  additions: Array<string> = ['additions', 'latitude', 'longitude', 'cookie', '_stringValue']
  
  constructor(cookie: string) {
    this.cookie = cookie
    let a: Array<string> = cookie.split('; ')
    a.forEach((cookieValue) => {
      if (cookieValue.indexOf('=') != -1) {
        let b: Array<string> = cookieValue.split('=')
        this[b[0]] = b[1]
      }
    })
  }

  get stringValue() {
    if (!this._stringValue) {
      let latlng: string = this.latlng || this.latlon
      if (latlng && latlng.indexOf('%2C') !== -1) {
        let latlngArray = latlng.split('%2C')
        this.latitude = parseFloat(latlngArray[0])
        this.longitude = parseFloat(latlngArray[1])
        let timestamp = new Date().getTime()
        this.latlon = this.latlng = this.latitude + '%2C' + this.longitude + '%2C' + timestamp
      }
      let stringValue: string = ''
      Object.keys(this).forEach((key) => {
        if (this.additions.indexOf(key) === -1 && this[key] != undefined) {
          if (stringValue !== '') {
            stringValue += '; '
          }
          stringValue += `${key}=${this[key]}`
        }
      })
      this._stringValue = stringValue
    }
    return this._stringValue
  }

  set stringValue(value) {
    TomUtil.error('can set value:' + value)
  }
}

interface Coupon {
  couponId: string;
  couponName: string;
  discountCost: string;
  distance: string;
}

class TomInstance {
  // 可配置的一些变量
  // 开始时间 单位：minute 11:20 17:20
  startClocks: Array<number> = [11*60+20, 17*60+20, 20*60+20];
  // 持续时间 单位：minute
  continuousTime: number = 60;
  // 一轮请求请求的页数 每页10条 3*10=30条
  requestCount: number = 3;
  // 每条请求等待的时间 s
  requestDelay: number = 1;
  // 请求完一轮之后等待的时间 s
  requestRoundDelay: number = 5;

  // cookie对象
  cookie: Cookie;
  // 是否正在请求中
  isRequesting: boolean;
  // 请求的timer
  requestTimer: number;
  // 时间相关
  startClocksMs: Array<number>;
  terminationClocksMs: Array<number>;
  usingClockIndex: number = -1;
  oneDayMs: number = 24 * 60 * 60 * 1000;
  // 请求结果
  roundResult: Array<Coupon> = [];
  // 缓存已经推荐的卡券id
  cache: Array<string> = [];
  // 是否是第一轮请求，第一轮请求不发送邮件
  isFirstRequestRound: boolean = false;
  // 邮件
  mailsender: TomMailSender;
  // 请求地址
  url: string;

  constructor(options: TomOptions) {
    TomUtil.log('tom is start')
    var self = this
    this.cookie = new Cookie(options.cookie)
    if (!this.cookie.dpid) {
      TomUtil.error('请使用正确的cookie')
    }
    this.url = options.url
    this.mailsender = new TomMailSender(options.mailOptions)
    this.startClocksMs = this.startClocks.map(function(v) {
      // 时区的原因这边要减八小时
      return (v - 8 * 60 ) * 60 * 1000
    })
    this.terminationClocksMs = this.startClocksMs.map(function(v) {
      return v + self.continuousTime * 60 *1000
    })
    this.startPolling()
  }
  startPolling() {
    setInterval(this.polling(), 10*60*1000)
  }
  polling() : Function {
    var self = this
    let now: Date = new Date()
    let timeInterval = now.getTime() - Math.floor(now.getTime() / this.oneDayMs) * this.oneDayMs
    if (this.isRequesting) {
      // judge if time is beyond terminationClock
      if (this.usingClockIndex >= 0 && timeInterval > this.terminationClocksMs[this.usingClockIndex]) {
        this.isRequesting = false
        this.usingClockIndex = -1
        clearInterval(this.requestTimer)
      }
    } else {
      var breakFlag = false
      this.startClocksMs.forEach((v, i) => {
        if (breakFlag) {
          return
        }
        // judge if time is during startClock and terminationClock
        if (timeInterval > v && timeInterval < self.terminationClocksMs[i]) {
          self.isRequesting = true
          self.usingClockIndex = i
          let requestRoundTimeout = (self.requestCount * self.requestDelay + self.requestRoundDelay) * 1000
          self.requestTimer = setInterval(self.startRequestRound(requestRoundTimeout-1000), requestRoundTimeout)
          breakFlag = true
        }
      })
    }
    TomUtil.log()
    return this.polling.bind(this)
  }
  startRequestRound(exportTimeOut: number) : Function {
    var self = this
    this.roundResult = []
    let internalRequestCount: number = this.requestCount
    while (internalRequestCount > 0) {
      let page: number = this.requestCount - internalRequestCount
      let timeout: number = page * this.requestDelay
      setTimeout(() => {
        self.request(page)
      }, timeout);
      internalRequestCount--;
    }
    new Promise(function(resolve) {
      setTimeout(() => {
        resolve()
      }, exportTimeOut-1000);
    }).then(function() {
      self.exportResult()
      self.isFirstRequestRound = false
    })
    return this.startRequestRound.bind(this)
  }
  request(page: number) {
    var self = this
    let cookie = this.cookie
    let cookieStr = this.cookie.stringValue
    let data = {
      lat: cookie.latitude,
      lng: cookie.longitude,
      appCityId: 3,
      locatedCityId: 3,
      dpId: cookie.dpid,
      page: page,
      pageSize: 10,
      couponCategory: 1
    }
    let requestRoundDelay = this.requestRoundDelay
    Axios({
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
    }).then(function(response) {
      let data = response.data
      if (data && data.code == 200) {
        // success
        let discountCouponList: Array<any> = data.data.data.discountCouponList
        if (discountCouponList && discountCouponList.length) {
          discountCouponList.forEach(function(v) {
            let couponStatus = v.commonCouponDTO.couponStatus
            if (couponStatus === 1) {
              let coupon: Coupon = {
                couponId: v.commonCouponDTO.couponId,
                couponName: v.commonCouponDTO.couponName,
                discountCost: v.commonCouponDTO.discountCost,
                distance: v.shopBaseInfo.distance
              }
              self.recordCoupon(coupon)
            }
          })
        }
      }
    }).catch(function(error) {
      TomUtil.error(error)
    })
  }
  recordCoupon(coupon: Coupon) {
    try {
      if (this.cache.indexOf(coupon.couponId) > -1) {
        // find in cache
        return
      }
      if (coupon.distance.indexOf('>') != -1 || parseFloat(coupon.distance) > 13) {
        // too far
        return
      }
    } catch (error) {
      TomUtil.error(error)
      return
    }
    this.cache.push(coupon.couponId)
    this.roundResult.push(coupon)
  }
  exportResult() {
    if (!this.isFirstRequestRound && this.roundResult.length > 0) {
      let content: string = ''
      this.roundResult.forEach((coupon) => {
        content += `${coupon.couponName}，距离：${coupon.distance}，价格：${coupon.discountCost}\n`
      })
      this.roundResult = []
      this.mailsender.sendMail('好券推荐', content)
      TomUtil.log(content)
    }
  }
}

export interface TomOptions {
  cookie: string;
  url: string;
  mailOptions: MailOptions;
}

export interface TomStatic {
  (options: TomOptions): void;
}

const Tom: TomStatic = (options: TomOptions) => {
  new TomInstance(options)
}

export default Tom
