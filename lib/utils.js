"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nodemailer_1 = require("nodemailer");
var TomMailSender = /** @class */ (function () {
    function TomMailSender(options) {
        this.mailOptions = options;
        this.transporter = nodemailer_1.createTransport({
            host: options.host,
            port: options.port,
            secure: true,
            auth: {
                user: options.user,
                pass: options.pass
            }
        });
        this.receivers = this.mailOptions.audiences.join(', ');
    }
    TomMailSender.prototype.sendMail = function (subject, content, isHTML) {
        var _this = this;
        if (isHTML === void 0) { isHTML = false; }
        var sendMailOptions = {
            from: this.mailOptions.mailSender,
            to: this.receivers,
            subject: subject
        };
        if (isHTML) {
            sendMailOptions.html = content;
        }
        else {
            sendMailOptions.text = content;
        }
        this.transporter.sendMail(sendMailOptions, function (error, info) {
            if (error) {
                console.error("ERROR: Fail send email. " + error);
            }
            else {
                console.log("Success send mail to " + _this.receivers);
            }
        });
    };
    return TomMailSender;
}());
exports.TomMailSender = TomMailSender;
function timeNow() {
    return formatDate(new Date());
}
var TomUtil = /** @class */ (function () {
    function TomUtil() {
    }
    TomUtil.log = function (log) {
        console.log(timeNow());
        if (log) {
            console.log(log);
        }
    };
    TomUtil.error = function (error) {
        console.log(timeNow());
        if (error) {
            console.error(error);
        }
    };
    return TomUtil;
}());
exports.TomUtil = TomUtil;
function formatDate(date) {
    var fmt = "yyyy-MM-dd HH:mm:ss";
    var o = {
        "M+": date.getMonth() + 1,
        "d+": date.getDate(),
        "H+": date.getHours(),
        "m+": date.getMinutes(),
        "s+": date.getSeconds(),
        "q+": Math.floor((date.getMonth() + 3) / 3),
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
//# sourceMappingURL=utils.js.map