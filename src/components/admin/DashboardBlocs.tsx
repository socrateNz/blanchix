import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { formatFCFA } from "@/lib/utils";

// Briques du tableau de bord admin. Une seule teinte de données (bleu Blanchix, validée par le
// script de la compétence dataviz : contraste ≥ 3:1 sur fond blanc) ; les textes restent dans
// les couleurs de texte (marine/ardoise), jamais dans la couleur des barres.

export function Carte({ titre, sousTitre, action, children }: {
  titre: string;
  sousTitre?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-marine/12 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-marine">{titre}</h2>
          {sousTitre && <p className="font-body text-xs text-ardoise">{sousTitre}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Variation en % par rapport à la période précédente ; null quand elle n'a pas de sens (base 0). */
function variation(courant: number, precedent: number) {
  if (precedent === 0) return null;
  return Math.round(((courant - precedent) / precedent) * 100);
}

export function TuileKpi({ label, valeur, courant, precedent, detail }: {
  label: string;
  valeur: string;
  courant?: number;
  precedent?: number;
  detail?: string;
}) {
  const delta = courant !== undefined && precedent !== undefined ? variation(courant, precedent) : null;
  const hausse = delta !== null && delta >= 0;
  return (
    <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
      <p className="font-body text-xs font-medium text-ardoise">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-bold text-marine">{valeur}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 font-body text-xs text-ardoise">
        {delta !== null && (
          <span className={`inline-flex items-center gap-0.5 font-semibold ${hausse ? "text-succes" : "text-alerte"}`}>
            {hausse ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {hausse ? "+" : ""}
            {delta} %
          </span>
        )}
        {detail && <span>{detail}</span>}
      </div>
    </div>
  );
}

const FORMAT_JOUR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const FORMAT_JOUR_LONG = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function jourDe(cle: string) {
  // cle = "AAAA-MM-JJ" (jour à Douala) — formaté en UTC pour ne jamais décaler d'un jour.
  return new Date(`${cle}T00:00:00Z`);
}

/** Paliers d'axe « ronds » (0 / 5 000 / 10 000…) au-dessus du maximum. */
function graduations(max: number) {
  if (max <= 0) return [0];
  const brut = max / 4;
  const puissance = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * puissance).find((p) => p >= brut) ?? brut;
  const ticks = [];
  for (let v = 0; v <= max + pas * 0.001; v += pas) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + pas);
  return ticks;
}

function compact(n: number) {
  return n >= 10000 ? `${Math.round(n / 1000).toLocaleString("fr-FR")} k` : n.toLocaleString("fr-FR");
}

/** Colonnes du chiffre d'affaires par jour, avec infobulle au survol/focus et vue tableau. */
export function GraphiqueCA({ serie }: { serie: { date: string; ca: number; commandes: number }[] }) {
  const ticks = graduations(Math.max(...serie.map((j) => j.ca)));
  const plafond = ticks[ticks.length - 1] || 1;
  const total = serie.reduce((s, j) => s + j.ca, 0);

  return (
    <div>
      {/* mt-5 : place pour la graduation du haut, centrée sur sa ligne et donc à moitié au-dessus. */}
      <div className="mt-5 flex gap-2">
        {/* Axe des valeurs */}
        <div className="relative h-48 w-12 shrink-0 font-mono text-[10px] text-ardoise">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / plafond) * 100}%` }}>
              {compact(t)}
            </span>
          ))}
        </div>
        <div className="relative h-48 flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-ardoise/10" style={{ bottom: `${(t / plafond) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {serie.map((j) => (
              <div
                key={j.date}
                tabIndex={0}
                aria-label={`${FORMAT_JOUR_LONG.format(jourDe(j.date))} : ${formatFCFA(j.ca)}, ${j.commandes} commande(s)`}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
              >
                <div
                  className="w-full max-w-6 rounded-t-[4px] bg-bleu transition-opacity group-hover:opacity-80 group-focus:opacity-80"
                  style={{ height: j.ca > 0 ? `max(2px, ${(j.ca / plafond) * 100}%)` : 0 }}
                />
                <div className="pointer-events-none absolute left-1/2 top-0 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-marine px-2.5 py-1.5 font-body text-xs text-white shadow-lg group-hover:block group-focus:block">
                  <p className="font-semibold capitalize">{FORMAT_JOUR_LONG.format(jourDe(j.date))}</p>
                  <p>
                    {formatFCFA(j.ca)} · {j.commandes} commande{j.commandes > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-14 mt-1.5 flex justify-between font-body text-[10px] text-ardoise">
        <span>{FORMAT_JOUR.format(jourDe(serie[0].date))}</span>
        <span>{FORMAT_JOUR.format(jourDe(serie[Math.floor(serie.length / 2)].date))}</span>
        <span>{FORMAT_JOUR.format(jourDe(serie[serie.length - 1].date))}</span>
      </div>

      <details className="mt-3 font-body text-xs text-ardoise">
        <summary className="cursor-pointer font-semibold text-bleu">Voir en tableau</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-left">
              <th className="py-1 font-semibold">Jour</th>
              <th className="py-1 text-right font-semibold">Commandes</th>
              <th className="py-1 text-right font-semibold">Chiffre d&apos;affaires</th>
            </tr>
          </thead>
          <tbody>
            {[...serie].reverse().map((j) => (
              <tr key={j.date} className="border-t border-ardoise/10 text-encre">
                <td className="py-1 capitalize">{FORMAT_JOUR_LONG.format(jourDe(j.date))}</td>
                <td className="py-1 text-right font-mono">{j.commandes}</td>
                <td className="py-1 text-right font-mono">{formatFCFA(j.ca)}</td>
              </tr>
            ))}
            <tr className="border-t border-ardoise/20 font-semibold text-marine">
              <td className="py-1">Total 30 jours</td>
              <td className="py-1 text-right font-mono">{serie.reduce((s, j) => s + j.commandes, 0)}</td>
              <td className="py-1 text-right font-mono">{formatFCFA(total)}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Barres horizontales triées : libellé à gauche, valeur au bout de la barre. */
export function ListeBarres({ lignes, vide }: {
  lignes: { libelle: string; valeur: number; affichage: string; detail?: string }[];
  vide: string;
}) {
  if (lignes.length === 0) return <p className="font-body text-sm text-ardoise">{vide}</p>;
  const max = Math.max(...lignes.map((l) => l.valeur)) || 1;
  return (
    <ul className="flex flex-col gap-3">
      {lignes.map((l) => (
        <li key={l.libelle}>
          <div className="flex items-baseline justify-between gap-3 font-body text-xs">
            <span className="truncate font-medium text-encre" title={l.libelle}>
              {l.libelle}
            </span>
            <span className="shrink-0 font-mono text-marine">
              {l.affichage}
              {l.detail && <span className="ml-1.5 text-ardoise">{l.detail}</span>}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-r-[4px] bg-bleu" style={{ width: `max(4px, ${(l.valeur / max) * 100}%)` }} />
        </li>
      ))}
    </ul>
  );
}

/** Une ligne « à traiter » : nombre, explication, plus anciennes commandes concernées, lien vers la liste. */
export function LigneATraiter({ label, aide, nombre, exemples, lienTout, urgent }: {
  label: string;
  aide: string;
  nombre: number;
  exemples: { id: string; numero: string }[];
  lienTout?: string;
  urgent?: boolean;
}) {
  const actif = nombre > 0;
  return (
    <li className="flex items-start gap-3 border-t border-ardoise/10 py-3 first:border-t-0 first:pt-0">
      <span
        className={`mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-mono text-sm font-bold ${
          !actif ? "bg-brume text-ardoise" : urgent ? "bg-alerte/15 text-alerte" : "bg-attente/20 text-marine"
        }`}
      >
        {nombre}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-body text-sm font-semibold ${actif ? "text-marine" : "text-ardoise"}`}>{label}</p>
        <p className="font-body text-xs text-ardoise">{aide}</p>
        {actif && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {exemples.map((c) => (
              <Link
                key={c.id}
                href={`/admin/commandes/${c.id}`}
                className="rounded-md bg-brume px-2 py-0.5 font-mono text-[11px] font-semibold text-bleu hover:bg-bleu/10"
              >
                {c.numero}
              </Link>
            ))}
            {lienTout && nombre > exemples.length && (
              <Link href={lienTout} className="inline-flex items-center font-body text-[11px] font-semibold text-bleu hover:underline">
                Voir les {nombre} <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
