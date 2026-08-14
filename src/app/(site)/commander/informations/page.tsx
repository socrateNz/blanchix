"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCommande } from "@/context/useCommande";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

export default function StepInformations() {
  const { state, dispatch } = useCommande();
  const router = useRouter();
  const [form, setForm] = useState(state.client);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
