import React from "react";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  activePage: string;
  onPageChange: (page: string) => void;
  onOpenApiKey: () => void;
  children: React.ReactNode;
}

export default function AppLayout({ activePage, onPageChange, onOpenApiKey, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar active={activePage} onSelect={onPageChange} onOpenApiKey={onOpenApiKey} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
