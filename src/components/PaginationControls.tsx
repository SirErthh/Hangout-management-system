import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

const buildPageList = (current: number, total: number): Array<number | "ellipsis-start" | "ellipsis-end"> => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }

  const pages: Array<number | "ellipsis-start" | "ellipsis-end"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) {
    pages.push("ellipsis-start");
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < total - 1) {
    pages.push("ellipsis-end");
  }

  pages.push(total);
  return pages;
};

export const PaginationControls = ({ page, totalPages, onPageChange, className }: PaginationControlsProps) => {
  if (totalPages <= 1) return null;

  const goTo = (next: number) => {
    if (next === page || next < 1 || next > totalPages) return;
    onPageChange(next);
  };

  const pages = buildPageList(page, totalPages);

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(event) => {
              event.preventDefault();
              goTo(page - 1);
            }}
            className={cn(page === 1 && "pointer-events-none opacity-50")}
          />
        </PaginationItem>
        {pages.map((value, idx) =>
          typeof value === "number" ? (
            <PaginationItem key={value}>
              <PaginationLink
                href="#"
                isActive={value === page}
                onClick={(event) => {
                  event.preventDefault();
                  goTo(value);
                }}
              >
                {value}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={`${value}-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(event) => {
              event.preventDefault();
              goTo(page + 1);
            }}
            className={cn(page === totalPages && "pointer-events-none opacity-50")}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

