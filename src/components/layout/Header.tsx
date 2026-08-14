import Link from "next/link";
import Logo from "@/components/brand/Logo";
import Container from "@/components/ui/Container";
import CompteIcon from "@/components/layout/CompteIcon";
import CompteMenu from "@/components/layout/CompteMenu";

export default function Header() {
  return (
    <header className="[grid-area:1/1] self-start mx-2 sticky top-5 z-30 bg-brume/20 shadow-[0_1px_0_0_rgba(0,40,120,0.08)] backdrop-blur-3xl rounded-full">
      <Container className="flex items-center justify-between py-1 px-2!">
        <Link href="/" aria-label="Blanchix — accueil">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 font-body text-sm font-medium text-ardoise sm:flex">
          <Link href="/comment-ca-marche" className="hover:text-marine">
            Comment ça fonctionne
          </Link>
        </nav>

        {/* Desktop : Se connecter, ou — une fois connecté — un menu regroupant
            Commander/Mon compte/Se déconnecter plutôt que plusieurs boutons séparés. */}
        <div className="hidden sm:block">
          <CompteMenu />
        </div>

        {/* Mobile : Commander vit déjà dans le bouton central de la tab bar — ce coin devient
            l'accès au compte à la place. */}
        <div className="sm:hidden">
          <CompteIcon />
        </div>
      </Container>
    </header>
  );
}
