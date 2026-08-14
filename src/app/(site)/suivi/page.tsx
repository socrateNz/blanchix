"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package, ChevronRight } from "lucide-react";
import { api } from "@/lib/axios";
import { formatFCFA } from "@/lib/utils";
import { STATUT_LABELS, type OrderStatus } from "@/lib/orderStatuses";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import StatutBadge from "@/components/admin/StatutBadge";

interface CommandeResume {
  id: string;
  numero: string;
  statut: string;
  total: number;
  createdAt: string;
}

const CHIP_TONES: Record<string, string> = {
  neutre: "bg-ardoise/10 text-ardoise",
  attente: "bg-attente/15 text-attente",
  progression: "bg-bleu/10 text-bleu",
  succes: "bg-succes/15 text-succes",
  alerte: "bg-alerte/15 text-alerte",
};

export default function SuiviPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mes-commandes"],
    queryFn: async () => {
      const { data } = await api.get<CommandeResume[]>("/mes-commandes");
      return data;
    },
  });

  return (
    <main className="min-h-screen bg-brume pb-10 pt-24 sm:pb-14 sm:pt-28">
      <Container className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-marine">Suivi de mes commandes</h1>
        <p className="mt-1 font-body text-sm text-ardoise">L&apos;historique et le statut de toutes vos commandes.</p>

        <div className="mt-6 flex flex-col gap-3">
          {isLoading && <p className="font-body text-sm text-ardoise">Chargement…</p>}
          {isError && <p className="font-body text-sm text-alerte">Connectez-vous pour voir vos commandes.</p>}
          {data?.length === 0 && (
            <Card className="p-6 text-center">
              <p className="font-body text-sm text-ardoise">Vous n&apos;avez pas encore passé de commande.</p>
              <Link href="/commander" className={`${buttonClasses("primary")} mt-4`}>
                Commander maintenant
              </Link>
            </Card>
          )}
          {data?.map((commande) => {
            const tone = STATUT_LABELS[commande.statut as OrderStatus]?.tone ?? "neutre";
            return (
              <Link key={commande.id} href={`/suivi/${commande.id}`}>
                <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${CHIP_TONES[tone]}`}>
                    <Package className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-marine">{commande.numero}</p>
                    <p className="mt-0.5 font-body text-xs text-ardoise">
                      {new Date(commande.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatutBadge statut={commande.statut} />
                    <span className="font-mono text-xs font-semibold text-encre">{formatFCFA(commande.total)}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ardoise/50" />
                </Card>
              </Link>
            );
          })}
        </div>
      </Container>
    </main>
  );
}
