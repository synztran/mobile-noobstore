import { User } from "lucide-react";

interface Props {
  customerId: string;
  customerName: string;
  email: string | null | undefined;
  phoneNumber: string | null | undefined;
}

export default function OrderCustomerInfoCard({
  customerId,
  customerName,
  email,
  phoneNumber,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <User className="h-4 w-4" />
        Customer Information
      </div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div>
          <dt className="text-xs text-slate-400">Customer ID</dt>
          <dd className="mt-0.5 font-mono text-xs text-slate-600">
            {customerId}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Name</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{customerName}</dd>
        </div>
        {email && (
          <div>
            <dt className="text-xs text-slate-400">Email</dt>
            <dd className="mt-0.5 text-slate-600">{email}</dd>
          </div>
        )}
        {phoneNumber && (
          <div>
            <dt className="text-xs text-slate-400">Phone</dt>
            <dd className="mt-0.5 text-slate-600">{phoneNumber}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
