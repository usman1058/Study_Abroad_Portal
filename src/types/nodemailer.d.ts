declare module "nodemailer" {
  type TransportOptions = {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
  };

  type TextMessage = {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    text: string;
    html?: string;
  };

  type Transporter = {
    sendMail(message: TextMessage): Promise<unknown>;
    close(): void;
  };

  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };

  export default nodemailer;
}
