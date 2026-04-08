import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

type PlatformShellProps = {
  children: ReactNode;
  userName: string;
  tenantName: string;
  memberships: { tenantId: string; tenantName: string }[];
};

export function PlatformShell({ children, userName, tenantName, memberships }: PlatformShellProps) {
  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="flex">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header userName={userName} tenantName={tenantName} memberships={memberships} />
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
