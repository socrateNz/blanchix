import Link from "next/link";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";

export default function Hero() {
  return (
    <section>
      <Container className="max-w-2xl px-6 pb-6 pt-24 flex flex-col gap-2">
        <div className="flex flex-col items-start">
          <h1 className="font-display text-3xl font-bold text-white">Blanchix</h1>
          <p className="font-body text-xs text-gray-400">
            Le linge propre, sans le moindre déplacement.
          </p>
        </div>
        <Link
          href="/commander"
          className={buttonClasses("primary", "inline-block text-base w-fit")}
        >
          Laver maintenant
        </Link>
      </Container>
    </section>
  );
}
