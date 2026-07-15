export function isInStock(product: {
  product_type: string;
  stock_quantity: number | null;
  product_variants?: { stock_quantity: number | null }[] | null;
  product_components?: {
    is_required: boolean | null;
    component_product: {
      product_variants?: { stock_quantity: number | null }[] | null;
    } | null;
  }[] | null;
}): boolean {
  const allStock: number[] = [];

  if (product.product_type === "standard") {
    if (product.stock_quantity !== null) {
      allStock.push(product.stock_quantity);
    }
  }

  if (product.product_type === "kit") {
    for (const v of product.product_variants ?? []) {
      if (v.stock_quantity !== null) allStock.push(v.stock_quantity);
    }
    for (const pc of product.product_components ?? []) {
      if (!pc.is_required || !pc.component_product) continue;
      for (const v of pc.component_product.product_variants ?? []) {
        if (v.stock_quantity !== null) allStock.push(v.stock_quantity);
      }
    }
  }

  return allStock.length === 0 || Math.min(...allStock) > 0;
}
