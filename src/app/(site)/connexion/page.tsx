"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { api } from "@/lib/axios";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";

export default function ConnexionPage() {
  const router = useRouter();
  const [etape, setEtape] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [erreurConnexion, setErreurConnexion] = useState<string | null>(null);
  const [enCoursConnexion, setEnCoursConnexion] = useState(false);

  const demandeCode = useMutation({
    mutationFn: async () => {
      await api.post("/auth/otp/request", { email });
    },
    onSuccess: () => setEtape("code"),
  });

  async function handleDemandeCode(e: FormEvent) {
    e.preventDefault();
    demandeCode.mutate();
  }

  async function handleVerifierCode(e: FormEvent) {
    e.preventDefault();
    setErreurConnexion(null);
    setEnCoursConnexion(true);

    const resultat = await signIn("client-otp", { email, code, redirect: false });
    setEnCoursConnexion(false);

    if (resultat?.error) {
      setErreurConnexion("Code invalide ou expiré.");
      return;
    }
    router.push("/compte");
    router.refresh();
  }

  const erreurDemande =
    isAxiosError(demandeCode.error) && demandeCode.error.response?.data?.error
      ? String(demandeCode.error.response.data.error)
      : demandeCode.isError
        ? "Une erreur est survenue. Merci de réessayer."
        : null;

  return (
    <main className="min-h-screen bg-brume pb-14 pt-28">
      <Container className="max-w-md">
        <Card elevation="raised" className="p-8">
          <h1 className="font-display text-2xl font-bold text-marine">Connexion</h1>
          <p className="mt-1 font-body text-sm text-ardoise">
            Réservée aux clients ayant déjà passé une commande.
          </p>

          {etape === "email" ? (
            <form onSubmit={handleDemandeCode} className="mt-6 flex flex-col gap-5">
              <Field label="Email">
                <input
                  className={inputClasses}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </Field>

              {erreurDemande && <p className="font-body text-sm text-alerte">{erreurDemande}</p>}

              <Button type="submit" disabled={demandeCode.isPending} className="mt-2">
                {demandeCode.isPending ? "Envoi…" : "Recevoir mon code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifierCode} className="mt-6 flex flex-col gap-5">
              <p className="font-body text-sm text-ardoise">
                Un code à 6 chiffres a été envoyé à <span className="font-semibold">{email}</span>.
              </p>
              <p className="-mt-3 font-body text-xs text-ardoise">
                Vous ne le voyez pas ? Pensez à vérifier votre dossier spam/courrier indésirable.
              </p>

              <Field label="Code de connexion">
                <input
                  className={inputClasses}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                />
              </Field>

              {erreurConnexion && <p className="font-body text-sm text-alerte">{erreurConnexion}</p>}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEtape("email")}
                  className="font-body text-sm text-ardoise underline"
                >
                  Changer d&apos;email
                </button>
                <Button type="submit" disabled={enCoursConnexion}>
                  {enCoursConnexion ? "Connexion…" : "Se connecter"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </Container>
    </main>
  );
}
