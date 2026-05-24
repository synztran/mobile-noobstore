"use client";

import CreateProductModal from "@/components/products/CreateProductModal";
import ProductSearchInput from "@/components/products/ProductSearchInput";
import ProductTypeFilter from "@/components/products/ProductTypeFilter";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function ProductsHeader() {
	const [modalOpen, setModalOpen] = useState(false);

	return (
		<>
			<div className="flex items-center gap-4">
				<h1 className="text-3xl font-bold text-slate-900 mr-auto">
					Products
				</h1>
				<ProductSearchInput />
				<ProductTypeFilter />
				<button
					onClick={() => setModalOpen(true)}
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0">
					<Plus className="w-4 h-4" />
					Add Product
				</button>
			</div>

			<CreateProductModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
			/>
		</>
	);
}
