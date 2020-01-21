import { Transporter } from 'nodemailer';
export interface MailOptions {
    host: string;
    port: number;
    user: string;
    pass: string;
    mailSender: string;
    audiences: Array<string>;
}
export declare class TomMailSender {
    mailOptions: MailOptions;
    transporter: Transporter;
    receivers: string;
    constructor(options: MailOptions);
    sendMail(subject: string, content: string, isHTML?: boolean): void;
}
export declare class TomUtil {
    static log(log?: string): void;
    static error(error: any): void;
}
