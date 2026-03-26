type EventHandler<TPayload> = (payload: TPayload) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler<unknown>>>();

  on<TPayload>(eventName: string, handler: EventHandler<TPayload>): () => void {
    const eventHandlers = this.handlers.get(eventName) ?? new Set<EventHandler<unknown>>();
    eventHandlers.add(handler as EventHandler<unknown>);
    this.handlers.set(eventName, eventHandlers);

    return () => {
      eventHandlers.delete(handler as EventHandler<unknown>);
      if (eventHandlers.size === 0) {
        this.handlers.delete(eventName);
      }
    };
  }

  async emit<TPayload>(eventName: string, payload: TPayload): Promise<void> {
    const eventHandlers = this.handlers.get(eventName);
    if (!eventHandlers) {
      return;
    }

    for (const handler of eventHandlers) {
      await handler(payload);
    }
  }
}
