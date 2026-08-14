import Container from "@/components/ui/Container";

const PILIERS = [
  {
    titre: "Collecte à domicile",
    description: "Un coursier récupère votre linge à l'adresse et au créneau de votre choix.",
    icon: (
      <path d="M4 21V10.5L12 4l8 6.5V21H4Z M9 21v-6h6v6" />
    ),
  },
  {
    titre: "Lavage professionnel",
    description: "Traitement en atelier, adapté à chaque type de tissu.",
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="12" cy="13" r="5" />
        <circle cx="12" cy="13" r="1.6" />
      </>
    ),
  },
  {
    titre: "Repassage de finition",
    description: "Chaque pièce est repassée avec soin avant livraison.",
    icon: <path d="M3 8h13l4 3.5V16a2 2 0 0 1-2 2H9 M3 8v9a1 1 0 0 0 1 1h3" />,
  },
  {
    titre: "Livraison à domicile",
    description: "Votre linge propre revient directement chez vous.",
    icon: (
      <>
        <path d="M5 17h14M6 17V8l7-1 3 4h2a2 2 0 0 1 2 2v4h-2" />
        <circle cx="8" cy="19" r="1.8" />
        <circle cx="17" cy="19" r="1.8" />
      </>
    ),
  },
];

export default function Piliers() {
  return (
    <section className="py-8">
      <Container>
        <p className="font-display text-xl font-extrabold text-center mb-4">{"Nous vous satisfaisons en 4 étapes"}</p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {PILIERS.map((pilier) => (
            <div
              key={pilier.titre}
              className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm transition-shadow hover:shadow-md flex flex-col items-center justify-center"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-bleu/10">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 stroke-bleu"
                >
                  {pilier.icon}
                </svg>
              </span>
              <h4 className="mt-4 font-display text-md text-center font-bold text-marine">{pilier.titre}</h4>
              {/* <p className="mt-2 font-body text-sm text-ardoise">{pilier.description}</p> */}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
