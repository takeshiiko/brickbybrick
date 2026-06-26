import { DashboardMyBricks, FooterStats, HouseProgressPanel, LiveHouseCanvas, MintPanel, Shell } from "./components";

export default function Home() {
  return (
    <Shell active="mint">
      <main className="home-dashboard">
        <section className="canvas-column">
          <LiveHouseCanvas variant="dashboard" />
        </section>
        <MintPanel />
      </main>
      <section className="lower-dashboard">
        <DashboardMyBricks />
        <HouseProgressPanel />
      </section>
      <FooterStats />
    </Shell>
  );
}
