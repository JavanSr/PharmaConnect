declare module 'africastalking' {
  interface AfricasTalkingOptions {
    username: string;
    apiKey: string;
  }

  interface SendSmsOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface SmsService {
    send(options: SendSmsOptions): Promise<unknown>;
  }

  interface AfricasTalkingInstance {
    SMS: SmsService;
  }

  function AfricasTalking(options: AfricasTalkingOptions): AfricasTalkingInstance;

  export = AfricasTalking;
}
