"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ContractorsTable from "./ContractorsTable";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContractorsPage() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-lg font-semibold">Contractor Management</h1>
      </header>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Contractors</h2>
          </div>
          <Button asChild className="bg-[#000] text-[#FFF] hover:bg-[#acacac]">
            <Link href="/hr/contractors/add">Add Contractor</Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardDescription>Manage all contractor information and records</CardDescription>
          </CardHeader>
          <CardContent>
            <ContractorsTable />
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}