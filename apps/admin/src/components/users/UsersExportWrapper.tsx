"use client";

import ExportCSVButton from "@/components/ui/ExportCSVButton";
import type { ExportColumn } from "@/lib/csv";

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: string | null;
  created_at: string | null;
}

export default function UsersExportWrapper({ users }: { users: UserRow[] }) {
  const columns: ExportColumn<UserRow>[] = [
    { label: "ID", accessor: (u) => u.id },
    { label: "First Name", accessor: (u) => u.first_name ?? "" },
    { label: "Last Name", accessor: (u) => u.last_name ?? "" },
    { label: "Email", accessor: (u) => u.email },
    { label: "Phone", accessor: (u) => u.phone_number ?? "" },
    { label: "Role", accessor: (u) => u.role },
    { label: "Joined", accessor: (u) => u.created_at },
  ];

  return (
    <ExportCSVButton data={users} columns={columns} filename="users" />
  );
}
