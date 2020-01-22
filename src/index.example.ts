import Tom from './tom'

let cookie = '' // @chen
Tom({
  cookie: cookie,
  url: 'https://m.dianping.com/activity-util/disney/421',
  mailOptions: {
    host: 'smtp.163.com',
    port: 465,
    user: 'czxsdk1@163.com',
    pass: 'Abc123456',
    mailSender: '好券推荐 <czxsdk1@163.com>',
    audiences: ['994516742@qq.com', '1842269215@qq.com'],
  }
})
