import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, ChevronRight, ChevronUp, ChevronDown, ChevronLeft, Download } from "lucide-react";

export type ColumnDef<T> = {
  header: string;
  accessor: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  sortKey?: (row: T) => string | number;
};

type DataTableProps<T> = {
  title: string;
  subtitle?: string;
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  searchFields?: (row: T) => string;
  pageSize?: number;
};

export function DataTable<T>({
  title,
  subtitle,
  data,
  columns,
  onRowClick,
  searchFields,
  pageSize = 8,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCol, setSortCol]       = useState<number | null>(null);
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("asc");
  const [focused, setFocused]       = useState(false);
  const [page, setPage]             = useState(1);
  const [showAll, setShowAll]       = useState(false);

  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchTerm && searchFields) {
      const s = searchTerm.toLowerCase();
      result = result.filter((row) => searchFields(row).toLowerCase().includes(s));
    }
    if (sortCol !== null && columns[sortCol]?.sortKey) {
      const key = columns[sortCol].sortKey!;
      result.sort((a, b) => {
        const av = key(a);
        const bv = key(b);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [data, searchTerm, searchFields, sortCol, sortDir, columns]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    if (showAll) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize, showAll]);

  const handleSort = (idx: number) => {
    if (!columns[idx].sortKey) return;
    if (sortCol === idx) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(idx); setSortDir("asc"); }
  };

  const handleExport = () => {
    if (!filteredData.length) return;
    const keys = columns.map((c) => c.header);
    const csvRows = [keys.join(",")];
    filteredData.forEach((row) => {
      const values = columns.map((c) => {
        const raw = c.sortKey ? String(c.sortKey(row)) : "";
        return `"${raw.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="rounded-[20px] overflow-hidden flex flex-col bg-white border border-[#E8EFE8]"
      style={{ boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.06)" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0px 16px 40px rgba(0, 0, 0, 0.10)", borderColor: "#D8EAD8" }}
      transition={{ duration: 0.26, ease: "easeOut" }}
    >
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-[#E8EFE8] shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1F2A1F] tracking-tight">{title}</h2>
          {subtitle && <p className="text-[12px] text-[#6E7C6E] mt-0.5">{subtitle}</p>}
          <p className="text-[11px] text-[#A5D6A7] mt-0.5 font-medium">
            {filteredData.length.toLocaleString()} records
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search input */}
          {searchFields && (
            <motion.div
              className="flex items-center gap-2 px-3 py-2 rounded-[12px] border border-[#E8EFE8] bg-[#F7F9F7] w-full sm:w-56 transition-colors duration-200"
              animate={{ borderColor: focused ? "#4CAF50" : "#E8EFE8", boxShadow: focused ? "0 0 0 3px rgba(76,175,80,0.10)" : "none" }}
              transition={{ duration: 0.15 }}
            >
              <Search size={13} className={focused ? "text-[#4CAF50]" : "text-[#9AA69A]"} />
              <input
                type="text"
                placeholder="Search records…"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="bg-transparent border-none outline-none text-[12.5px] text-[#1F2A1F] w-full placeholder:text-[#B0BCB0]"
              />
              <AnimatePresence>
                {searchTerm && (
                  <motion.button
                    className="text-[#9AA69A] hover:text-[#4B604B] text-xs transition-colors"
                    onClick={() => { setSearchTerm(""); setPage(1); }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.15 }}
                  >
                    ✕
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Export CSV — green outlined button matching reference */}
          <button
            onClick={handleExport}
            title="Export CSV"
            className="btn-export flex items-center gap-1.5 px-3 py-2 rounded-[10px] border-[1.5px] border-[#4CAF50] text-[#4CAF50] bg-transparent text-[12px] font-semibold hover:bg-[#EDF6ED] hover:text-[#2E7D32] hover:border-[#2E7D32] transition-all cursor-pointer"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto min-h-0 relative">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-[#F7F9F7] border-b border-[#E8EFE8]">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-[#6E7C6E] cursor-pointer hover:text-[#1F2A1F] transition-colors group select-none"
                  onClick={() => handleSort(idx)}
                >
                  <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start"}`}>
                    {col.header}
                    {col.sortKey && (
                      <span className={`flex flex-col transition-opacity ${sortCol === idx ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}>
                        {sortDir === "asc"
                          ? <ChevronUp size={11} className="text-[#4CAF50]" />
                          : <ChevronDown size={11} className="text-[#4CAF50]" />
                        }
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {onRowClick && <th className="px-5 py-3 w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F4F1] text-[#4B604B]">
            {paginatedData.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick && onRowClick(row)}
                className={`group transition-colors ${onRowClick ? "cursor-pointer hover:bg-[#EDF6ED]/50" : ""} ${i % 2 === 0 ? "" : "bg-[#F7F9F7]/40"}`}
              >
                {columns.map((col, j) => (
                  <td
                    key={j}
                    className={`px-5 py-3.5 text-[12.5px] text-[#1F2A1F] ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
                {onRowClick && (
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4CAF50] opacity-0 group-hover:opacity-100 transition-opacity">
                      View <ChevronRight size={12} />
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-12 text-[#9AA69A] text-xs">
            No records match your search.
          </div>
        )}
      </div>

      {/* ── Footer / Pagination ── */}
      <div className="px-5 py-3 border-t border-[#E8EFE8] shrink-0 flex items-center justify-between text-[11.5px] text-[#6E7C6E] bg-[#F7F9F7]">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-[#1F2A1F]">{paginatedData.length}</strong>{" "}
            of <strong className="text-[#1F2A1F]">{filteredData.length}</strong> records
          </span>
          {filteredData.length > pageSize && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-[#4CAF50] hover:text-[#2E7D32] hover:underline font-semibold cursor-pointer text-[11px] transition-colors"
            >
              {showAll ? "Paginate" : "View All"}
            </button>
          )}
        </div>

        {!showAll && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-[8px] border border-[#E8EFE8] bg-white hover:bg-[#F1F4F1] text-[#4B604B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="px-3 py-1 rounded-[8px] bg-white border border-[#E8EFE8] text-[11px] font-semibold text-[#1F2A1F] min-w-[52px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-[8px] border border-[#E8EFE8] bg-white hover:bg-[#F1F4F1] text-[#4B604B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
