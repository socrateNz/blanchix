/** Construit un lien wa.me avec message prérempli (section gestion des livreurs). */
export function construireLienWhatsapp(numero: string, message: string): string {
  const numeroNettoye = numero.replace(/[^\d]/g, "");
  return `https://wa.me/${numeroNettoye}?text=${encodeURIComponent(message)}`;
}
