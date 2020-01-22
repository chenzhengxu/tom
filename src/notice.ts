const Axios = require('axios')

export default class NoticeUtils {
  static noticeDing(content) {
    Axios({
      method: 'post',
      url: 'https://oapi.dingtalk.com/robot/send?access_token=9796fa03f9d617b9c0d1e0f9c1d29a337755051f53df94d52f105ad2e5a13dd0',
      data: {
        text: {
          content: `好券推荐: ${content}`
        },
        msgtype: 'text',
      }
    }).then((res) => {
      console.log('第二种', res)
    })
  }
}



