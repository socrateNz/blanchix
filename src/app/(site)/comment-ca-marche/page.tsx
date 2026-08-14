import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";
import StepsExplainer from "@/components/comment-ca-marche/StepsExplainer";

export const metadata: Metadata = {
  title: "Comment ça fonctionne — Blanchix",
  description: "Le parcours Blanchix en 4 étapes : commande, collecte, lavage/repassage, livraison.",
};

export default function CommentCaMarche() {
  return (
    <main>
      <section className="bg-brume">
        <Container className="pb-16 pt-28 text-center">
          <h1 className="font-display text-3xl font-extrabold text-marine sm:text-4xl">
            Comment ça fonctionne ?
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-body text-ardoise">
            Quatre étapes simples entre votre commande et la livraison de votre linge propre.
          </p>
        </Container>
      </section>

      <StepsExplainer />

      <section className="pb-20 text-center">
        <Link href="/commander" className={buttonClasses("primary", "!px-8 !py-4 text-base")}>
          Commander maintenant
        </Link>
      </section>
    </main>
  );
}
