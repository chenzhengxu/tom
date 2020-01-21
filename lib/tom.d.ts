import { MailOptions } from './utils';
export interface TomOptions {
    cookie: string;
    url: string;
    mailOptions: MailOptions;
}
export interface TomStatic {
    (options: TomOptions): void;
}
declare const Tom: TomStatic;
export default Tom;
