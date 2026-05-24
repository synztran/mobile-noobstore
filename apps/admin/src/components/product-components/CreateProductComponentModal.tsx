import ProductComponentFormModal from "./ProductComponentFormModal";
import type { ProductOption } from "./types";

type Props = {
	open: boolean;
	onClose: () => void;
	products: ProductOption[];
};

export default function CreateProductComponentModal({
	open,
	onClose,
	products,
}: Props) {
	return (
		<ProductComponentFormModal
			open={open}
			onClose={onClose}
			products={products}
			mode="create"
		/>
	);
}
