import { createFileRoute } from "@tanstack/react-router";
import { Cover } from "@/components/blueprint/Cover";
import { Toc } from "@/components/blueprint/Toc";
import { OverviewSection, PipelineSections } from "@/components/blueprint/sections/Core";
import { OrchestrationSection } from "@/components/blueprint/sections/Orchestration";
import { SecuritySections } from "@/components/blueprint/sections/Security";
import { CommercialSections } from "@/components/blueprint/sections/Commercial";
import { ValueSections } from "@/components/blueprint/sections/Value";
import { StageRecordsSection } from "@/components/blueprint/sections/StageRecords";
import { OemSection } from "@/components/blueprint/sections/Oem";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/blueprint")({ component: BlueprintPage });

function BlueprintPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader current="blueprint" />
      <Cover />
      <div className="grid lg:grid-cols-[270px_minmax(0,1fr)] max-w-[1300px] mx-auto min-w-0">
        <Toc />
        <main className="min-w-0 px-[6vw] lg:px-12 xl:px-14 py-10 lg:py-14">
          <OverviewSection />
          <OemSection />
          <StageRecordsSection />
          <OrchestrationSection />
          <PipelineSections />
          <SecuritySections />
          <CommercialSections />
          <ValueSections />
        </main>
      </div>
      <footer className="bg-navy text-paper-2 text-[0.83rem] px-[6vw] py-10">
        <div className="max-w-[1300px] mx-auto flex flex-wrap justify-between gap-4">
          <span>CygnusX-1 — SBA Loan Origination Multi-Agent Swarm Blueprint · V1.3</span>
          <span>Confidential — internal review · not legal or regulatory advice</span>
        </div>
      </footer>
    </div>
  );
}
