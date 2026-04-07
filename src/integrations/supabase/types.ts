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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_rate_limits: {
        Row: {
          created_at: string
          function_name: string
          id: string
          portal_id: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          portal_id: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          portal_id?: string
        }
        Relationships: []
      }
      app_feedback: {
        Row: {
          admin_response: string | null
          created_at: string
          description: string | null
          id: string
          portal_id: string
          status: string
          submitted_by: string | null
          submitted_by_name: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          description?: string | null
          id?: string
          portal_id: string
          status?: string
          submitted_by?: string | null
          submitted_by_name?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          description?: string | null
          id?: string
          portal_id?: string
          status?: string
          submitted_by?: string | null
          submitted_by_name?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          portal_id: string
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          portal_id: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          portal_id?: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      commission_configurations: {
        Row: {
          configuration: Json
          created_at: string
          deal_id: string
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      commission_user_settings: {
        Row: {
          commission_percentage: number
          created_at: string
          dealer_account_id: string
          hubspot_user_id: string | null
          hubspot_user_name: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          commission_percentage?: number
          created_at?: string
          dealer_account_id: string
          hubspot_user_id?: string | null
          hubspot_user_name: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          commission_percentage?: number
          created_at?: string
          dealer_account_id?: string
          hubspot_user_id?: string | null
          hubspot_user_name?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_user_settings_dealer_account_id_fkey"
            columns: ["dealer_account_id"]
            isOneToOne: false
            referencedRelation: "dealer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_document_configurations: {
        Row: {
          configuration: Json
          created_at: string
          custom_document_id: string
          deal_id: string
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          custom_document_id: string
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          custom_document_id?: string
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_document_configurations_custom_document_id_fkey"
            columns: ["custom_document_id"]
            isOneToOne: false
            referencedRelation: "custom_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_documents: {
        Row: {
          code: string
          created_at: string
          dealer_account_id: string
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          schema: Json
          sort_order: number | null
          terms_and_conditions: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          dealer_account_id: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name: string
          schema?: Json
          sort_order?: number | null
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          dealer_account_id?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          schema?: Json
          sort_order?: number | null
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_documents_dealer_account_id_fkey"
            columns: ["dealer_account_id"]
            isOneToOne: false
            referencedRelation: "dealer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_accounts: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string
          created_at: string
          email: string | null
          hubspot_portal_id: string | null
          id: string
          logo_url: string | null
          phone: string | null
          state: string | null
          terms_and_conditions: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name: string
          created_at?: string
          email?: string | null
          hubspot_portal_id?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          state?: string | null
          terms_and_conditions?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          hubspot_portal_id?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          state?: string | null
          terms_and_conditions?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      dealer_settings: {
        Row: {
          created_at: string
          dealer_account_id: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_account_id: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_account_id?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_settings_dealer_account_id_fkey"
            columns: ["dealer_account_id"]
            isOneToOne: false
            referencedRelation: "dealer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          created_at: string
          custom_fields: Json | null
          custom_terms: string | null
          dealer_account_id: string
          document_type_id: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          custom_terms?: string | null
          dealer_account_id: string
          document_type_id: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          custom_terms?: string | null
          dealer_account_id?: string
          document_type_id?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_dealer_account_id_fkey"
            columns: ["dealer_account_id"]
            isOneToOne: false
            referencedRelation: "dealer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      document_terms: {
        Row: {
          created_at: string
          dealer_account_id: string
          document_type: string
          id: string
          terms_and_conditions: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_account_id: string
          document_type: string
          id?: string
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_account_id?: string
          document_type?: string
          id?: string
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_terms_dealer_account_id_fkey"
            columns: ["dealer_account_id"]
            isOneToOne: false
            referencedRelation: "dealer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          code: string
          default_template: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          code: string
          default_template?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          default_template?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      fmv_lease_configurations: {
        Row: {
          configuration: Json
          created_at: string
          deal_id: string
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          created_at: string
          created_by: string | null
          dealer_account_id: string
          document_data: Json
          document_type_id: string
          file_type: string | null
          file_url: string | null
          hubspot_company_id: string | null
          hubspot_deal_id: string
          id: string
          status: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dealer_account_id: string
          document_data: Json
          document_type_id: string
          file_type?: string | null
          file_url?: string | null
          hubspot_company_id?: string | null
          hubspot_deal_id: string
          id?: string
          status?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dealer_account_id?: string
          document_data?: Json
          document_type_id?: string
          file_type?: string | null
          file_url?: string | null
          hubspot_company_id?: string | null
          hubspot_deal_id?: string
          id?: string
          status?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_dealer_account_id_fkey"
            columns: ["dealer_account_id"]
            isOneToOne: false
            referencedRelation: "dealer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      hubspot_field_mappings: {
        Row: {
          association_label: string | null
          association_path: string | null
          created_at: string
          dealer_account_id: string
          document_type: string | null
          field_key: string
          hubspot_object: string
          hubspot_property: string
          id: string
          updated_at: string
        }
        Insert: {
          association_label?: string | null
          association_path?: string | null
          created_at?: string
          dealer_account_id: string
          document_type?: string | null
          field_key: string
          hubspot_object: string
          hubspot_property: string
          id?: string
          updated_at?: string
        }
        Update: {
          association_label?: string | null
          association_path?: string | null
          created_at?: string
          dealer_account_id?: string
          document_type?: string | null
          field_key?: string
          hubspot_object?: string
          hubspot_property?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hubspot_field_mappings_dealer_account_id_fkey"
            columns: ["dealer_account_id"]
            isOneToOne: false
            referencedRelation: "dealer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      hubspot_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          portal_id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          created_at?: string
          expires_at: string
          id?: string
          portal_id: string
          refresh_token?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          portal_id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      installation_configurations: {
        Row: {
          configuration: Json
          created_at: string
          deal_id: string
          id: string
          line_item_id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          deal_id: string
          id?: string
          line_item_id: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          deal_id?: string
          id?: string
          line_item_id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      interterritorial_configurations: {
        Row: {
          configuration: Json
          created_at: string
          deal_id: string
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lease_funding_configurations: {
        Row: {
          configuration: Json
          created_at: string
          deal_id: string
          id: string
          line_item_id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          deal_id: string
          id?: string
          line_item_id: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          deal_id?: string
          id?: string
          line_item_id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lease_rate_factors: {
        Row: {
          created_at: string
          id: string
          lease_program: string
          leasing_company: string
          max_amount: number | null
          min_amount: number | null
          rate_factor: number
          rate_sheet_id: string
          term_months: number
        }
        Insert: {
          created_at?: string
          id?: string
          lease_program: string
          leasing_company: string
          max_amount?: number | null
          min_amount?: number | null
          rate_factor: number
          rate_sheet_id: string
          term_months: number
        }
        Update: {
          created_at?: string
          id?: string
          lease_program?: string
          leasing_company?: string
          max_amount?: number | null
          min_amount?: number | null
          rate_factor?: number
          rate_sheet_id?: string
          term_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "lease_rate_factors_rate_sheet_id_fkey"
            columns: ["rate_sheet_id"]
            isOneToOne: false
            referencedRelation: "uploaded_rate_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_rate_sheets: {
        Row: {
          created_at: string
          effective_date: string
          expiration_date: string | null
          id: string
          is_active: boolean | null
          leasing_partner_id: string
          name: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          effective_date: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          leasing_partner_id: string
          name: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          effective_date?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          leasing_partner_id?: string
          name?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_rate_sheets_leasing_partner_id_fkey"
            columns: ["leasing_partner_id"]
            isOneToOne: false
            referencedRelation: "leasing_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_rates: {
        Row: {
          created_at: string
          id: string
          lease_type: string | null
          max_amount: number | null
          min_amount: number | null
          rate_factor: number
          rate_sheet_id: string
          term_months: number
        }
        Insert: {
          created_at?: string
          id?: string
          lease_type?: string | null
          max_amount?: number | null
          min_amount?: number | null
          rate_factor: number
          rate_sheet_id: string
          term_months: number
        }
        Update: {
          created_at?: string
          id?: string
          lease_type?: string | null
          max_amount?: number | null
          min_amount?: number | null
          rate_factor?: number
          rate_sheet_id?: string
          term_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "lease_rates_rate_sheet_id_fkey"
            columns: ["rate_sheet_id"]
            isOneToOne: false
            referencedRelation: "lease_rate_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_return_configurations: {
        Row: {
          configuration: Json
          created_at: string
          deal_id: string
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      leasing_partners: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          dealer_account_id: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          dealer_account_id: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          dealer_account_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leasing_partners_dealer_account_id_fkey"
            columns: ["dealer_account_id"]
            isOneToOne: false
            referencedRelation: "dealer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      loi_configurations: {
        Row: {
          configuration: Json | null
          created_at: string | null
          deal_id: string
          id: string
          portal_id: string
          updated_at: string | null
        }
        Insert: {
          configuration?: Json | null
          created_at?: string | null
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string | null
        }
        Update: {
          configuration?: Json | null
          created_at?: string | null
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      new_customer_configurations: {
        Row: {
          configuration: Json
          created_at: string
          deal_id: string
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_equipment_cache: {
        Row: {
          created_at: string
          equipment_object_id: string | null
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_object_id?: string | null
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_object_id?: string | null
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_tier_prices: {
        Row: {
          created_at: string
          id: string
          pricing_tier_id: string
          product_model: string
          rep_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          pricing_tier_id: string
          product_model: string
          rep_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          pricing_tier_id?: string
          product_model?: string
          rep_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tier_prices_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          portal_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          portal_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          portal_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_type_overrides: {
        Row: {
          created_at: string
          hs_product_id: string
          id: string
          portal_id: string
          product_type: string
        }
        Insert: {
          created_at?: string
          hs_product_id: string
          id?: string
          portal_id: string
          product_type: string
        }
        Update: {
          created_at?: string
          hs_product_id?: string
          id?: string
          portal_id?: string
          product_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dealer_account_id: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_account_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_account_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_dealer_account_id_fkey"
            columns: ["dealer_account_id"]
            isOneToOne: false
            referencedRelation: "dealer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_configurations: {
        Row: {
          configuration: Json
          created_at: string
          current_quote_number: string | null
          current_version_id: string | null
          deal_id: string
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration: Json
          created_at?: string
          current_quote_number?: string | null
          current_version_id?: string | null
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          current_quote_number?: string | null
          current_version_id?: string | null
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_configurations_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_templates: {
        Row: {
          configuration: Json
          created_at: string
          created_by: string | null
          created_by_name: string | null
          description: string | null
          id: string
          name: string
          portal_id: string
          shared: boolean
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          id?: string
          name: string
          portal_id: string
          shared?: boolean
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          id?: string
          name?: string
          portal_id?: string
          shared?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quote_versions: {
        Row: {
          configuration: Json
          created_at: string
          created_by: string | null
          deal_id: string
          id: string
          label: string | null
          portal_id: string
          quote_number: string
          version_number: number
        }
        Insert: {
          configuration?: Json
          created_at?: string
          created_by?: string | null
          deal_id: string
          id?: string
          label?: string | null
          portal_id: string
          quote_number: string
          version_number: number
        }
        Update: {
          configuration?: Json
          created_at?: string
          created_by?: string | null
          deal_id?: string
          id?: string
          label?: string | null
          portal_id?: string
          quote_number?: string
          version_number?: number
        }
        Relationships: []
      }
      relocation_configurations: {
        Row: {
          configuration: Json
          created_at: string
          deal_id: string
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      removal_configurations: {
        Row: {
          configuration: Json
          created_at: string
          deal_id: string
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_agreement_configurations: {
        Row: {
          configuration: Json
          created_at: string
          deal_id: string
          id: string
          portal_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          deal_id: string
          id?: string
          portal_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          deal_id?: string
          id?: string
          portal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      uploaded_rate_sheets: {
        Row: {
          created_at: string
          dealer_account_id: string
          file_name: string
          id: string
          is_active: boolean
          row_count: number | null
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          dealer_account_id: string
          file_name: string
          id?: string
          is_active?: boolean
          row_count?: number | null
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          dealer_account_id?: string
          file_name?: string
          id?: string
          is_active?: boolean
          row_count?: number | null
          uploaded_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_dealer_account_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "sales_rep"
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
      app_role: ["admin", "manager", "sales_rep"],
    },
  },
} as const
