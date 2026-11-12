import { CityCloud } from "@/components/city-cloud";
import { NewPoll } from "@/components/new-poll";

export default function Home() {
  return (
    <>
      <div className="home-intro">
        <h1>Ekipa głodna?<br /><span>Zdecydujcie razem.</span></h1>
        <p>Dodaj propozycje, wyślij link i sprawdź, na co macie ochotę. Bez kolejnych stu wiadomości na czacie.</p>
        <CityCloud />
      </div>
      <NewPoll runExperiment={process.env.VERCEL_ENV === "production"} />
    </>
  );
}
