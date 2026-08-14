import CommandeProvider from "@/context/CommandeProvider";
import WizardStepper from "@/components/commander/WizardStepper";
import Container from "@/components/ui/Container";

export default function CommanderLayout({ children }: { children: React.ReactNode }) {
  return (
    <CommandeProvider>
      <main className="min-h-screen bg-brume pb-10 pt-24 sm:pb-14 sm:pt-28">
        <Container className="max-w-2xl">
          <WizardStepper />
          <div className="mt-8 rounded-2xl border border-marine/12 bg-white p-6 shadow-md sm:p-10">
            {children}
          </div>
        </Container>
      </main>
    </CommandeProvider>
  );
}
