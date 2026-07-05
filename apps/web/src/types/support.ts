export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type SupportTicketCategory =
  | "defective"
  | "wrong_item"
  | "missing_item"
  | "shipping"
  | "other";

export interface SupportTicket {
  id: string;
  user_id: string;
  order_id: string | null;
  order_item_id: string | null;
  subject: string;
  description: string | null;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface SupportTicketAttachment {
  id: string;
  ticket_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface CreateTicketInput {
  subject: string;
  description?: string;
  category: SupportTicketCategory;
  order_id?: string;
  order_item_id?: string;
}

export interface AdminUpdateTicketInput {
  status?: SupportTicketStatus;
  admin_notes?: string;
}

export interface SupportTicketListItem {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  order_id: string | null;
  attachment_count: number;
  latest_note: string | null;
}

export interface OrderItemComponentInfo {
  variant_name: string;
  component_group: string;
  price_adjustment: number;
  thumbnail: string | null;
}

export interface OrderItemInfo {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  thumbnail: string | null;
  components: OrderItemComponentInfo[];
}

export interface TicketDetail extends SupportTicket {
  order_order_number: string | null;
  order_item: OrderItemInfo | null;
  attachments: SupportTicketAttachment[];
  user_full_name: string | null;
  user_email: string | null;
}
