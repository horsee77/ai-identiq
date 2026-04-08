import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

type ListModuleProps = {
  title: string;
  description: string;
  headers: string[];
  hasData: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
};

export function ListModule({
  title,
  description,
  headers,
  hasData,
  emptyTitle,
  emptyDescription,
  children,
}: ListModuleProps) {
  return (
    <Card title={title} subtitle={description}>
      {hasData ? (
        <DataTable headers={headers}>{children}</DataTable>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </Card>
  );
}
