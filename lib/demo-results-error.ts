// Kontrolowana usterka do lekcji monitoringu. Włączana wyłącznie flagą demo.
export class PollResultsDemoError extends Error {
  readonly optionCount = 5;

  constructor() {
    super("POLL_RESULTS_RENDER_FAILED: nie można wyświetlić wyników dla 5 propozycji.");
    this.name = "PollResultsDemoError";
  }
}
