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
      className="rounded-2xl overflow-hidden flex flex-col h-full max-h-[85vh] bg-card shadow-sm border border-border"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
    >
      {/* ── Header ── */}
      <div
        className="px-6 py-5 border-b shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <h2 className="text-xl font-semibold text-foreground font-outfit tracking-wide">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>

        {searchFields && (
          <motion.div
            className="flex items-center gap-3 px-3 py-2 rounded-xl border w-full md:w-80 transition-colors duration-200"
            animate={{
              borderColor: focused ? "var(--primary)" : "var(--border)",
              boxShadow: focused
                ? "0 0 0 2px var(--primary-foreground), 0 0 12px var(--primary-foreground)"
                : "none",
              background: focused ? "var(--background)" : "var(--muted)",
            }}
            transition={{ duration: 0.2 }}
          >
            <Search size={16} className={focused ? "text-primary" : "text-muted-foreground"} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="bg-transparent border-none outline-none text-sm text-foreground w-full placeholder:text-muted-foreground"
            />
            <AnimatePresence>
              {searchTerm && (
                <motion.button
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
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
      <div className="flex-1 overflow-auto min-h-0 relative">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead 
            className="sticky top-0 z-10 text-[10px] uppercase font-bold tracking-[0.1em] text-muted-foreground bg-muted/80 backdrop-blur-md"
            style={{ boxShadow: '0 1px 0 var(--border)' }}
          >
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors group select-none"
                  onClick={() => handleSort(idx)}
                >
                  <div className={`flex items-center gap-2 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    {col.header}
                    {col.sortKey && (
                      <span className={`flex flex-col transition-opacity ${sortCol === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                        {sortDir === "asc" 
                          ? <ChevronUp size={11} className="text-primary" /> 
                          : <ChevronDown size={11} className="text-primary" />
                        }
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {onRowClick && <th className="px-6 py-4" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {filteredData.map((row, i) => (
              <motion.tr
                key={i}
                onClick={() => onRowClick && onRowClick(row)}
                className={`group ${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.95 + Math.min(i * 0.012, 0.3) }}
              >
                {columns.map((col, j) => (
                  <td
                    key={j}
                    className={`px-6 py-4 text-foreground/80 transition-colors duration-150
                      ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                    `}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
                {onRowClick && (
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center justify-end gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Profile <ChevronRight size={13} />
                    </span>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <motion.div
            className="text-center py-16 text-muted-foreground text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            No records found.
          </motion.div>
        )}
      </div>

      {/* ── Footer ── */}
      <motion.div
        className="px-6 py-3.5 border-t shrink-0 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/20"
        style={{ borderColor: 'var(--border)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.95 }}
      >
        <span>
          Showing{" "}
          <span className="text-foreground font-medium">{filteredData.length}</span> of{" "}
          <span className="text-foreground font-medium">{data.length}</span> records
        </span>
        {searchTerm && (
          <motion.span
            className="text-primary/80 font-medium"
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
