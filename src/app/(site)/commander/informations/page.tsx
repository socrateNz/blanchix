"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useCommande } from "@/context/useCommande";
import { api } from "@/lib/axios";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

interface MesInfos {
  nom: string;
  telephone: string;
  email: string;
  whatsapp: string;
}

export default function StepInformations() {
  const { state, dispatch } = useCommande();
  const router = useRouter();
  const { data: session } = useSession();
  const [form, setForm] = useState(state.client);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Ne préremplit qu'une fois, pour ne jamais écraser une saisie déjà en cours si le client
  // revient sur cette étape après l'avoir modifiée.
  const [preremplissageFait, setPreremplissageFait] = useState(false);

  const { data: mesInfos } = useQuery({
    queryKey: ["mes-infos"],
    queryFn: async () => {
      const { data } = await api.get<MesInfos>("/mes-infos");
      return data;
    },
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (!mesInfos || preremplissageFait || form.nom || form.telephone || form.email) return;
    // setState différé (plutôt qu'appelé directement dans l'effet) — même contrainte que
    // rencontrée ailleurs cette session avec react-hooks/set-state-in-effect.
    Promise.resolve().then(() => {
      setForm({ nom: mesInfos.nom, telephone: mesInfos.telephone, email: mesInfos.email, whatsapp: mesInfos.whatsapp });
      setPreremplissageFait(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesInfos]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.nom.trim()) nextErrors.nom = "Le nom est requis.";
    if (form.telephone.trim().length < 8) nextErrors.telephone = "Numéro de téléphone invalide.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Email invalide.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    dispatch({ type: "SET_CLIENT", client: form });
    router.push("/commander/adresse");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Vos informations</h1>
        <p className="mt-1 font-body text-sm text-ardoise">
          Pour vous contacter et suivre votre commande.
        </p>
      </div>

      <Field label="Nom complet" error={errors.nom}>
        <input
          className={inputClasses}
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          placeholder="Ex. Alex Mbarga"
        />
      </Field>

      <Field label="Téléphone" error={errors.telephone}>
        <input
          className={inputClasses}
          value={form.telephone}
          onChange={(e) => setForm({ ...form, telephone: e.target.value })}
          placeholder="Ex. 6XX XX XX XX"
          inputMode="tel"
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <input
          className={inputClasses}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="vous@exemple.com"
        />
      </Field>

      <Field label="WhatsApp" optional>
        <input
          className={inputClasses}
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="Si différent du téléphone"
          inputMode="tel"
        />
      </Field>

      <Button type="submit" className="mt-2 self-end">
        Continuer
      </Button>
    </form>
  );
}
