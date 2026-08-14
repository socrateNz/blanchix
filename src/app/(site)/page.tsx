import Hero from "@/components/home/Hero";
import Piliers from "@/components/home/Piliers";
import CtaBand from "@/components/home/CtaBand";

export default function Home() {
  return (
    <main className="bg-brand-gradient">
      <Hero />
      <div className="rounded-t-4xl bg-brume pb-8">
        <Piliers />
        <CtaBand />
      </div>
    </main>
  );
}
