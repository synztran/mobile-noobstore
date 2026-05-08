export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          cart_id: string | null
          id: string
          parent_cart_item_id: string | null
          product_id: string | null
          quantity: number
          variant_id: string | null
        }
        Insert: {
          cart_id?: string | null
          id: string
          parent_cart_item_id?: string | null
          product_id?: string | null
          quantity?: number
          variant_id?: string | null
        }
        Update: {
          cart_id?: string | null
          id?: string
          parent_cart_item_id?: string | null
          product_id?: string | null
          quantity?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_parent_cart_item_id_fkey"
            columns: ["parent_cart_item_id"]
            isOneToOne: false
            referencedRelation: "cart_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          id: string
          user_id: string | null
        }
        Insert: {
          id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          images: Json | null
          name: string
          slug: string
          thumbnail: string | null
        }
        Insert: {
          id: string
          images?: Json | null
          name: string
          slug: string
          thumbnail?: string | null
        }
        Update: {
          id?: string
          images?: Json | null
          name?: string
          slug?: string
          thumbnail?: string | null
        }
        Relationships: []
      }
      community_gallery: {
        Row: {
          alt_text: string
          created_at: string | null
          id: string
          image_url: string
          order: number
        }
        Insert: {
          alt_text: string
          created_at?: string | null
          id?: string
          image_url: string
          order?: number
        }
        Update: {
          alt_text?: string
          created_at?: string | null
          id?: string
          image_url?: string
          order?: number
        }
        Relationships: []
      }
      creators: {
        Row: {
          bio: string | null
          color_theme: string
          created_at: string | null
          id: string
          image_url: string
          name: string
          role: string
          social_handle: string
        }
        Insert: {
          bio?: string | null
          color_theme?: string
          created_at?: string | null
          id?: string
          image_url: string
          name: string
          role: string
          social_handle: string
        }
        Update: {
          bio?: string | null
          color_theme?: string
          created_at?: string | null
          id?: string
          image_url?: string
          name?: string
          role?: string
          social_handle?: string
        }
        Relationships: []
      }
      fees: {
        Row: {
          delivery_basic_price: number
          delivery_immediate_price: number
          handling_fee: number
          id: number
          insurance_fee: number
          packing_fee: number
          updated_at: string | null
        }
        Insert: {
          delivery_basic_price?: number
          delivery_immediate_price?: number
          handling_fee?: number
          id?: number
          insurance_fee?: number
          packing_fee?: number
          updated_at?: string | null
        }
        Update: {
          delivery_basic_price?: number
          delivery_immediate_price?: number
          handling_fee?: number
          id?: number
          insurance_fee?: number
          packing_fee?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      gacha_event_blocked_users: {
        Row: {
          event_id: number
          user_id: string
        }
        Insert: {
          event_id: number
          user_id: string
        }
        Update: {
          event_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gacha_event_blocked_users_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gacha_events"
            referencedColumns: ["id"]
          },
        ]
      }
      gacha_events: {
        Row: {
          created_at: string
          description: string | null
          end_at: string
          free_token_interval_days: number | null
          free_tokens_per_grant: number
          id: number
          is_active: boolean
          name: string
          start_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_at: string
          free_token_interval_days?: number | null
          free_tokens_per_grant?: number
          id?: number
          is_active?: boolean
          name: string
          start_at: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_at?: string
          free_token_interval_days?: number | null
          free_tokens_per_grant?: number
          id?: number
          is_active?: boolean
          name?: string
          start_at?: string
        }
        Relationships: []
      }
      gacha_history: {
        Row: {
          event_id: number
          id: number
          played_at: string
          reward_id: number
          user_id: string
        }
        Insert: {
          event_id: number
          id?: number
          played_at?: string
          reward_id: number
          user_id: string
        }
        Update: {
          event_id?: number
          id?: number
          played_at?: string
          reward_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gacha_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gacha_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gacha_history_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "gacha_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      gacha_missions: {
        Row: {
          created_at: string
          description: string | null
          event_id: number
          id: number
          mission_type: string
          name: string
          requirement: Json
          token_reward: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: number
          id?: number
          mission_type: string
          name: string
          requirement?: Json
          token_reward?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: number
          id?: number
          mission_type?: string
          name?: string
          requirement?: Json
          token_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "gacha_missions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gacha_events"
            referencedColumns: ["id"]
          },
        ]
      }
      gacha_rewards: {
        Row: {
          claimed_count: number
          created_at: string
          description: string | null
          event_id: number
          id: number
          is_golden: boolean
          max_quantity: number | null
          name: string
          reward_type: string
          thumbnail_url: string | null
          value: string | null
          weight: number
        }
        Insert: {
          claimed_count?: number
          created_at?: string
          description?: string | null
          event_id: number
          id?: number
          is_golden?: boolean
          max_quantity?: number | null
          name: string
          reward_type: string
          thumbnail_url?: string | null
          value?: string | null
          weight?: number
        }
        Update: {
          claimed_count?: number
          created_at?: string
          description?: string | null
          event_id?: number
          id?: number
          is_golden?: boolean
          max_quantity?: number | null
          name?: string
          reward_type?: string
          thumbnail_url?: string | null
          value?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "gacha_rewards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gacha_events"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_campaigns: {
        Row: {
          created_at: string | null
          cta_link: string
          cta_text: string
          description: string
          id: string
          image_url: string
          is_active: boolean
          subtitle: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cta_link?: string
          cta_text?: string
          description: string
          id?: string
          image_url: string
          is_active?: boolean
          subtitle: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cta_link?: string
          cta_text?: string
          description?: string
          id?: string
          image_url?: string
          is_active?: boolean
          subtitle?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order_item_components: {
        Row: {
          component_group: string
          created_at: string | null
          id: string
          order_item_id: string
          price_adjustment: number | null
          thumbnail: string | null
          variant_id: string
          variant_name: string
        }
        Insert: {
          component_group: string
          created_at?: string | null
          id?: string
          order_item_id: string
          price_adjustment?: number | null
          thumbnail?: string | null
          variant_id: string
          variant_name: string
        }
        Update: {
          component_group?: string
          created_at?: string | null
          id?: string
          order_item_id?: string
          price_adjustment?: number | null
          thumbnail?: string | null
          variant_id?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_components_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          parent_order_item_id: string | null
          product_id: string | null
          product_name: string
          quantity: number
          thumbnail: string | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          id: string
          order_id?: string | null
          parent_order_item_id?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          thumbnail?: string | null
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          parent_order_item_id?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          thumbnail?: string | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_parent_order_item_id_fkey"
            columns: ["parent_order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_services: {
        Row: {
          id: string
          order_id: string | null
          price: number
          service_id: string | null
        }
        Insert: {
          id: string
          order_id?: string | null
          price: number
          service_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          price?: number
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_services_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          cancelled_note: string | null
          created_at: string | null
          gift_items_snapshot: Json | null
          id: string
          order_number: string
          payment_reminder_sent_at: string | null
          shipping_discount_amount: number
          shipping_fee: number | null
          status: string
          total_price: number
          updated_at: string | null
          user_id: string | null
          voucher_code: string | null
          voucher_discount_amount: number
          voucher_id: string | null
          voucher_snapshot: Json | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_note?: string | null
          created_at?: string | null
          gift_items_snapshot?: Json | null
          id: string
          order_number: string
          payment_reminder_sent_at?: string | null
          shipping_discount_amount?: number
          shipping_fee?: number | null
          status?: string
          total_price: number
          updated_at?: string | null
          user_id?: string | null
          voucher_code?: string | null
          voucher_discount_amount?: number
          voucher_id?: string | null
          voucher_snapshot?: Json | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_note?: string | null
          created_at?: string | null
          gift_items_snapshot?: Json | null
          id?: string
          order_number?: string
          payment_reminder_sent_at?: string | null
          shipping_discount_amount?: number
          shipping_fee?: number | null
          status?: string
          total_price?: number
          updated_at?: string | null
          user_id?: string | null
          voucher_code?: string | null
          voucher_discount_amount?: number
          voucher_id?: string | null
          voucher_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_information: {
        Row: {
          account_name: string
          account_number: string
          created_at: string | null
          id: string
          platform_name: string
          platform_type: string
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          created_at?: string | null
          id?: string
          platform_name: string
          platform_type: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          created_at?: string | null
          id?: string
          platform_name?: string
          platform_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_components: {
        Row: {
          component_group: string
          component_product_id: string | null
          id: string
          is_required: boolean | null
          max_quantity: number | null
          parent_product_id: string | null
        }
        Insert: {
          component_group: string
          component_product_id?: string | null
          id: string
          is_required?: boolean | null
          max_quantity?: number | null
          parent_product_id?: string | null
        }
        Update: {
          component_group?: string
          component_product_id?: string | null
          id?: string
          is_required?: boolean | null
          max_quantity?: number | null
          parent_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_components_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json | null
          id: string
          is_pre_order: boolean
          pre_order_config: Json | null
          price_adjustment: number | null
          product_id: string | null
          product_name: string | null
          stock_quantity: number | null
          thumbnail: string | null
          variant_name: string
        }
        Insert: {
          attributes?: Json | null
          id: string
          is_pre_order?: boolean
          pre_order_config?: Json | null
          price_adjustment?: number | null
          product_id?: string | null
          product_name?: string | null
          stock_quantity?: number | null
          thumbnail?: string | null
          variant_name: string
        }
        Update: {
          attributes?: Json | null
          id?: string
          is_pre_order?: boolean
          pre_order_config?: Json | null
          price_adjustment?: number | null
          product_id?: string | null
          product_name?: string | null
          stock_quantity?: number | null
          thumbnail?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          brand: string | null
          category_id: string | null
          description: string | null
          id: string
          images: Json | null
          is_used: boolean | null
          name: string
          product_type: string
          slug: string
          stock_quantity: number | null
          thumbnail: string | null
        }
        Insert: {
          base_price: number
          brand?: string | null
          category_id?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_used?: boolean | null
          name: string
          product_type?: string
          slug: string
          stock_quantity?: number | null
          thumbnail?: string | null
        }
        Update: {
          base_price?: number
          brand?: string | null
          category_id?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_used?: boolean | null
          name?: string
          product_type?: string
          slug?: string
          stock_quantity?: number | null
          thumbnail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_platform: string | null
          endpoint: string
          id: string
          is_active: boolean
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_platform?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_platform?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          id: string
          name: string
        }
        Insert: {
          base_price: number
          id: string
          name: string
        }
        Update: {
          base_price?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      trust_props: {
        Row: {
          body: string
          created_at: string | null
          heading: string
          icon: string
          id: string
          order: number
        }
        Insert: {
          body: string
          created_at?: string | null
          heading: string
          icon: string
          id?: string
          order?: number
        }
        Update: {
          body?: string
          created_at?: string | null
          heading?: string
          icon?: string
          id?: string
          order?: number
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address: string | null
          address_line: string
          city: string
          city_code: string | null
          country: string
          created_at: string
          full_name: string | null
          id: string
          is_default: boolean | null
          phone_number: string | null
          updated_at: string
          user_id: string | null
          ward_district: string | null
          ward_district_code: string | null
        }
        Insert: {
          address?: string | null
          address_line: string
          city: string
          city_code?: string | null
          country: string
          created_at?: string
          full_name?: string | null
          id: string
          is_default?: boolean | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string | null
          ward_district?: string | null
          ward_district_code?: string | null
        }
        Update: {
          address?: string | null
          address_line?: string
          city?: string
          city_code?: string | null
          country?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_default?: boolean | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string | null
          ward_district?: string | null
          ward_district_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_event_tokens: {
        Row: {
          event_id: number
          id: number
          last_free_token_at: string | null
          token_count: number
          user_id: string
        }
        Insert: {
          event_id: number
          id?: number
          last_free_token_at?: string | null
          token_count?: number
          user_id: string
        }
        Update: {
          event_id?: number
          id?: number
          last_free_token_at?: string | null
          token_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_event_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gacha_events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mission_progress: {
        Row: {
          completed_at: string | null
          id: number
          mission_id: number
          progress: Json
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: number
          mission_id: number
          progress?: Json
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: number
          mission_id?: number
          progress?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mission_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "gacha_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          deep_link: string | null
          id: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deep_link?: string | null
          id?: string
          metadata?: Json
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deep_link?: string | null
          id?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          role?: string | null
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          amount_off: number | null
          applies_to_category_slugs: string[] | null
          applies_to_product_ids: string[] | null
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_at: string | null
          excluded_product_ids: string[] | null
          gift_product_id: string | null
          gift_quantity: number | null
          gift_variant_id: string | null
          id: string
          max_discount_amount: number | null
          metadata: Json
          min_item_quantity: number | null
          min_order_amount: number
          name: string
          percent_off: number | null
          reward_type: Database["public"]["Enums"]["voucher_reward_type"]
          scope_type: Database["public"]["Enums"]["voucher_scope_type"]
          stackable: boolean
          start_at: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          updated_at: string
          usage_limit_per_user: number | null
          usage_limit_total: number | null
          used_count: number
        }
        Insert: {
          amount_off?: number | null
          applies_to_category_slugs?: string[] | null
          applies_to_product_ids?: string[] | null
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          excluded_product_ids?: string[] | null
          gift_product_id?: string | null
          gift_quantity?: number | null
          gift_variant_id?: string | null
          id?: string
          max_discount_amount?: number | null
          metadata?: Json
          min_item_quantity?: number | null
          min_order_amount?: number
          name: string
          percent_off?: number | null
          reward_type: Database["public"]["Enums"]["voucher_reward_type"]
          scope_type?: Database["public"]["Enums"]["voucher_scope_type"]
          stackable?: boolean
          start_at?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          usage_limit_per_user?: number | null
          usage_limit_total?: number | null
          used_count?: number
        }
        Update: {
          amount_off?: number | null
          applies_to_category_slugs?: string[] | null
          applies_to_product_ids?: string[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          excluded_product_ids?: string[] | null
          gift_product_id?: string | null
          gift_quantity?: number | null
          gift_variant_id?: string | null
          id?: string
          max_discount_amount?: number | null
          metadata?: Json
          min_item_quantity?: number | null
          min_order_amount?: number
          name?: string
          percent_off?: number | null
          reward_type?: Database["public"]["Enums"]["voucher_reward_type"]
          scope_type?: Database["public"]["Enums"]["voucher_scope_type"]
          stackable?: boolean
          start_at?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          usage_limit_per_user?: number | null
          usage_limit_total?: number | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_gift_product_id_fkey"
            columns: ["gift_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_gift_variant_id_fkey"
            columns: ["gift_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          added_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_expired_orders: { Args: never; Returns: Json }
      generate_id: { Args: never; Returns: string }
      get_kit_stock: { Args: { kit_id: string }; Returns: number }
      get_pending_payment_orders: {
        Args: never
        Returns: {
          created_at: string
          order_id: string
          order_number: string
          total_price: number
          user_email: string
          user_id: string
        }[]
      }
      increment_voucher_used_count: {
        Args: { p_voucher_id: string }
        Returns: undefined
      }
      mark_payment_reminder_sent: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      process_payment_reminders: { Args: never; Returns: undefined }
      submit_order: {
        Args: {
          p_items: Json
          p_order_id: string
          p_order_number: string
          p_shipping_cost: number
          p_total_price: number
          p_user_id: string
        }
        Returns: Json
      }
      validate_and_deduct_stock: { Args: { p_items: Json }; Returns: Json }
    }
    Enums: {
      voucher_reward_type:
        | "amount_off"
        | "percent_off"
        | "free_shipping"
        | "gift_item"
      voucher_scope_type:
        | "order_total"
        | "shipping_fee"
        | "product"
        | "category"
      voucher_status: "draft" | "active" | "scheduled" | "expired" | "disabled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      voucher_reward_type: [
        "amount_off",
        "percent_off",
        "free_shipping",
        "gift_item",
      ],
      voucher_scope_type: [
        "order_total",
        "shipping_fee",
        "product",
        "category",
      ],
      voucher_status: ["draft", "active", "scheduled", "expired", "disabled"],
    },
  },
} as const
