import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MapView from "@/components/MapView";
import DetailPanel from "@/components/DetailPanel";
import FilterBar from "@/components/FilterBar";
import CommandPalette from "@/components/CommandPalette";
import KeyboardLayer from "@/components/KeyboardLayer";
import DeepLinkBoot from "@/components/DeepLinkBoot";
import { Toaster } from "@/components/Toast";

export default function Page() {
  return (
    <main
      className="grid h-screen w-screen gap-2.5 p-2.5 overflow-hidden"
      style={{
        gridTemplateRows: "56px 1fr 48px",
        gridTemplateColumns: "320px 1fr 400px",
        gridTemplateAreas: `"header header header" "sidebar map detail" "footer footer footer"`,
      }}
    >
      <Header />
      <Sidebar />
      <MapView />
      <DetailPanel />
      <FilterBar />
      <CommandPalette />
      <KeyboardLayer />
      <DeepLinkBoot />
      <Toaster />
    </main>
  );
}
