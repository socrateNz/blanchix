import Logo from "@/components/brand/Logo";
import Container from "@/components/ui/Container";

export default function Footer() {
  return (
    <footer className="bg-marine">
      <Container className="flex flex-col items-start gap-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-block rounded-xl bg-white p-1.5">
          <Logo size="sm" />
        </span>
        <div className="font-body text-sm text-white/70">
          <p>Blanchisserie à domicile — Douala, Cameroun</p>
          <p className="mt-1">Collecte, lavage, repassage, livraison.</p>
        </div>
      </Container>
    </footer>
  );
}
