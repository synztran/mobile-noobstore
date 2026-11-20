export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string;
          admin_email: string;
          admin_user_id: string;
          created_at: string | null;
          diff_data: Json | null;
          entity_id: string | null;
          entity_type: string;
          id: string;
          ip_address: string | null;
          new_data: Json | null;
          old_data: Json | null;
        };
        Insert: {
          action: string;
          admin_email: string;
          admin_user_id: string;
          created_at?: string | null;
          diff_data?: Json | null;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: string | null;
          new_data?: Json | null;
          old_data?: Json | null;
        };
        Update: {
          action?: string;
          admin_email?: string;
          admin_user_id?: string;
          created_at?: string | null;
          diff_data?: Json | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: string | null;
          new_data?: Json | null;
          old_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      app_config: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          key?: string;
          value?: string;
        };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          author: string;
          category: string;
          content: string;
          created_at: string | null;
          excerpt: string | null;
          featured: boolean | null;
          id: string;
          meta_description: string | null;
          meta_title: string | null;
          og_image: string | null;
          published: boolean | null;
          published_at: string | null;
          slug: string;
          tags: string[] | null;
          thumbnail: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          author?: string;
          category?: string;
          content: string;
          created_at?: string | null;
          excerpt?: string | null;
          featured?: boolean | null;
          id?: string;
          meta_description?: string | null;
          meta_title?: string | null;
          og_image?: string | null;
          published?: boolean | null;
          published_at?: string | null;
          slug: string;
          tags?: string[] | null;
          thumbnail?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          author?: string;
          category?: string;
          content?: string;
          created_at?: string | null;
          excerpt?: string | null;
          featured?: boolean | null;
          id?: string;
          meta_description?: string | null;
          meta_title?: string | null;
          og_image?: string | null;
          published?: boolean | null;
          published_at?: string | null;
          slug?: string;
          tags?: string[] | null;
          thumbnail?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      carriers: {
        Row: {
          id: string;
          is_active: boolean;
          logo: string | null;
          name: string;
          sort_order: number;
          tracking_url_template: string | null;
        };
        Insert: {
          id: string;
          is_active?: boolean;
          logo?: string | null;
          name: string;
          sort_order?: number;
          tracking_url_template?: string | null;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          logo?: string | null;
          name?: string;
          sort_order?: number;
          tracking_url_template?: string | null;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          cart_id: string | null;
          created_at: string | null;
          id: string;
          parent_cart_item_id: string | null;
          product_id: string | null;
          quantity: number;
          updated_at: string | null;
          variant_id: string | null;
        };
        Insert: {
          cart_id?: string | null;
          created_at?: string | null;
          id: string;
          parent_cart_item_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Update: {
          cart_id?: string | null;
          created_at?: string | null;
          id?: string;
          parent_cart_item_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_parent_cart_item_id_fkey";
            columns: ["parent_cart_item_id"];
            isOneToOne: false;
            referencedRelation: "cart_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "kit_component_variants";
            referencedColumns: ["product_variant_id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          created_at: string | null;
          id: string;
          status: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id: string;
          status?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          status?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          images: Json | null;
          is_active: boolean;
          name: string;
          slug: string;
          thumbnail: string | null;
        };
        Insert: {
          id: string;
          images?: Json | null;
          is_active?: boolean;
          name: string;
          slug: string;
          thumbnail?: string | null;
        };
        Update: {
          id?: string;
          images?: Json | null;
          is_active?: boolean;
          name?: string;
          slug?: string;
          thumbnail?: string | null;
        };
        Relationships: [];
      };
      community_config: {
        Row: {
          community_enabled: boolean;
          created_at: string;
          firmware_enabled: boolean;
          id: string;
          min_rank_level_firmware: number;
          min_rank_level_post: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          community_enabled?: boolean;
          created_at?: string;
          firmware_enabled?: boolean;
          id?: string;
          min_rank_level_firmware?: number;
          min_rank_level_post?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          community_enabled?: boolean;
          created_at?: string;
          firmware_enabled?: boolean;
          id?: string;
          min_rank_level_firmware?: number;
          min_rank_level_post?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "community_config_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      community_gallery: {
        Row: {
          alt_text: string;
          author: string;
          build_info: Json | null;
          created_at: string | null;
          id: string;
          image_url: string;
          order: number;
        };
        Insert: {
          alt_text: string;
          author?: string;
          build_info?: Json | null;
          created_at?: string | null;
          id?: string;
          image_url: string;
          order?: number;
        };
        Update: {
          alt_text?: string;
          author?: string;
          build_info?: Json | null;
          created_at?: string | null;
          id?: string;
          image_url?: string;
          order?: number;
        };
        Relationships: [];
      };
      community_posts: {
        Row: {
          author_id: string;
          content: string;
          created_at: string;
          id: string;
          media: Json;
          post_type: string;
          published_at: string | null;
          status: string;
          status_reason: string | null;
          title: string;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          author_id: string;
          content?: string;
          created_at?: string;
          id?: string;
          media?: Json;
          post_type: string;
          published_at?: string | null;
          status?: string;
          status_reason?: string | null;
          title: string;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          media?: Json;
          post_type?: string;
          published_at?: string | null;
          status?: string;
          status_reason?: string | null;
          title?: string;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      component_variant_rule_allowed: {
        Row: {
          price_override: number | null;
          rule_id: string;
          variant_id: string;
        };
        Insert: {
          price_override?: number | null;
          rule_id: string;
          variant_id: string;
        };
        Update: {
          price_override?: number | null;
          rule_id?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "component_variant_rule_allowed_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "component_variant_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "component_variant_rule_allowed_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "kit_component_variants";
            referencedColumns: ["product_variant_id"];
          },
          {
            foreignKeyName: "component_variant_rule_allowed_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      component_variant_rules: {
        Row: {
          condition_variant_id: string;
          created_at: string;
          id: string;
          kit_product_id: string;
          target_component_product_id: string;
        };
        Insert: {
          condition_variant_id: string;
          created_at?: string;
          id?: string;
          kit_product_id: string;
          target_component_product_id: string;
        };
        Update: {
          condition_variant_id?: string;
          created_at?: string;
          id?: string;
          kit_product_id?: string;
          target_component_product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "component_variant_rules_condition_variant_id_fkey";
            columns: ["condition_variant_id"];
            isOneToOne: false;
            referencedRelation: "kit_component_variants";
            referencedColumns: ["product_variant_id"];
          },
          {
            foreignKeyName: "component_variant_rules_condition_variant_id_fkey";
            columns: ["condition_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "component_variant_rules_kit_product_id_fkey";
            columns: ["kit_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "component_variant_rules_target_component_product_id_fkey";
            columns: ["target_component_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      crawling_detections: {
        Row: {
          content_hash: string;
          created_at: string | null;
          detected_content: string;
          detected_title: string | null;
          detected_url: string | null;
          id: string;
          release_id: string | null;
          source_id: string;
          status: string;
        };
        Insert: {
          content_hash: string;
          created_at?: string | null;
          detected_content: string;
          detected_title?: string | null;
          detected_url?: string | null;
          id?: string;
          release_id?: string | null;
          source_id: string;
          status?: string;
        };
        Update: {
          content_hash?: string;
          created_at?: string | null;
          detected_content?: string;
          detected_title?: string | null;
          detected_url?: string | null;
          id?: string;
          release_id?: string | null;
          source_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crawling_detections_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "crawling_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_detection_release";
            columns: ["release_id"];
            isOneToOne: false;
            referencedRelation: "maker_releases";
            referencedColumns: ["id"];
          },
        ];
      };
      crawling_history: {
        Row: {
          id: string;
          items_created: number | null;
          items_found: number | null;
          message: string | null;
          ran_at: string | null;
          source_id: string;
          status: string;
        };
        Insert: {
          id?: string;
          items_created?: number | null;
          items_found?: number | null;
          message?: string | null;
          ran_at?: string | null;
          source_id: string;
          status: string;
        };
        Update: {
          id?: string;
          items_created?: number | null;
          items_found?: number | null;
          message?: string | null;
          ran_at?: string | null;
          source_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crawling_history_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "crawling_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      crawling_sources: {
        Row: {
          author: string;
          category: string;
          created_at: string | null;
          id: string;
          last_content_hash: string | null;
          last_crawled_at: string | null;
          name: string;
          schedule_days: number[];
          schedule_time: string;
          selector: string | null;
          status: string;
          updated_at: string | null;
          url: string;
          watch_id: string | null;
        };
        Insert: {
          author?: string;
          category?: string;
          created_at?: string | null;
          id?: string;
          last_content_hash?: string | null;
          last_crawled_at?: string | null;
          name: string;
          schedule_days?: number[];
          schedule_time?: string;
          selector?: string | null;
          status?: string;
          updated_at?: string | null;
          url: string;
          watch_id?: string | null;
        };
        Update: {
          author?: string;
          category?: string;
          created_at?: string | null;
          id?: string;
          last_content_hash?: string | null;
          last_crawled_at?: string | null;
          name?: string;
          schedule_days?: number[];
          schedule_time?: string;
          selector?: string | null;
          status?: string;
          updated_at?: string | null;
          url?: string;
          watch_id?: string | null;
        };
        Relationships: [];
      };
      creators: {
        Row: {
          bio: string | null;
          color_theme: string;
          created_at: string | null;
          id: string;
          image_url: string;
          name: string;
          role: string;
          social_handle: string;
        };
        Insert: {
          bio?: string | null;
          color_theme?: string;
          created_at?: string | null;
          id?: string;
          image_url: string;
          name: string;
          role: string;
          social_handle: string;
        };
        Update: {
          bio?: string | null;
          color_theme?: string;
          created_at?: string | null;
          id?: string;
          image_url?: string;
          name?: string;
          role?: string;
          social_handle?: string;
        };
        Relationships: [];
      };
      customer_ranks: {
        Row: {
          benefits: Json;
          color: string;
          created_at: string;
          icon_label: string | null;
          icon_url: string | null;
          id: string;
          is_active: boolean;
          level: number;
          min_order_count: number;
          min_total_spent: number;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          benefits?: Json;
          color?: string;
          created_at?: string;
          icon_label?: string | null;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          level: number;
          min_order_count?: number;
          min_total_spent?: number;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          benefits?: Json;
          color?: string;
          created_at?: string;
          icon_label?: string | null;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          level?: number;
          min_order_count?: number;
          min_total_spent?: number;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fees: {
        Row: {
          delivery_basic_price: number;
          delivery_immediate_price: number;
          handling_fee: number;
          id: number;
          insurance_fee: number;
          max_vouchers_per_order: number;
          packing_fee: number;
          updated_at: string | null;
        };
        Insert: {
          delivery_basic_price?: number;
          delivery_immediate_price?: number;
          handling_fee?: number;
          id?: number;
          insurance_fee?: number;
          max_vouchers_per_order?: number;
          packing_fee?: number;
          updated_at?: string | null;
        };
        Update: {
          delivery_basic_price?: number;
          delivery_immediate_price?: number;
          handling_fee?: number;
          id?: number;
          insurance_fee?: number;
          max_vouchers_per_order?: number;
          packing_fee?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      firmwares: {
        Row: {
          author_id: string;
          created_at: string;
          download_count: number;
          file_name: string;
          file_size: number;
          file_url: string;
          files: Json;
          id: string;
          keyboard_name: string;
          mime_type: string;
          notes: string;
          published_at: string | null;
          status: string;
          status_reason: string | null;
          title: string;
          updated_at: string;
          version: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          download_count?: number;
          file_name: string;
          file_size?: number;
          file_url: string;
          files?: Json;
          id?: string;
          keyboard_name?: string;
          mime_type?: string;
          notes?: string;
          published_at?: string | null;
          status?: string;
          status_reason?: string | null;
          title: string;
          updated_at?: string;
          version?: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          download_count?: number;
          file_name?: string;
          file_size?: number;
          file_url?: string;
          files?: Json;
          id?: string;
          keyboard_name?: string;
          mime_type?: string;
          notes?: string;
          published_at?: string | null;
          status?: string;
          status_reason?: string | null;
          title?: string;
          updated_at?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "firmwares_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      gacha_event_blocked_users: {
        Row: {
          event_id: number;
          user_id: string;
        };
        Insert: {
          event_id: number;
          user_id: string;
        };
        Update: {
          event_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gacha_event_blocked_users_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "gacha_events";
            referencedColumns: ["id"];
          },
        ];
      };
      gacha_events: {
        Row: {
          created_at: string;
          description: string | null;
          end_at: string;
          free_token_interval_days: number | null;
          free_tokens_per_grant: number;
          id: number;
          is_active: boolean;
          name: string;
          start_at: string;
          theme: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          end_at: string;
          free_token_interval_days?: number | null;
          free_tokens_per_grant?: number;
          id?: number;
          is_active?: boolean;
          name: string;
          start_at: string;
          theme?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          end_at?: string;
          free_token_interval_days?: number | null;
          free_tokens_per_grant?: number;
          id?: number;
          is_active?: boolean;
          name?: string;
          start_at?: string;
          theme?: string | null;
        };
        Relationships: [];
      };
      gacha_history: {
        Row: {
          event_id: number;
          id: number;
          played_at: string;
          reward_id: number;
          user_id: string;
        };
        Insert: {
          event_id: number;
          id?: number;
          played_at?: string;
          reward_id: number;
          user_id: string;
        };
        Update: {
          event_id?: number;
          id?: number;
          played_at?: string;
          reward_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gacha_history_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "gacha_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gacha_history_reward_id_fkey";
            columns: ["reward_id"];
            isOneToOne: false;
            referencedRelation: "gacha_rewards";
            referencedColumns: ["id"];
          },
        ];
      };
      gacha_missions: {
        Row: {
          created_at: string;
          description: string | null;
          event_id: number;
          id: number;
          is_active: boolean;
          mission_type: string;
          name: string;
          requirement: Json;
          show_trigger: boolean;
          token_reward: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          event_id: number;
          id?: number;
          is_active?: boolean;
          mission_type: string;
          name: string;
          requirement?: Json;
          show_trigger?: boolean;
          token_reward?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          event_id?: number;
          id?: number;
          is_active?: boolean;
          mission_type?: string;
          name?: string;
          requirement?: Json;
          show_trigger?: boolean;
          token_reward?: number;
        };
        Relationships: [
          {
            foreignKeyName: "gacha_missions_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "gacha_events";
            referencedColumns: ["id"];
          },
        ];
      };
      gacha_rewards: {
        Row: {
          claimed_count: number;
          created_at: string;
          description: string | null;
          event_id: number;
          id: number;
          is_active: boolean;
          is_golden: boolean;
          max_quantity: number | null;
          name: string;
          percent_display: number;
          reward_type: string;
          thumbnail_url: string | null;
          value: string | null;
          weight: number | null;
        };
        Insert: {
          claimed_count?: number;
          created_at?: string;
          description?: string | null;
          event_id: number;
          id?: number;
          is_active?: boolean;
          is_golden?: boolean;
          max_quantity?: number | null;
          name: string;
          percent_display?: number;
          reward_type: string;
          thumbnail_url?: string | null;
          value?: string | null;
          weight?: number | null;
        };
        Update: {
          claimed_count?: number;
          created_at?: string;
          description?: string | null;
          event_id?: number;
          id?: number;
          is_active?: boolean;
          is_golden?: boolean;
          max_quantity?: number | null;
          name?: string;
          percent_display?: number;
          reward_type?: string;
          thumbnail_url?: string | null;
          value?: string | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "gacha_rewards_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "gacha_events";
            referencedColumns: ["id"];
          },
        ];
      };
      gacha_user_missions: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: number;
          is_completed: boolean;
          mission_id: number;
          progress: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: never;
          is_completed?: boolean;
          mission_id: number;
          progress?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: never;
          is_completed?: boolean;
          mission_id?: number;
          progress?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gacha_user_missions_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "gacha_missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gacha_user_missions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_card_redemptions: {
        Row: {
          gift_card_id: number;
          id: number;
          points_credited: number;
          redeemed_at: string;
          transaction_id: number | null;
          user_id: string;
        };
        Insert: {
          gift_card_id: number;
          id?: number;
          points_credited: number;
          redeemed_at?: string;
          transaction_id?: number | null;
          user_id: string;
        };
        Update: {
          gift_card_id?: number;
          id?: number;
          points_credited?: number;
          redeemed_at?: string;
          transaction_id?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_card_redemptions_gift_card_id_fkey";
            columns: ["gift_card_id"];
            isOneToOne: false;
            referencedRelation: "gift_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_card_redemptions_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "point_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_cards: {
        Row: {
          batch_label: string | null;
          code: string;
          created_at: string;
          expires_at: string | null;
          id: number;
          is_active: boolean;
          is_scratched: boolean;
          issued_to_user_id: string | null;
          note: string | null;
          points_value: number;
          redeemed_at: string | null;
          redeemed_by_user_id: string | null;
          theme_id: string | null;
        };
        Insert: {
          batch_label?: string | null;
          code: string;
          created_at?: string;
          expires_at?: string | null;
          id?: number;
          is_active?: boolean;
          is_scratched?: boolean;
          issued_to_user_id?: string | null;
          note?: string | null;
          points_value: number;
          redeemed_at?: string | null;
          redeemed_by_user_id?: string | null;
          theme_id?: string | null;
        };
        Update: {
          batch_label?: string | null;
          code?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: number;
          is_active?: boolean;
          is_scratched?: boolean;
          issued_to_user_id?: string | null;
          note?: string | null;
          points_value?: number;
          redeemed_at?: string | null;
          redeemed_by_user_id?: string | null;
          theme_id?: string | null;
        };
        Relationships: [];
      };
      gift_products: {
        Row: {
          created_at: string;
          gift_product_id: string;
          id: string;
          product_id: string;
          quantity: number;
        };
        Insert: {
          created_at?: string;
          gift_product_id: string;
          id?: string;
          product_id: string;
          quantity?: number;
        };
        Update: {
          created_at?: string;
          gift_product_id?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "gift_products_gift_product_id_fkey";
            columns: ["gift_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      hero_campaigns: {
        Row: {
          created_at: string | null;
          cta_link: string;
          cta_text: string;
          description: string;
          id: string;
          image_url: string;
          is_active: boolean;
          priority: number;
          subtitle: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          cta_link?: string;
          cta_text?: string;
          description: string;
          id?: string;
          image_url: string;
          is_active?: boolean;
          priority?: number;
          subtitle: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          cta_link?: string;
          cta_text?: string;
          description?: string;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          priority?: number;
          subtitle?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      inventory_ledger: {
        Row: {
          balance_after: number;
          created_at: string;
          id: string;
          note: string | null;
          product_id: string;
          quantity_change: number;
          reference_id: string;
          reference_type: string;
          total_value: number;
          unit_cost: number;
          variant_id: string | null;
        };
        Insert: {
          balance_after: number;
          created_at?: string;
          id?: string;
          note?: string | null;
          product_id: string;
          quantity_change: number;
          reference_id: string;
          reference_type: string;
          total_value: number;
          unit_cost: number;
          variant_id?: string | null;
        };
        Update: {
          balance_after?: number;
          created_at?: string;
          id?: string;
          note?: string | null;
          product_id?: string;
          quantity_change?: number;
          reference_id?: string;
          reference_type?: string;
          total_value?: number;
          unit_cost?: number;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_ledger_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_ledger_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "kit_component_variants";
            referencedColumns: ["product_variant_id"];
          },
          {
            foreignKeyName: "inventory_ledger_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      maker_releases: {
        Row: {
          content: string;
          created_at: string | null;
          excerpt: string | null;
          id: string;
          maker_name: string | null;
          published_at: string | null;
          source_url: string | null;
          thumbnail: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          excerpt?: string | null;
          id?: string;
          maker_name?: string | null;
          published_at?: string | null;
          source_url?: string | null;
          thumbnail?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          excerpt?: string | null;
          id?: string;
          maker_name?: string | null;
          published_at?: string | null;
          source_url?: string | null;
          thumbnail?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          email: string;
          id: string;
          is_active: boolean;
          subscribed_at: string | null;
        };
        Insert: {
          email: string;
          id?: string;
          is_active?: boolean;
          subscribed_at?: string | null;
        };
        Update: {
          email?: string;
          id?: string;
          is_active?: boolean;
          subscribed_at?: string | null;
        };
        Relationships: [];
      };
      order_item_components: {
        Row: {
          component_group: string;
          created_at: string | null;
          id: string;
          is_pre_order: boolean;
          order_id: string | null;
          order_item_id: string | null;
          pre_order_config: Json | null;
          price_adjustment: number | null;
          product_variant_id: string;
          quantity: number;
          thumbnail: string | null;
          variant_name: string;
        };
        Insert: {
          component_group: string;
          created_at?: string | null;
          id?: string;
          is_pre_order?: boolean;
          order_id?: string | null;
          order_item_id?: string | null;
          pre_order_config?: Json | null;
          price_adjustment?: number | null;
          product_variant_id: string;
          quantity?: number;
          thumbnail?: string | null;
          variant_name: string;
        };
        Update: {
          component_group?: string;
          created_at?: string | null;
          id?: string;
          is_pre_order?: boolean;
          order_id?: string | null;
          order_item_id?: string | null;
          pre_order_config?: Json | null;
          price_adjustment?: number | null;
          product_variant_id?: string;
          quantity?: number;
          thumbnail?: string | null;
          variant_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_components_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_components_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string | null;
          pre_order_tracking: Json | null;
          is_pre_order: boolean;
          pre_order_config: Json | null;
          product_id: string | null;
          product_name: string;
          quantity: number;
          thumbnail: string | null;
          unit_price: number;
          variant_id: string | null;
        };
        Insert: {
          id: string;
          order_id?: string | null;
          pre_order_tracking?: Json | null;
          is_pre_order?: boolean;
          pre_order_config?: Json | null;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          thumbnail?: string | null;
          unit_price: number;
          variant_id?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          pre_order_tracking?: Json | null;
          is_pre_order?: boolean;
          pre_order_config?: Json | null;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          thumbnail?: string | null;
          unit_price?: number;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_services: {
        Row: {
          attachments: Json;
          created_at: string;
          customer_note: string | null;
          handling_days_snapshot: number;
          id: string;
          inbound_tracking_number: string | null;
          order_id: string | null;
          paid_at: string | null;
          pickup_at: string | null;
          pickup_note: string | null;
          price: number;
          quantity: number;
          received_at: string | null;
          refunded_at: string | null;
          selected_options: Json;
          service_id: string | null;
          service_name: string | null;
        };
        Insert: {
          attachments?: Json;
          created_at?: string;
          customer_note?: string | null;
          handling_days_snapshot?: number;
          id: string;
          inbound_tracking_number?: string | null;
          order_id?: string | null;
          paid_at?: string | null;
          pickup_at?: string | null;
          pickup_note?: string | null;
          price: number;
          quantity?: number;
          received_at?: string | null;
          refunded_at?: string | null;
          selected_options?: Json;
          service_id?: string | null;
          service_name?: string | null;
        };
        Update: {
          attachments?: Json;
          created_at?: string;
          customer_note?: string | null;
          handling_days_snapshot?: number;
          id?: string;
          inbound_tracking_number?: string | null;
          order_id?: string | null;
          paid_at?: string | null;
          pickup_at?: string | null;
          pickup_note?: string | null;
          price?: number;
          quantity?: number;
          received_at?: string | null;
          refunded_at?: string | null;
          selected_options?: Json;
          service_id?: string | null;
          service_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_services_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status: {
        Row: {
          description: string;
          status: string;
        };
        Insert: {
          description?: string;
          status: string;
        };
        Update: {
          description?: string;
          status?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          cancelled_at: string | null;
          cancelled_note: string | null;
          created_at: string | null;
          delivered_at: string | null;
          delivering_at: string | null;
          delivery_address: Json | null;
          deposit_amount: number | null;
          deposit_paid_at: string | null;
          deposit_percentage: number | null;
          expected_delivery_at: string | null;
          gift_items_snapshot: Json | null;
          id: string;
          invoice_url: string | null;
          order_number: string;
          paid_at: string | null;
          payment_reminder_sent_at: string | null;
          payment_type: string;
          pickup_at: string | null;
          pickup_code_expires_at: string | null;
          pickup_code_hash: string | null;
          pickup_code_locked_until: string | null;
          pickup_code_tries: number;
          pickup_verified_at: string | null;
          refunded_at: string | null;
          remaining_amount: number | null;
          returning_at: string | null;
          returning_reason: string | null;
          shipping_discount_amount: number;
          shipping_fee: number | null;
          shipping_method_id: string | null;
          status: string;
          total_price: number;
          tracking_carrier_id: string | null;
          tracking_number: string | null;
          updated_at: string | null;
          user_id: string | null;
          voucher_code: string | null;
          voucher_discount_amount: number;
          voucher_id: string | null;
          voucher_snapshot: Json | null;
        };
        Insert: {
          cancelled_at?: string | null;
          cancelled_note?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          delivering_at?: string | null;
          delivery_address?: Json | null;
          deposit_amount?: number | null;
          deposit_paid_at?: string | null;
          deposit_percentage?: number | null;
          expected_delivery_at?: string | null;
          gift_items_snapshot?: Json | null;
          id: string;
          invoice_url?: string | null;
          order_number: string;
          paid_at?: string | null;
          payment_reminder_sent_at?: string | null;
          payment_type?: string;
          pickup_at?: string | null;
          pickup_code_expires_at?: string | null;
          pickup_code_hash?: string | null;
          pickup_code_locked_until?: string | null;
          pickup_code_tries?: number;
          pickup_verified_at?: string | null;
          refunded_at?: string | null;
          remaining_amount?: number | null;
          returning_at?: string | null;
          returning_reason?: string | null;
          shipping_discount_amount?: number;
          shipping_fee?: number | null;
          shipping_method_id?: string | null;
          status?: string;
          total_price: number;
          tracking_carrier_id?: string | null;
          tracking_number?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          voucher_code?: string | null;
          voucher_discount_amount?: number;
          voucher_id?: string | null;
          voucher_snapshot?: Json | null;
        };
        Update: {
          cancelled_at?: string | null;
          cancelled_note?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          delivering_at?: string | null;
          delivery_address?: Json | null;
          deposit_amount?: number | null;
          deposit_paid_at?: string | null;
          deposit_percentage?: number | null;
          expected_delivery_at?: string | null;
          gift_items_snapshot?: Json | null;
          id?: string;
          invoice_url?: string | null;
          order_number?: string;
          paid_at?: string | null;
          payment_reminder_sent_at?: string | null;
          payment_type?: string;
          pickup_at?: string | null;
          pickup_code_expires_at?: string | null;
          pickup_code_hash?: string | null;
          pickup_code_locked_until?: string | null;
          pickup_code_tries?: number;
          pickup_verified_at?: string | null;
          refunded_at?: string | null;
          remaining_amount?: number | null;
          returning_at?: string | null;
          returning_reason?: string | null;
          shipping_discount_amount?: number;
          shipping_fee?: number | null;
          shipping_method_id?: string | null;
          status?: string;
          total_price?: number;
          tracking_carrier_id?: string | null;
          tracking_number?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          voucher_code?: string | null;
          voucher_discount_amount?: number;
          voucher_id?: string | null;
          voucher_snapshot?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_shipping_method_id_fkey";
            columns: ["shipping_method_id"];
            isOneToOne: false;
            referencedRelation: "shipping_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "order_status";
            referencedColumns: ["status"];
          },
          {
            foreignKeyName: "orders_tracking_carrier_id_fkey";
            columns: ["tracking_carrier_id"];
            isOneToOne: false;
            referencedRelation: "carriers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_voucher_id_fkey";
            columns: ["voucher_id"];
            isOneToOne: false;
            referencedRelation: "vouchers";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_information: {
        Row: {
          account_name: string;
          account_number: string;
          bank_logo_url: string | null;
          created_at: string | null;
          id: string;
          platform_name: string;
          platform_type: string;
          updated_at: string | null;
        };
        Insert: {
          account_name: string;
          account_number: string;
          bank_logo_url?: string | null;
          created_at?: string | null;
          id?: string;
          platform_name: string;
          platform_type: string;
          updated_at?: string | null;
        };
        Update: {
          account_name?: string;
          account_number?: string;
          bank_logo_url?: string | null;
          created_at?: string | null;
          id?: string;
          platform_name?: string;
          platform_type?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      point_rules: {
        Row: {
          description: string | null;
          id: number;
          is_active: boolean;
          rate_type: string;
          rate_value: number;
          rule_type: string;
          updated_at: string;
        };
        Insert: {
          description?: string | null;
          id?: number;
          is_active?: boolean;
          rate_type?: string;
          rate_value?: number;
          rule_type: string;
          updated_at?: string;
        };
        Update: {
          description?: string | null;
          id?: number;
          is_active?: boolean;
          rate_type?: string;
          rate_value?: number;
          rule_type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      point_transactions: {
        Row: {
          balance_after: number;
          created_at: string;
          delta: number;
          id: number;
          note: string | null;
          source_ref: string | null;
          source_type: string;
          checkin_event_id: string | null;
          checkin_batch_id: string | null;
          user_id: string;
        };
        Insert: {
          balance_after: number;
          created_at?: string;
          delta: number;
          id?: number;
          note?: string | null;
          source_ref?: string | null;
          source_type: string;
          user_id: string;
        };
        Update: {
          balance_after?: number;
          created_at?: string;
          delta?: number;
          id?: number;
          note?: string | null;
          source_ref?: string | null;
          source_type?: string;
          checkin_event_id?: string | null;
          checkin_batch_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      product_components: {
        Row: {
          component_group: string;
          component_product_id: string | null;
          id: string;
          is_required: boolean | null;
          max_quantity: number | null;
          parent_product_id: string | null;
        };
        Insert: {
          component_group: string;
          component_product_id?: string | null;
          id: string;
          is_required?: boolean | null;
          max_quantity?: number | null;
          parent_product_id?: string | null;
        };
        Update: {
          component_group?: string;
          component_product_id?: string | null;
          id?: string;
          is_required?: boolean | null;
          max_quantity?: number | null;
          parent_product_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_components_component_product_id_fkey";
            columns: ["component_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_components_parent_product_id_fkey";
            columns: ["parent_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_reviews: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          is_visible: boolean;
          product_id: string;
          rating: number;
          reply: string | null;
          reviewer_name: string;
          source: string;
          title: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_visible?: boolean;
          product_id: string;
          rating: number;
          reply?: string | null;
          reviewer_name?: string;
          source?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_visible?: boolean;
          product_id?: string;
          rating?: number;
          reply?: string | null;
          reviewer_name?: string;
          source?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          attributes: Json | null;
          created_at: string;
          id: string;
          is_pre_order: boolean;
          pre_order_config: Json | null;
          price_adjustment: number | null;
          product_id: string | null;
          product_name: string | null;
          stock_quantity: number | null;
          thumbnail: string | null;
          updated_at: string;
          variant_name: string;
        };
        Insert: {
          attributes?: Json | null;
          created_at?: string;
          id: string;
          is_pre_order?: boolean;
          pre_order_config?: Json | null;
          price_adjustment?: number | null;
          product_id?: string | null;
          product_name?: string | null;
          stock_quantity?: number | null;
          thumbnail?: string | null;
          updated_at?: string;
          variant_name: string;
        };
        Update: {
          attributes?: Json | null;
          created_at?: string;
          id?: string;
          is_pre_order?: boolean;
          pre_order_config?: Json | null;
          price_adjustment?: number | null;
          product_id?: string | null;
          product_name?: string | null;
          stock_quantity?: number | null;
          thumbnail?: string | null;
          updated_at?: string;
          variant_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          attributes: Json | null;
          base_price: number;
          brand: string | null;
          category_id: string | null;
          created_at: string;
          description: string | null;
          disable_ratings: boolean;
          id: string;
          images: Json | null;
          is_active: boolean;
          is_pre_order: boolean;
          is_used: boolean | null;
          max_quantity: number | null;
          name: string;
          parent_product_id: string | null;
          product_type: string;
          sale_ends_at: string | null;
          slug: string;
          sold_count: number;
          stock_quantity: number | null;
          thumbnail: string | null;
          updated_at: string;
        };
        Insert: {
          attributes?: Json | null;
          base_price: number;
          brand?: string | null;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          disable_ratings?: boolean;
          id?: string;
          images?: Json | null;
          is_active?: boolean;
          is_pre_order?: boolean;
          is_used?: boolean | null;
          max_quantity?: number | null;
          name: string;
          parent_product_id?: string | null;
          product_type?: string;
          sale_ends_at?: string | null;
          slug: string;
          sold_count?: number;
          stock_quantity?: number | null;
          thumbnail?: string | null;
          updated_at?: string;
        };
        Update: {
          attributes?: Json | null;
          base_price?: number;
          brand?: string | null;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          disable_ratings?: boolean;
          id?: string;
          images?: Json | null;
          is_active?: boolean;
          is_pre_order?: boolean;
          is_used?: boolean | null;
          max_quantity?: number | null;
          name?: string;
          parent_product_id?: string | null;
          product_type?: string;
          sale_ends_at?: string | null;
          slug?: string;
          sold_count?: number;
          stock_quantity?: number | null;
          thumbnail?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_parent_product_id_fkey";
            columns: ["parent_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          device_platform: string | null;
          endpoint: string;
          id: string;
          is_active: boolean;
          last_seen_at: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          device_platform?: string | null;
          endpoint: string;
          id?: string;
          is_active?: boolean;
          last_seen_at?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          device_platform?: string | null;
          endpoint?: string;
          id?: string;
          is_active?: boolean;
          last_seen_at?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      rank_history: {
        Row: {
          changed_by: string;
          created_at: string;
          from_rank_id: string | null;
          id: string;
          reason: string | null;
          to_rank_id: string | null;
          user_id: string;
        };
        Insert: {
          changed_by: string;
          created_at?: string;
          from_rank_id?: string | null;
          id?: string;
          reason?: string | null;
          to_rank_id?: string | null;
          user_id: string;
        };
        Update: {
          changed_by?: string;
          created_at?: string;
          from_rank_id?: string | null;
          id?: string;
          reason?: string | null;
          to_rank_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rank_history_from_rank_id_fkey";
            columns: ["from_rank_id"];
            isOneToOne: false;
            referencedRelation: "customer_ranks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rank_history_to_rank_id_fkey";
            columns: ["to_rank_id"];
            isOneToOne: false;
            referencedRelation: "customer_ranks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rank_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      release_subscribers: {
        Row: {
          active: boolean | null;
          email: string;
          id: string;
          subscribed_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          email: string;
          id?: string;
          subscribed_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          email?: string;
          id?: string;
          subscribed_at?: string | null;
        };
        Relationships: [];
      };
      reward_claims: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json;
          point_amount: number | null;
          points_spent: number;
          product_ref: string | null;
          reward_item_id: string;
          reward_type: string;
          user_id: string;
          voucher_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          point_amount?: number | null;
          points_spent: number;
          product_ref?: string | null;
          reward_item_id: string;
          reward_type: string;
          user_id: string;
          voucher_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          point_amount?: number | null;
          points_spent?: number;
          product_ref?: string | null;
          reward_item_id?: string;
          reward_type?: string;
          user_id?: string;
          voucher_id?: string | null;
        };
        Relationships: [];
      };
      reward_items: {
        Row: {
          claimed_count: number;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          metadata: Json;
          name: string;
          points_cost: number;
          points_currency: string;
          reward_type: string;
          stock: number | null;
          updated_at: string;
        };
        Insert: {
          claimed_count?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          metadata?: Json;
          name: string;
          points_cost: number;
          points_currency?: string;
          reward_type: string;
          stock?: number | null;
          updated_at?: string;
        };
        Update: {
          claimed_count?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          metadata?: Json;
          name?: string;
          points_cost?: number;
          points_currency?: string;
          reward_type?: string;
          stock?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_configs: {
        Row: {
          base_price: number;
          created_at: string;
          handling_days: number;
          id: string;
          is_active: boolean;
          service_id: string;
          updated_at: string;
        };
        Insert: {
          base_price?: number;
          created_at?: string;
          handling_days?: number;
          id?: string;
          is_active?: boolean;
          service_id: string;
          updated_at?: string;
        };
        Update: {
          base_price?: number;
          created_at?: string;
          handling_days?: number;
          id?: string;
          is_active?: boolean;
          service_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_configs_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: true;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      service_option_values: {
        Row: {
          display_order: number;
          id: number;
          label: string;
          option_id: number;
          price_adjustment: number;
        };
        Insert: {
          display_order?: number;
          id?: number;
          label: string;
          option_id: number;
          price_adjustment?: number;
        };
        Update: {
          display_order?: number;
          id?: number;
          label?: string;
          option_id?: number;
          price_adjustment?: number;
        };
        Relationships: [
          {
            foreignKeyName: "service_option_values_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "service_options";
            referencedColumns: ["id"];
          },
        ];
      };
      service_options: {
        Row: {
          created_at: string;
          display_order: number;
          id: number;
          is_required: boolean;
          label: string;
          service_id: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id?: number;
          is_required?: boolean;
          label: string;
          service_id: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: number;
          is_required?: boolean;
          label?: string;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_options_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      service_pricing_rules: {
        Row: {
          created_at: string | null;
          handling_days: number;
          id: string;
          key: string;
          label: string;
          metadata: Json | null;
          price: number;
          service_type: string;
          sort_order: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          handling_days?: number;
          id?: string;
          key: string;
          label: string;
          metadata?: Json | null;
          price: number;
          service_type: string;
          sort_order?: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          handling_days?: number;
          id?: string;
          key?: string;
          label?: string;
          metadata?: Json | null;
          price?: number;
          service_type?: string;
          sort_order?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          base_price: number;
          created_at: string;
          description: string | null;
          estimated_days: number | null;
          handling_days: number;
          id: string;
          is_active: boolean;
          is_bookable_on_services_page: boolean;
          max_entries: number | null;
          name: string;
          service_section: string | null;
          service_type: string;
          slug: string | null;
          thumbnail_url: string | null;
          updated_at: string;
        };
        Insert: {
          base_price: number;
          created_at?: string;
          description?: string | null;
          estimated_days?: number | null;
          handling_days?: number;
          id: string;
          is_active?: boolean;
          is_bookable_on_services_page?: boolean;
          max_entries?: number | null;
          name: string;
          service_section?: string | null;
          service_type?: string;
          slug?: string | null;
          thumbnail_url?: string | null;
          updated_at?: string;
        };
        Update: {
          base_price?: number;
          created_at?: string;
          description?: string | null;
          estimated_days?: number | null;
          handling_days?: number;
          id?: string;
          is_active?: boolean;
          is_bookable_on_services_page?: boolean;
          max_entries?: number | null;
          name?: string;
          service_section?: string | null;
          service_type?: string;
          slug?: string | null;
          thumbnail_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      shipping_methods: {
        Row: {
          description: string | null;
          estimated_hours_max: number | null;
          estimated_hours_min: number | null;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
        };
        Insert: {
          description?: string | null;
          estimated_hours_max?: number | null;
          estimated_hours_min?: number | null;
          id: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
        };
        Update: {
          description?: string | null;
          estimated_hours_max?: number | null;
          estimated_hours_min?: number | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      stock_alert_subscriptions: {
        Row: {
          created_at: string;
          id: string;
          notified_at: string | null;
          product_id: string;
          user_id: string;
          variant_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notified_at?: string | null;
          product_id: string;
          user_id: string;
          variant_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          notified_at?: string | null;
          product_id?: string;
          user_id?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_alert_subscriptions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_alert_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_alert_subscriptions_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "kit_component_variants";
            referencedColumns: ["product_variant_id"];
          },
          {
            foreignKeyName: "stock_alert_subscriptions_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          address: string | null;
          contact_name: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          phone: string | null;
          slug: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          phone?: string | null;
          slug?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          slug?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          admin_notes: string | null;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          order_id: string | null;
          order_item_id: string | null;
          resolved_at: string | null;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_notes?: string | null;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          order_id?: string | null;
          order_item_id?: string | null;
          resolved_at?: string | null;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_notes?: string | null;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          order_id?: string | null;
          order_item_id?: string | null;
          resolved_at?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          created_at: string | null;
          date: string;
          id: string;
          is_active: boolean;
          name: string;
          order: number;
          product: string | null;
          rating: number;
          text: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          id?: string;
          is_active?: boolean;
          name: string;
          order?: number;
          product?: string | null;
          rating?: number;
          text: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          order?: number;
          product?: string | null;
          rating?: number;
          text?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      ticket_attachments: {
        Row: {
          created_at: string;
          file_name: string;
          file_size: number;
          file_url: string;
          id: string;
          mime_type: string;
          ticket_id: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_size?: number;
          file_url: string;
          id?: string;
          mime_type?: string;
          ticket_id: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_size?: number;
          file_url?: string;
          id?: string;
          mime_type?: string;
          ticket_id?: string;
        };
        Relationships: [];
      };
      trust_props: {
        Row: {
          body: string;
          created_at: string | null;
          heading: string;
          icon: string;
          id: string;
          order: number;
        };
        Insert: {
          body: string;
          created_at?: string | null;
          heading: string;
          icon: string;
          id?: string;
          order?: number;
        };
        Update: {
          body?: string;
          created_at?: string | null;
          heading?: string;
          icon?: string;
          id?: string;
          order?: number;
        };
        Relationships: [];
      };
      user_addresses: {
        Row: {
          address: string | null;
          address_line: string;
          city: string;
          city_code: string | null;
          country: string;
          created_at: string;
          district: string | null;
          district_code: string | null;
          full_name: string | null;
          id: string;
          is_default: boolean | null;
          phone_number: string | null;
          updated_at: string;
          user_id: string | null;
          ward: string | null;
          ward_code: string | null;
        };
        Insert: {
          address?: string | null;
          address_line: string;
          city: string;
          city_code?: string | null;
          country: string;
          created_at?: string;
          district?: string | null;
          district_code?: string | null;
          full_name?: string | null;
          id: string;
          is_default?: boolean | null;
          phone_number?: string | null;
          updated_at?: string;
          user_id?: string | null;
          ward?: string | null;
          ward_code?: string | null;
        };
        Update: {
          address?: string | null;
          address_line?: string;
          city?: string;
          city_code?: string | null;
          country?: string;
          created_at?: string;
          district?: string | null;
          district_code?: string | null;
          full_name?: string | null;
          id?: string;
          is_default?: boolean | null;
          phone_number?: string | null;
          updated_at?: string;
          user_id?: string | null;
          ward?: string | null;
          ward_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_event_tokens: {
        Row: {
          event_id: number;
          id: number;
          last_free_token_at: string | null;
          token_count: number;
          user_id: string;
        };
        Insert: {
          event_id: number;
          id?: number;
          last_free_token_at?: string | null;
          token_count?: number;
          user_id: string;
        };
        Update: {
          event_id?: number;
          id?: number;
          last_free_token_at?: string | null;
          token_count?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_event_tokens_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "gacha_events";
            referencedColumns: ["id"];
          },
        ];
      };
      user_mission_progress: {
        Row: {
          claimed_at: string | null;
          completed_at: string | null;
          id: number;
          mission_id: number;
          progress: Json;
          user_id: string;
        };
        Insert: {
          claimed_at?: string | null;
          completed_at?: string | null;
          id?: number;
          mission_id: number;
          progress?: Json;
          user_id: string;
        };
        Update: {
          claimed_at?: string | null;
          completed_at?: string | null;
          id?: number;
          mission_id?: number;
          progress?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_mission_progress_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "gacha_missions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_notifications: {
        Row: {
          body: string;
          created_at: string;
          deep_link: string | null;
          id: string;
          metadata: Json;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          deep_link?: string | null;
          id?: string;
          metadata?: Json;
          read_at?: string | null;
          title: string;
          type?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          deep_link?: string | null;
          id?: string;
          metadata?: Json;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          email: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          phone_number: string | null;
          points_balance: number;
          rank_id: string | null;
          rank_updated_at: string | null;
          role: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          phone_number?: string | null;
          points_balance?: number;
          rank_id?: string | null;
          rank_updated_at?: string | null;
          role?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          phone_number?: string | null;
          points_balance?: number;
          rank_id?: string | null;
          rank_updated_at?: string | null;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_rank_id_fkey";
            columns: ["rank_id"];
            isOneToOne: false;
            referencedRelation: "customer_ranks";
            referencedColumns: ["id"];
          },
        ];
      };
      vouchers: {
        Row: {
          amount_off: number | null;
          applies_to_category_slugs: string[] | null;
          applies_to_product_ids: string[] | null;
          applies_to_shipping_methods: string[] | null;
          auto_apply: boolean;
          code: string;
          created_at: string;
          created_by: string | null;
          customer_ids: string[] | null;
          source_type: string;
          checkin_event_id: string | null;
          checkin_batch_id: string | null;
          deleted_at: string | null;
          description: string | null;
          end_at: string | null;
          excluded_product_ids: string[] | null;
          gift_product_id: string | null;
          gift_quantity: number | null;
          gift_variant_id: string | null;
          id: string;
          max_discount_amount: number | null;
          metadata: Json;
          min_item_quantity: number | null;
          min_order_amount: number;
          name: string;
          percent_off: number | null;
          reward_type: Database["public"]["Enums"]["voucher_reward_type"];
          scope_type: Database["public"]["Enums"]["voucher_scope_type"];
          stackable: boolean;
          start_at: string | null;
          status: Database["public"]["Enums"]["voucher_status"];
          updated_at: string;
          usage_limit_per_user: number | null;
          usage_limit_total: number | null;
          used_count: number;
          user_id: string | null;
        };
        Insert: {
          amount_off?: number | null;
          applies_to_category_slugs?: string[] | null;
          applies_to_product_ids?: string[] | null;
          applies_to_shipping_methods?: string[] | null;
          auto_apply?: boolean;
          code: string;
          created_at?: string;
          created_by?: string | null;
          customer_ids?: string[] | null;
          source_type?: string;
          checkin_event_id?: string | null;
          checkin_batch_id?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          end_at?: string | null;
          excluded_product_ids?: string[] | null;
          gift_product_id?: string | null;
          gift_quantity?: number | null;
          gift_variant_id?: string | null;
          id?: string;
          max_discount_amount?: number | null;
          metadata?: Json;
          min_item_quantity?: number | null;
          min_order_amount?: number;
          name: string;
          percent_off?: number | null;
          reward_type: Database["public"]["Enums"]["voucher_reward_type"];
          scope_type?: Database["public"]["Enums"]["voucher_scope_type"];
          stackable?: boolean;
          start_at?: string | null;
          status?: Database["public"]["Enums"]["voucher_status"];
          updated_at?: string;
          usage_limit_per_user?: number | null;
          usage_limit_total?: number | null;
          used_count?: number;
          user_id?: string | null;
        };
        Update: {
          amount_off?: number | null;
          applies_to_category_slugs?: string[] | null;
          applies_to_product_ids?: string[] | null;
          applies_to_shipping_methods?: string[] | null;
          auto_apply?: boolean;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          customer_ids?: string[] | null;
          source_type?: string;
          checkin_event_id?: string | null;
          checkin_batch_id?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          end_at?: string | null;
          excluded_product_ids?: string[] | null;
          gift_product_id?: string | null;
          gift_quantity?: number | null;
          gift_variant_id?: string | null;
          id?: string;
          max_discount_amount?: number | null;
          metadata?: Json;
          min_item_quantity?: number | null;
          min_order_amount?: number;
          name?: string;
          percent_off?: number | null;
          reward_type?: Database["public"]["Enums"]["voucher_reward_type"];
          scope_type?: Database["public"]["Enums"]["voucher_scope_type"];
          stackable?: boolean;
          start_at?: string | null;
          status?: Database["public"]["Enums"]["voucher_status"];
          updated_at?: string;
          usage_limit_per_user?: number | null;
          usage_limit_total?: number | null;
          used_count?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vouchers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vouchers_gift_product_id_fkey";
            columns: ["gift_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vouchers_gift_variant_id_fkey";
            columns: ["gift_variant_id"];
            isOneToOne: false;
            referencedRelation: "kit_component_variants";
            referencedColumns: ["product_variant_id"];
          },
          {
            foreignKeyName: "vouchers_gift_variant_id_fkey";
            columns: ["gift_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouse_export_items: {
        Row: {
          export_id: string;
          id: string;
          product_id: string;
          quantity: number;
          total_cost: number;
          unit_cost: number;
          variant_id: string | null;
        };
        Insert: {
          export_id: string;
          id?: string;
          product_id: string;
          quantity: number;
          total_cost: number;
          unit_cost: number;
          variant_id?: string | null;
        };
        Update: {
          export_id?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          total_cost?: number;
          unit_cost?: number;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_export_items_export_id_fkey";
            columns: ["export_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_exports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_export_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_export_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "kit_component_variants";
            referencedColumns: ["product_variant_id"];
          },
          {
            foreignKeyName: "warehouse_export_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouse_exports: {
        Row: {
          created_at: string;
          created_by: string;
          export_number: string | null;
          id: string;
          notes: string | null;
          reason: Database["public"]["Enums"]["warehouse_export_reason"];
          reference_id: string | null;
          reference_type: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          export_number?: string | null;
          id?: string;
          notes?: string | null;
          reason: Database["public"]["Enums"]["warehouse_export_reason"];
          reference_id?: string | null;
          reference_type?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          export_number?: string | null;
          id?: string;
          notes?: string | null;
          reason?: Database["public"]["Enums"]["warehouse_export_reason"];
          reference_id?: string | null;
          reference_type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_exports_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouse_receipt_items: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          receipt_id: string;
          total_cost: number;
          unit_cost: number;
          variant_id: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity: number;
          receipt_id: string;
          total_cost: number;
          unit_cost: number;
          variant_id?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          quantity?: number;
          receipt_id?: string;
          total_cost?: number;
          unit_cost?: number;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_receipt_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_receipt_items_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_receipt_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "kit_component_variants";
            referencedColumns: ["product_variant_id"];
          },
          {
            foreignKeyName: "warehouse_receipt_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouse_receipts: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          notes: string | null;
          receipt_number: string | null;
          status: string;
          supplier_id: string | null;
          supplier_name: string | null;
          total_cost: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          notes?: string | null;
          receipt_number?: string | null;
          status?: string;
          supplier_id?: string | null;
          supplier_name?: string | null;
          total_cost?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          notes?: string | null;
          receipt_number?: string | null;
          status?: string;
          supplier_id?: string | null;
          supplier_name?: string | null;
          total_cost?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_receipts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_receipts_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlists: {
        Row: {
          added_at: string;
          id: string;
          product_id: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          id?: string;
          product_id: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          id?: string;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      kit_component_variants: {
        Row: {
          attributes: Json | null;
          component_group: string | null;
          component_product_id: string | null;
          component_product_name: string | null;
          kit_product_id: string | null;
          kit_product_name: string | null;
          price_adjustment: number | null;
          product_variant_id: string | null;
          stock_quantity: number | null;
          variant_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_components_component_product_id_fkey";
            columns: ["component_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_components_parent_product_id_fkey";
            columns: ["kit_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      get_checkout_idempotent_response: {
        Args: { p_user_id: string; p_idempotency_key: string };
        Returns: Json;
      };
      adjust_points: {
        Args: {
          p_admin_id: string;
          p_delta: number;
          p_note?: string;
          p_user_id: string;
        };
        Returns: {
          new_balance: number;
          transaction_id: number;
        }[];
      };
      can_post_community: { Args: { kind: string }; Returns: boolean };
      cancel_expired_orders: { Args: never; Returns: Json };
      claim_mission_reward: {
        Args: { p_event_id: number; p_mission_id: number; p_user_id: string };
        Returns: Json;
      };
      compute_points_for_amount: {
        Args: { p_amount: number; p_rule_type: string };
        Returns: number;
      };
      earn_points: {
        Args: {
          p_amount?: number;
          p_note?: string;
          p_source_ref?: string;
          p_source_type: string;
          p_user_id: string;
        };
        Returns: {
          new_balance: number;
          transaction_id: number;
        }[];
      };
      generate_export_number: { Args: { prefix: string }; Returns: string };
      generate_id: { Args: never; Returns: string };
      generate_warehouse_number: { Args: { prefix: string }; Returns: string };
      get_gacha_reward_winners: {
        Args: { event_id: number; reward_id: number };
        Returns: {
          history_id: number;
          played_at: string;
          plays_count: number;
          user_email: string;
          user_id: string;
          user_name: string;
          win_rate: number;
          wins_count: number;
        }[];
      };
      get_kit_stock: { Args: { kit_id: string }; Returns: number };
      increment_community_post_view_count: {
        Args: { p_post_id: string };
        Returns: undefined;
      };
      get_pending_payment_orders: {
        Args: never;
        Returns: {
          created_at: string;
          order_id: string;
          order_number: string;
          total_price: number;
          user_email: string;
          user_id: string;
        }[];
      };
      get_point_rule: {
        Args: { p_rule_type: string };
        Returns: {
          rate_type: string;
          rate_value: number;
        }[];
      };
      get_user_order_stats: {
        Args: { p_user_id: string };
        Returns: {
          order_count: number;
          total_spent: number;
        }[];
      };
      increment_voucher_used_count: {
        Args: { p_voucher_id: string };
        Returns: undefined;
      };
      mark_payment_reminder_sent: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
      process_mission_progress: {
        Args: {
          p_context?: Json;
          p_event_id: number;
          p_mission_type: string;
          p_user_id: string;
        };
        Returns: {
          r_mission_id: number;
          r_newly_completed: boolean;
        }[];
      };
      process_payment_reminders: { Args: never; Returns: undefined };
      reconcile_product_sold_count: {
        Args: { p_product_id: string };
        Returns: undefined;
      };
      redeem_gift_card: {
        Args: { p_code: string; p_user_id: string };
        Returns: {
          gift_card_id: number;
          new_balance: number;
          points_credited: number;
        }[];
      };
      reverse_point_transactions: {
        Args: {
          p_admin_id: string;
          p_note?: string;
          p_source_ref: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      spend_points: {
        Args: {
          p_amount: number;
          p_note?: string;
          p_source_ref?: string;
          p_source_type: string;
          p_user_id: string;
        };
        Returns: {
          new_balance: number;
          transaction_id: number;
        }[];
      };
      submit_order_with_gifts: {
        Args: {
          p_gift_items: Json;
          p_items: Json;
          p_order_id: string;
          p_order_number: string;
          p_shipping_cost: number;
          p_total_price: number;
          p_user_id: string;
        };
        Returns: Json;
      };
      submit_order_with_checkout: {
        Args: {
          p_order_id: string;
          p_user_id: string;
          p_order_number: string;
          p_total_price: number;
          p_shipping_cost: number;
          p_items: Json;
          p_gift_items: Json;
          p_idempotency_key: string;
          p_request_hash: string;
          p_vouchers: Json;
          p_voucher_discount_amount: number;
          p_shipping_discount_amount: number;
          p_voucher_snapshot: Json;
          p_gift_items_snapshot: Json;
        };
        Returns: Json;
      };
      validate_and_deduct_stock: { Args: { p_items: Json }; Returns: Json };
      warm_cache: { Args: never; Returns: undefined };
    };
    Enums: {
      voucher_reward_type:
        | "amount_off"
        | "percent_off"
        | "shipping_amount_off"
        | "shipping_percent_off"
        | "free_shipping"
        | "gift_item";
      voucher_scope_type: "order_total" | "product" | "category";
      voucher_status: "draft" | "active" | "scheduled" | "expired" | "disabled";
      warehouse_export_reason:
        | "sale"
        | "adjustment"
        | "damage"
        | "return_to_supplier"
        | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      voucher_reward_type: [
        "amount_off",
        "percent_off",
        "shipping_amount_off",
        "shipping_percent_off",
        "free_shipping",
        "gift_item",
      ],
      voucher_scope_type: ["order_total", "product", "category"],
      voucher_status: ["draft", "active", "scheduled", "expired", "disabled"],
      warehouse_export_reason: [
        "sale",
        "adjustment",
        "damage",
        "return_to_supplier",
        "other",
      ],
    },
  },
} as const;
