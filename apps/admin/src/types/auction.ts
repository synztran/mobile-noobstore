export interface AuctionProductDetails {
  specs: Array<{ label: string; value: string }>;
  condition: {
    grade: "S" | "A" | "B" | "C" | "D";
    summary: string[];
    attributes: Array<{ label: string; value: string }>;
    images: string[];
    image_captions?: string[];
  };
  accessories: string[];
}
