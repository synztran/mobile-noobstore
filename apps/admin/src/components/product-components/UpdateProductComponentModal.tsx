import ProductComponentFormModal from "./ProductComponentFormModal";
import type { ProductComponentRow, ProductOption } from "./types";

type Props = {
	open: boolean;
	onClose: () => void;
	products: ProductOption[];
	component: ProductComponentRow | null;
};

export default function UpdateProductComponentModal({
	open,
	onClose,
	products,
	component,
}: Props) {
	return (
		<ProductComponentFormModal
			open={open}
			onClose={onClose}
			products={products}
			mode="update"
			component={component}
		/>
	);
}
