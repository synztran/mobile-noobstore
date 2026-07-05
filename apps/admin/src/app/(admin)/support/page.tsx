import { TicketsList } from "@/components/support/TicketsList";

export const dynamic = "force-dynamic";

export default function AdminSupportPage() {
  return (
    <div className="p-6">
      <TicketsList />
    </div>
  );
}
