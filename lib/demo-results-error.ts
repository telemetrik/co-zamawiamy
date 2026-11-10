// Przełącz w kodzie: true = regresja demo, false = poprawne wyniki.
export const DEMO_RESULTS_ERROR_ENABLED = true;

// Kontrolowana usterka do lekcji monitoringu.
export class PollResultsDemoError extends Error {
  readonly optionCount = 5;

  constructor() {
    super("POLL_RESULTS_RENDER_FAILED: nie można wyświetlić wyników dla 5 propozycji.");
    this.name = "PollResultsDemoError";
  }
}
