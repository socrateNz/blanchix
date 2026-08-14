"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";

export default function AdminConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const resultat = await signIn("admin-credentials", { email, password, redirect: false });
    setEnCours(false);

    if (resultat?.error) {
      setErreur("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-brume py-14">
      <Container className="max-w-md">
        <Card elevation="raised" className="p-8">
          <h1 className="font-display text-2xl font-bold text-marine">Espace administrateur</h1>
          <p className="mt-1 font-body text-sm text-ardoise">Connexion réservée à l&apos;équipe Blanchix.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <Field label="Email">
              <input
                className={inputClasses}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </Field>

            <Field label="Mot de passe">
              <input
                className={inputClasses}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>

            {erreur && <p className="font-body text-sm text-alerte">{erreur}</p>}

            <Button type="submit" disabled={enCours} className="mt-2">
              {enCours ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </Card>
      </Container>
    </main>
  );
}
