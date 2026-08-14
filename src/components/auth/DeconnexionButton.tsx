"use client";

import { signOut } from "next-auth/react";
import Button from "@/components/ui/Button";
import { LogOut } from "lucide-react";

export default function DeconnexionButton({ callbackUrl = "/" }: { callbackUrl?: string }) {
  return (
    <>
      <Button type="button" variant="ghost" onClick={() => signOut({ callbackUrl })} className="text-xs">
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </Button>
    </>
  );
}
