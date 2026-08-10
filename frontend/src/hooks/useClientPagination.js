import { useEffect, useMemo, useState } from 'react';

export const useClientPagination = (items = [], pageSize = 8) => {
  const [currentPage, setCurrentPage] = useState(1);

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const totalPages = Math.max(1, Math.ceil(safeItems.length / pageSize));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return safeItems.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, safeItems]);

  const handlePageChange = (nextPage) => {
    setCurrentPage(Math.min(Math.max(1, nextPage), totalPages));
  };

  return {
    currentPage,
    totalPages,
    pageSize,
    totalItems: safeItems.length,
    paginatedItems,
    handlePageChange,
    setCurrentPage
  };
};

export default useClientPagination;
