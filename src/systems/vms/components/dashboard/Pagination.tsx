"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of visible range
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if at the beginning
      if (currentPage <= 3) {
        end = Math.min(totalPages - 1, 4);
      }

      // Adjust if at the end
      if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
      }

      // Add ellipsis if needed
      if (start > 2) {
        pages.push("...");
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (end < totalPages - 1) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between py-4 px-4 sm:px-6">
        <div className="text-sm text-[#4a4a5a]">
          Showing {totalItems} vehicle{totalItems !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#4a4a5a]">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-[#1a1a2e] focus:outline-none shadow-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 px-4 sm:px-6 border-t border-slate-200">
      {/* Info */}
      <div className="text-sm text-[#4a4a5a]">
        Showing <span className="font-medium text-[#1a1a2e]">{startItem}</span> to{" "}
        <span className="font-medium text-[#1a1a2e]">{endItem}</span> of{" "}
        <span className="font-medium text-[#1a1a2e]">{totalItems}</span> vehicles
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#4a4a5a] hidden sm:inline">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-[#1a1a2e] focus:outline-none shadow-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg text-[#4a4a5a] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 hover:bg-slate-50"
            aria-label="Previous page"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-5 w-5"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === "number" && onPageChange(page)}
                disabled={page === "..."}
                className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  page === currentPage
                    ? "bg-[#10b981] text-white shadow-sm"
                    : page === "..."
                    ? "text-[#4a4a5a] cursor-default"
                    : "text-[#4a4a5a] shadow-sm hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg text-[#4a4a5a] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 hover:bg-slate-50"
            aria-label="Next page"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-5 w-5"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
