export type SmsProviderPayload = {
  tenantId: string;
  to: string;
  body: string;
  senderId?: string | null;
  eventType: string;
};

export type SmsProviderResult = {
  provider_message_id: string | null;
};

export interface SmsProvider {
  send(input: SmsProviderPayload): Promise<SmsProviderResult>;
}

type SmsProviderConfig = {
  provider: "disabled" | "log";
  senderId?: string;
  apiKey?: string;
};

type LoggerLike = {
  info: (details: Record<string, unknown>, message: string) => void;
};

class LoggingSmsProvider implements SmsProvider {
  constructor(
    private readonly config: SmsProviderConfig,
    private readonly logger: LoggerLike,
  ) {}

  async send(input: SmsProviderPayload): Promise<SmsProviderResult> {
    const providerMessageId = `sms-log:${input.eventType}:${Date.now()}`;

    this.logger.info(
      {
        tenantId: input.tenantId,
        to: input.to,
        senderId: input.senderId ?? this.config.senderId ?? null,
        eventType: input.eventType,
        smsApiKeyConfigured: Boolean(this.config.apiKey),
        body: input.body,
        providerMessageId,
      },
      "SMS delivery is running in logging mode; no external provider request was made",
    );

    return {
      provider_message_id: providerMessageId,
    };
  }
}

export const createSmsProvider = (config: SmsProviderConfig, logger: LoggerLike): SmsProvider | null => {
  if (config.provider === "disabled") {
    return null;
  }

  return new LoggingSmsProvider(config, logger);
};
