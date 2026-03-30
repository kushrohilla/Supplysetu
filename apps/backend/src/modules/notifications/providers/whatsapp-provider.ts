export type WhatsAppProviderPayload = {
  tenantId: string;
  to: string;
  body: string;
  senderId?: string | null;
  eventType: string;
};

export type WhatsAppProviderResult = {
  provider_message_id: string | null;
};

export interface WhatsAppProvider {
  send(input: WhatsAppProviderPayload): Promise<WhatsAppProviderResult>;
}

type WhatsAppProviderConfig = {
  provider: "disabled" | "log";
  senderId?: string;
  apiKey?: string;
};

type LoggerLike = {
  info: (details: Record<string, unknown>, message: string) => void;
};

class LoggingWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly config: WhatsAppProviderConfig,
    private readonly logger: LoggerLike,
  ) {}

  async send(input: WhatsAppProviderPayload): Promise<WhatsAppProviderResult> {
    const providerMessageId = `whatsapp-log:${input.eventType}:${Date.now()}`;

    this.logger.info(
      {
        tenantId: input.tenantId,
        to: input.to,
        senderId: input.senderId ?? this.config.senderId ?? null,
        eventType: input.eventType,
        whatsappApiKeyConfigured: Boolean(this.config.apiKey),
        body: input.body,
        providerMessageId,
      },
      "WhatsApp delivery is running in logging mode; no external provider request was made",
    );

    return {
      provider_message_id: providerMessageId,
    };
  }
}

export const createWhatsAppProvider = (config: WhatsAppProviderConfig, logger: LoggerLike): WhatsAppProvider | null => {
  if (config.provider === "disabled") {
    return null;
  }

  return new LoggingWhatsAppProvider(config, logger);
};
