export type SectionId =
  | "overview"
  | "farmers"
  | "yield"
  | "fertilizer"
  | "climate";

export const SECTIONS: { id: SectionId; label: string; path: string }[] = [
  { id: "overview",   label: "Overview & Geography",          path: "/overview font-medium" },
  { id: "farmers",    label: "Farmer & Land Profile",         path: "/farmers" },
  { id: "yield",      label: "Yield & Crop Management",       path: "/yield" },
  { id: "fertilizer", label: "Fertilizer & Nutrient Use",     path: "/fertilizer" },
  { id: "climate",    label: "Climate & Advanced Analytics",  path: "/climate" },
];

interface TopNavProps {
  activeSection: SectionId;
  onNavigate: (id: SectionId) => void;
}

export function TopNav({ activeSection, onNavigate }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-2xs">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-6">
        {/* Typographic Brand */}
        <div className="flex flex-col shrink-0 pr-6 border-r border-border cursor-pointer" onClick={() => onNavigate("overview")}>
          <h1 className="font-outfit font-extrabold text-base tracking-tight text-foreground leading-none">
            EDF Sugarcane
          </h1>
          <p className="text-[9.5px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">
            Agricultural Intelligence Platform
          </p>
        </div>

        {/* Multi-page Tab Navigation */}
        <nav className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar flex-1 min-w-0">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => onNavigate(section.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
