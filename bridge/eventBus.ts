
type Listener = (...args: any[]) => void;

class EventBus {
  private events: { [key: string]: Listener[] } = {};

  /**
   * Subscribes a listener to an event.
   * @param event The event name to subscribe to.
   * @param listener The callback function to execute.
   * @returns A function to unsubscribe the listener.
   */
  public on(event: string, listener: Listener): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    // Return an unsubscribe function for easy cleanup
    return () => this.off(event, listener);
  }

  /**
   * Unsubscribes a listener from an event.
   * @param event The event name.
   * @param listener The listener function to remove.
   */
  public off(event: string, listener: Listener): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  /**
   * Emits an event, calling all subscribed listeners.
   * @param event The event name to emit.
   * @param args The arguments to pass to the listeners.
   */
  public emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    // Call listeners in a new array slice to prevent issues if a listener unsubscribes itself
    this.events[event].slice().forEach(listener => listener(...args));
  }
}

// Export a singleton instance to be used throughout the application
export const gameBus = new EventBus();
