"use client";

import { useState } from "react";
import VoucherFormModal from "./VoucherFormModal";
import type { AdminVoucher } from "./types";

type Props = {
  voucher: AdminVoucher;
};

export default function UpdateVoucherModal({ voucher }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-outline btn-secondary btn-sm text-white hover:text-slate-400"
      >
        Edit
      </button>
      <VoucherFormModal
        open={open}
        onClose={() => setOpen(false)}
        mode="update"
        voucher={voucher}
      />
    </>
  );
}
