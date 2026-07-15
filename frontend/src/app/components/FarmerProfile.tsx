import { useEffect, useState } from "react";
import { ArrowLeft, FlaskConical, Leaf, TrendingUp } from "lucide-react";
import { getSurveyProfile, SurveyProfile } from "../lib/api";

function Card({ children, className = "", title }: { children: React.ReactNode; className?: string, title?: string }) {
  return (
    <div className={`glass-card glass-reflect rounded-2xl overflow-hidden relative ${className}`}>
      {title && <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(82,183,136,0.10)', background: 'rgba(0,0,0,0.20)' }}><h3 className="font-semibold text-white/90 font-outfit tracking-wide text-sm">{title}</h3></div>}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function FarmerProfile({ surveyId, onClose }: { surveyId: number, onClose: () => void }) {
  const [p, setP] = useState<SurveyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSurveyProfile(surveyId)
      .then(d => { if (!cancelled) setP(d); })
      .catch(() => { if (!cancelled) setError("Could not load this farmer's profile."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [surveyId]);

  const fertEntries = p ? Object.entries(p.fertilizerUsage).filter(([, v]) => v > 0) : [];
  const orgEntries = p ? Object.entries(p.organicUsage).filter(([, v]) => v > 0) : [];

  return (
    <div
      className="absolute inset-0 z-50 overflow-y-auto p-6 md:p-10 font-sans selection:bg-[#52B788] selection:text-black"
      style={{
        background: 'rgba(4, 8, 6, 0.85)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {loading && <div className="text-white/60">Loading farmer profile...</div>}
        {error && <div className="text-red-400">{error}</div>}

        {p && (
          <>
            <h1 className="text-3xl md:text-4xl font-bold font-outfit mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#95D5B2] to-white">Farmer Profile</h1>
            <p className="text-white/50 mb-8 flex items-center gap-2 text-sm">
              ID: <span className="text-white font-mono">{p.koboUniqueId || p.surveyId}</span> • Code: <span className="text-white font-mono">{p.farmerCode}</span>
              {p.acknowledged && <span className="ml-2 bg-[#52B788]/20 text-[#95D5B2] px-2 py-0.5 rounded-full text-xs">Acknowledged{p.acknowledgedBy ? ` by ${p.acknowledgedBy}` : ""}</span>}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card title="Identity & Admin">
                <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div><dt className="text-white/40 mb-1">Name</dt><dd className="font-medium text-white text-lg">{p.name || 'N/A'}</dd></div>
                  <div><dt className="text-white/40 mb-1">Mobile Number</dt><dd className="font-medium text-white">{p.mobileNumber || 'N/A'}</dd></div>
                  <div><dt className="text-white/40 mb-1">State</dt><dd className="text-white/80">{p.state || '-'}</dd></div>
                  <div><dt className="text-white/40 mb-1">District</dt><dd className="text-white/80">{p.district || '-'}</dd></div>
                  <div><dt className="text-white/40 mb-1">Block</dt><dd className="text-white/80">{p.block || '-'}</dd></div>
                  <div><dt className="text-white/40 mb-1">Crop</dt><dd className="text-white/80">{p.crop || '-'}</dd></div>
                  <div className="col-span-2 pt-3 border-t border-white/5 mt-1 grid grid-cols-3 gap-4">
                    <div><dt className="text-white/40 text-xs mb-1">Collection Date</dt><dd className="text-white/70">{p.collectionDate || 'N/A'}</dd></div>
                    <div><dt className="text-white/40 text-xs mb-1">Employee</dt><dd className="text-white/70">{p.employeeName || 'N/A'}</dd></div>
                    <div><dt className="text-white/40 text-xs mb-1">Designation</dt><dd className="text-white/70">{p.employeeDesignation || 'N/A'}</dd></div>
                  </div>
                </dl>
              </Card>

              <div className="space-y-6">
                <Card title="Land & Planning">
                  <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div><dt className="text-white/40 mb-1">Size of Largest Plot</dt><dd className="font-medium text-white text-lg">{p.largestPlotAcres ?? '-'} <span className="text-xs text-white/50 font-normal">Acres</span></dd></div>
                    <div><dt className="text-white/40 mb-1">Total Land Area</dt><dd className="font-medium text-white text-lg">{p.landAreaHectare ?? '-'} <span className="text-xs text-white/50 font-normal">Ha</span></dd></div>
                    <div className="col-span-2"><dt className="text-white/40 mb-1">Wish to go for next Ratoon?</dt><dd className="text-white/80">{p.wantsNextRatoon === null ? 'N/A' : (p.wantsNextRatoon ? 'Yes' : 'No')}</dd></div>
                  </dl>
                </Card>

                <Card title="Yield & Nutrition">
                  <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div><dt className="text-[#95D5B2] mb-1 font-semibold flex items-center gap-1.5"><TrendingUp size={14}/> Yield</dt><dd className="font-bold text-white text-xl">{p.yieldTonnesPerHa ?? '0'} <span className="text-xs text-white/50 font-normal">t/ha</span></dd></div>
                    <div><dt className="text-[#3B82B8] mb-1 font-semibold flex items-center gap-1.5"><FlaskConical size={14}/> Total Nitrogen</dt><dd className="font-bold text-white text-xl">{p.totalNutrientApplied ?? '0'} <span className="text-xs text-white/50 font-normal">kg</span></dd></div>
                  </dl>
                </Card>

                <Card title="Climate Detail">
                  <dl className="text-sm space-y-4">
                    <div><dt className="text-white/40 mb-1">Severe Climatic Events</dt><dd className="text-white/80 bg-white/5 px-3 py-2 rounded-lg">{p.severeClimaticEvents || 'None'}</dd></div>
                    <div><dt className="text-white/40 mb-1">Growth Stage Impacted</dt><dd className="text-white/80 bg-white/5 px-3 py-2 rounded-lg">{p.growthStageImpacted || 'N/A'}</dd></div>
                  </dl>
                </Card>
              </div>
            </div>

            <Card title="Input Applications" className="mb-6">
              <div className="mb-6 pb-6 border-b border-white/5">
                <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Fertilizer Application Method</h4>
                <p className="text-white/90 text-sm font-medium">{p.fertilizerMethod || 'N/A'}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[#D4624A] text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"><FlaskConical size={14}/> Long-Tail Fertilizer Usage (Kgs)</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {fertEntries.map(([label, val]) => (
                      <div key={label} className="bg-white/5 rounded-lg px-3 py-2 flex justify-between items-center">
                        <span className="text-white/60">{label}</span><strong className="text-white">{val}</strong>
                      </div>
                    ))}
                    {fertEntries.length === 0 && <div className="text-white/40 italic col-span-2">No long-tail fertilizers recorded.</div>}
                  </div>
                </div>
                <div>
                  <h4 className="text-[#52B788] text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"><Leaf size={14}/> Long-Tail Organic Inputs (Kgs)</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {orgEntries.map(([label, val]) => (
                      <div key={label} className="bg-[#52B788]/10 rounded-lg px-3 py-2 flex justify-between items-center border border-[#52B788]/20">
                        <span className="text-white/70">{label}</span><strong className="text-[#95D5B2]">{val}</strong>
                      </div>
                    ))}
                    {orgEntries.length === 0 && <div className="text-white/40 italic col-span-2">No long-tail organics recorded.</div>}
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

