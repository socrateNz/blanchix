import Container from "@/components/ui/Container";

const ETAPES = [
  {
    titre: "Vous passez commande en ligne",
    description: "Renseignez vos vêtements, votre adresse et le créneau qui vous arrange — en moins de 3 minutes.",
  },
  {
    titre: "Nous récupérons votre linge",
    description: "Un coursier Blanchix passe chez vous, au créneau de collecte que vous avez choisi.",
  },
  {
    titre: "Nous le lavons et le repassons",
    description: "Votre linge est traité en atelier par notre équipe : lavage professionnel puis repassage soigné.",
  },
  {
    titre: "Nous vous le livrons",
    description: "Votre linge propre revient chez vous, dans le délai que vous avez sélectionné.",
  },
];

export default function StepsExplainer() {
  return (
    <section className="py-20">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPES.map((etape, index) => (
            <div key={etape.titre} className="relative">
              <div className="bg-brand-gradient flex h-11 w-11 items-center justify-center rounded-full font-display text-lg font-extrabold text-white">
                {index + 1}
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-marine">{etape.titre}</h3>
              <p className="mt-2 font-body text-sm text-ardoise">{etape.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
