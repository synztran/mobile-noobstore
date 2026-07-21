export interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  base_price: number;
  min_price: number;
  product_type: string;
}
