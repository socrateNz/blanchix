import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";
import { genererRecuPdf } from "@/services/receipt";

/**
 * Reçu régénéré à la demande à partir de la commande enregistrée (jamais stocké — voir
 * src/services/receipt.ts). Accessible par identifiant de commande, comme
 * /api/payments/status : pas d'authentification en phase 1 (parcours invité), l'ObjectId
 * Mongo sert de capacité suffisamment peu devinable pour ce MVP.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;

  const order = await Order.findById(id).lean();
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (!order.paiement?.methode) {
    return NextResponse.json({ error: "Aucun reçu disponible avant confirmation du paiement." }, { status: 409 });
  }

  const client = await User.findById(order.client).lean();
  if (!client) {
    return NextResponse.json({ error: "Client introuvable pour cette commande." }, { status: 404 });
  }

  const pdfBytes = await genererRecuPdf(order, client);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.numero}.pdf"`,
    },
  });
}
