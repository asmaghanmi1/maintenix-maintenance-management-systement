
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        <Header />
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
}
