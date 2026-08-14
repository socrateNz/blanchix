import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TabBar from "@/components/layout/TabBar";
import InstallPwaBanner from "@/components/pwa/InstallPwaBanner";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="grid">
        <div className="[grid-area:1/1] pb-16 sm:pb-0">{children}</div>
        <Header />
      </div>
      <div className="hidden sm:block">
        <Footer />
      </div>
      <TabBar />
      <InstallPwaBanner />
    </div>
  );
}
