import React from "react";
import { TopToolbar } from "./TopToolbar";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { PageHeader } from "./PageHeader";
import { ContentContainer } from "./ContentContainer";

export function AppLayout({ children }) {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] overflow-hidden">
      {/* 1. Top Global Toolbar */}
      <TopToolbar />

      {/* 2. Middle Main Body (Sidebar + Content Workspace) */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
          <PageHeader />
          <ContentContainer>{children}</ContentContainer>
        </div>
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar />
    </div>
  );
}
