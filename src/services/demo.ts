/** Demo-only controls, shown in the dev panel. Not part of the Phase 2 API. */
export interface DemoControls {
  /** Wipes demo bookings, orders and waitlists, and restores the seed. */
  reset(): Promise<void>;
  /** Ends every live table hold and ticket hold now, to show what happens when time runs out. */
  expireHolds(): Promise<number>;
  /** Someone with a sample ticket cancels: one seat opens and goes to the waitlist first. Returns seats now free. */
  openSeat(eventSlug: string): Promise<number>;
}
