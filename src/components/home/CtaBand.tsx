import Link from "next/link";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";

export default function CtaBand() {
  return (
    <section>
      <Container className="flex flex-col items-center gap-5 py-16 text-center border-t border-slate-200">
        <h2 className="text-balance font-display text-xl font-extrabold sm:text-3xl">
          Prêt à passer commande ?
        </h2>
        <p className="max-w-md text-balance font-body text-md">
          Renseignez vos vêtements, choisissez un créneau, et laissez-nous faire le reste.
        </p>
        <Link href="/commander" className={buttonClasses("primary")}>
          Commander maintenant
        </Link>
      </Container>
    </section>
  );
}
