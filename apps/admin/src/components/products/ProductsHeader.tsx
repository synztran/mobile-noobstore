"use client";

import CreateProductModal from "@/components/products/CreateProductModal";
import ExcludeSoldOutToggle from "@/components/products/ExcludeSoldOutToggle";
import ProductSearchInput from "@/components/products/ProductSearchInput";
import ProductTypeFilter from "@/components/products/ProductTypeFilter";
import { Plus } from "lucide-react";
import { Suspense, useState } from "react";

interface IProps {
  categories: { id: string; name: string }[] | null;
}

export default function ProductsHeader({ categories }: IProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4">
        <h1 className="mr-auto text-3xl font-bold text-slate-900">Products</h1>
        <ProductSearchInput />
		<Suspense fallback={<div className="h-[38px] w-[150px] rounded-lg bg-slate-100 animate-pulse" />}>
			<ProductTypeFilter />
		</Suspense>
		<Suspense fallback={<div className="h-[38px] w-[100px] rounded-lg bg-slate-100 animate-pulse" />}>
			<ExcludeSoldOutToggle />
		</Suspense>
        <button
          onClick={() => setModalOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <CreateProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
      />
    </>
  );
}
