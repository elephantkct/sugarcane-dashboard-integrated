import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

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
};

export function DataTable<T>({
  title,
  subtitle,
  data,
  columns,
  onRowClick,
  searchFields,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCol, setSortCol]   = useState<number | null>(null);
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("asc");
  const [focused, setFocused]   = useState(false);

  const filteredData = useMemo(() => {
    let result = [...data];

    // Filter
    if (searchTerm && searchFields) {
      const s = searchTerm.toLowerCase();
      result = result.filter((row) => searchFields(row).toLowerCase().includes(s));
    }

    // Sort
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

  const handleSort = (idx: number) => {
    if (!columns[idx].sortKey) return;
    if (sortCol === idx) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(idx);
      setSortDir("asc");
    }
  };

  return (
    <motion.div
      className="rounded-2xl overflow-hidden flex flex-col h-full max-h-[85vh] card-premium"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
      style={{
        background: "linear-gradient(150deg, rgba(82,183,136,0.07) 0%, rgba(10,18,14,0.92) 40%, rgba(6,12,9,0.97) 100%)",
        border: "1px solid rgba(82,183,136,0.30)",
        boxShadow: "0 0 22px rgba(82,183,136,0.10), inset 0 0 14px rgba(82,183,136,0.04), 0 16px 44px rgba(0,0,0,0.5)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-6 py-5 border-b shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ borderColor: 'rgba(82,183,136,0.08)', background: 'rgba(0,0,0,0.22)' }}
      >
        <div>
          <h2 className="text-xl font-semibold text-white/90 font-outfit tracking-wide">{title}</h2>
          {subtitle && <p className="text-sm text-white/40 mt-1">{subtitle}</p>}
        </div>

        {searchFields && (
          <motion.div
            className="flex items-center gap-3 px-3 py-2 rounded-xl border w-full md:w-80 transition-colors duration-200"
            animate={{
              borderColor: focused ? "rgba(82,183,136,0.4)" : "rgba(255,255,255,0.08)",
              boxShadow: focused
                ? "0 0 0 2px rgba(82,183,136,0.15), 0 0 12px rgba(82,183,136,0.08)"
                : "none",
              background: focused ? "rgba(82,183,136,0.06)" : "rgba(255,255,255,0.04)",
            }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ color: focused ? "#52B788" : "rgba(255,255,255,0.3)" }}
              transition={{ duration: 0.2 }}
            >
              <Search size={15} />
            </motion.div>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/30"
            />
            <AnimatePresence>
              {searchTerm && (
                <motion.button
                  className="text-white/30 hover:text-white/70 text-xs transition-colors"
                  onClick={() => setSearchTerm("")}
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
      </div>

      {/* ── Table ── */}
      <motion.div
        className="overflow-auto flex-1 p-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.95 }}
      >
        <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="sticky top-0 z-10 border-b"
            style={{ borderColor: 'rgba(82,183,136,0.08)', background: 'rgba(8,14,10,0.90)', backdropFilter: 'blur(12px)' }}>
            <tr className="text-white/40 font-medium text-xs tracking-wider uppercase">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`py-4 px-6 font-semibold select-none
                    ${col.sortKey ? "cursor-pointer hover:text-white/70 transition-colors" : ""}
                    ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                  `}
                  onClick={() => handleSort(i)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortKey && (
                      <span className="opacity-50">
                        {sortCol === i
                          ? sortDir === "asc"
                            ? <ChevronUp size={11} className="text-[#52B788] opacity-100" />
                            : <ChevronDown size={11} className="text-[#52B788] opacity-100" />
                          : <ChevronUp size={11} className="opacity-30" />
                        }
                      </span>
                    )}
                  </span>
                </th>
              ))}
              {onRowClick && <th className="py-4 px-6" />}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, i) => (
              <motion.tr
                key={i}
                onClick={() => onRowClick && onRowClick(row)}
                className={`border-b border-white/[0.04] group ${onRowClick ? "cursor-pointer" : ""}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.95 + Math.min(i * 0.012, 0.3) }}
                whileHover={{
                  backgroundColor: "rgba(82,183,136,0.05)",
                  transition: { duration: 0.15 },
                }}
              >
                {columns.map((col, j) => (
                  <td
                    key={j}
                    className={`py-3.5 px-6 text-white/75 transition-colors duration-150
                      ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                    `}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
                {onRowClick && (
                  <td className="py-3.5 px-6 text-right">
                    <motion.span
                      className="inline-flex items-center justify-end gap-1 text-xs font-medium text-[#52B788]"
                      initial={{ opacity: 0, x: -4 }}
                      whileHover={{ x: 0, opacity: 1 }}
                      animate={{ opacity: 0 }}
                      // group-hover shows it via whileHover on tr
                    >
                      Profile <ChevronRight size={13} />
                    </motion.span>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <motion.div
            className="text-center py-16 text-white/30 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            No records found.
          </motion.div>
        )}
      </motion.div>

      {/* ── Footer ── */}
      <motion.div
        className="px-6 py-3.5 border-t shrink-0 flex items-center justify-between text-[11px] text-white/30"
        style={{ borderColor: 'rgba(82,183,136,0.07)', background: 'rgba(4,8,6,0.55)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.95 }}
      >
        <span>
          Showing{" "}
          <span className="text-white/50 font-medium">{filteredData.length}</span> of{" "}
          <span className="text-white/50 font-medium">{data.length}</span> records
        </span>
        {searchTerm && (
          <motion.span
            className="text-[#52B788]/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Filtered
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  );
}
