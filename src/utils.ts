import {Transporter, createTransport, SendMailOptions} from 'nodemailer'

export interface MailOptions {
  host: string;
  port: number;
  user: string;
  pass: string;
  mailSender: string;
  audiences: Array<string>;
}

export class TomMailSender {
  mailOptions: MailOptions;
  transporter: Transporter;
  receivers: string;

  constructor(options: MailOptions) {
    this.mailOptions = options
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      secure: true,
      auth: {
        user: options.user,
        pass: options.pass
      }
    })
    this.receivers = this.mailOptions.audiences.join(', ')
  }
  sendMail(subject: string, content: string, isHTML: boolean = false) {
    let sendMailOptions: SendMailOptions = {
      from: this.mailOptions.mailSender,
      to: this.receivers,
      subject: subject
    }
    if (isHTML) {
      sendMailOptions.html = content
    } else {
      sendMailOptions.text = content
    }
    this.transporter.sendMail(sendMailOptions, (error, info) => {
      if (error) {
        console.error("ERROR: Fail send email. " + error)
      } else {
        console.log(`Success send mail to ${this.receivers}`);
      }
    })
  }
}

function timeNow() {
  return formatDate(new Date())
}

export class TomUtil {
  static log(log?: string) {
    console.log(timeNow())
    if (log) {
      console.log(log)
    }
  }
  static error(error: any) {
    console.log(timeNow())
    if (error) {
      console.error(error)
    }
  }
}

function formatDate(date: Date) {
  var fmt: string = "yyyy-MM-dd HH:mm:ss"
  var o: object = {
    "M+": date.getMonth() + 1, //月份 
    "d+": date.getDate(), //日 
    "H+": date.getHours(), //小时 
    "m+": date.getMinutes(), //分 
    "s+": date.getSeconds(), //秒 
    "q+": Math.floor((date.getMonth() + 3) / 3), //季度 
    "S": date.getMilliseconds() //毫秒 
  };
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
  }
  for (var k in o) {
    if (new RegExp("(" + k + ")").test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    }
  }
  return fmt;
}
