import Link from "next/link";

export default function NotFound() {
  return <section className="form-sheet status-sheet"><h1>Tu nie ma głosowania</h1><p>Sprawdź, czy masz cały link. Możesz też zacząć nowe głosowanie dla swojej ekipy.</p><Link className="button primary" href="/">Wróć na stronę główną</Link></section>;
}
