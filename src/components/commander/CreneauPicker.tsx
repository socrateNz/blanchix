"use client";

import { useSlots, type SlotDTO } from "@/hooks/useSlots";

export default function CreneauPicker({
  type,
  selectedId,
  onSelect,
}: {
  type: "collecte" | "livraison";
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data: slots, isLoading, isError } = useSlots(type);

  if (isLoading) return <p className="font-body text-sm text-ardoise">Chargement des créneaux…</p>;
  if (isError || !slots) {
    return <p className="font-body text-sm text-alerte">Impossible de charger les créneaux.</p>;
  }
  if (slots.length === 0) {
    return <p className="font-body text-sm text-ardoise">Aucun créneau disponible pour le moment.</p>;
  }

  const parDate = new Map<string, SlotDTO[]>();
  for (const slot of slots) {
    const key = new Date(slot.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!parDate.has(key)) parDate.set(key, []);
    parDate.get(key)!.push(slot);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...parDate.entries()].map(([dateLabel, slotsDuJour]) => (
        <div key={dateLabel}>
          <p className="font-body text-xs font-semibold uppercase tracking-wide text-ardoise/70">
            {dateLabel}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {slotsDuJour.map((slot) => (
              <button
                key={slot.id}
                type="button"
                disabled={slot.complet}
                onClick={() => onSelect(slot.id)}
                className={`rounded-xl border px-3 py-2 font-mono text-xs transition-colors ${
                  slot.id === selectedId
                    ? "border-bleu bg-bleu/10 text-marine shadow-sm"
                    : slot.complet
                      ? "cursor-not-allowed border-transparent bg-brume text-ardoise/40"
                      : "border-ardoise/15 bg-white text-encre hover:border-bleu"
                }`}
              >
                {slot.plageHoraire}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
