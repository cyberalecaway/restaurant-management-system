import React from 'react';

interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function Table<T extends object>({ columns, data, emptyMessage = 'No data found.' }: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#DDE3E8] bg-[#F8FAFC]">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-left text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider whitespace-nowrap ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[#9BAAB8] text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[#F0F3F6] hover:bg-[#FAFBFC] transition-colors"
              >
                {columns.map((col, j) => (
                  <td key={j} className={`px-4 py-3 text-[#1A2332] ${col.className ?? ''}`}>
                    {col.render
                      ? col.render(row)
                      : col.accessor
                        ? String(row[col.accessor] ?? '')
                        : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  itemLabel?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage, itemLabel = 'items' }: PaginationProps) {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#DDE3E8]">
      <p className="text-xs text-[#6B7A8D]">
        Showing {start}–{end} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-xs font-medium rounded border border-[#DDE3E8] text-[#6B7A8D] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
              page === currentPage
                ? 'bg-[#D92F2F] text-white border border-[#D92F2F]'
                : 'border border-[#DDE3E8] text-[#6B7A8D] hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-xs font-medium rounded border border-[#DDE3E8] text-[#6B7A8D] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
