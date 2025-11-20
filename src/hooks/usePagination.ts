import { useEffect, useMemo, useState } from "react";

type UsePaginationOptions = {
  pageSize?: number;
  resetKey?: unknown;
};

export const usePagination = <T,>(items: T[], options: UsePaginationOptions = {}) => {
  const { pageSize = 10, resetKey } = options;
  // หน้าปัจจุบัน
  const [page, setPage] = useState(1);

  // คำนวณหาจำนวนหน้าทั้งหมด
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    // ปรับหน้าปัจจุบันถ้าเกินจำนวนหน้าทั้งหมด
    setPage((prev) => {
      if (totalPages === 0) return 1;
      return Math.min(Math.max(prev, 1), totalPages);
    });
  }, [totalPages]);

  useEffect(() => {
    // รีเซ็ตหน้าเป็น 1 เมื่อ resetKey เปลี่ยน
    if (resetKey === undefined) return;
    setPage(1);
  }, [resetKey]);

  const pageItems = useMemo(() => {
    // ตัด slice รายการเฉพาะหน้าปัจจุบัน
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const startItem = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = items.length === 0 ? 0 : Math.min(page * pageSize, items.length);

  return {
    page,
    setPage,
    totalPages,
    pageSize,
    pageItems,
    startItem,
    endItem,
    totalItems: items.length,
  };
};
