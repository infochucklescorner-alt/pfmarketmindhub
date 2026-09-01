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
      bot_activations: {
        Row: {
          bot_id: string
          created_at: string
          id: string
          mt5_account_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_id: string
          created_at?: string
          id?: string
          mt5_account_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_id?: string
          created_at?: string
          id?: string
          mt5_account_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_activations_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_activations_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bots: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          min_deposit: number
          monthly_price_cents: number
          name: string
          risk_level: string
          slug: string
          strategy: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          min_deposit?: number
          monthly_price_cents?: number
          name: string
          risk_level?: string
          slug: string
          strategy: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          min_deposit?: number
          monthly_price_cents?: number
          name?: string
          risk_level?: string
          slug?: string
          strategy?: string
        }
        Relationships: []
      }
      bridge_status: {
        Row: {
          ask: number | null
          bid: number | null
          bridge_id: string
          created_at: string
          execution_enabled: boolean
          id: string
          last_error: string | null
          last_heartbeat_at: string | null
          last_quote_at: string | null
          mt5_account_id: string | null
          mt5_connected: boolean
          spread: number | null
          status: string
          symbol: string | null
          terminal_build: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ask?: number | null
          bid?: number | null
          bridge_id: string
          created_at?: string
          execution_enabled?: boolean
          id?: string
          last_error?: string | null
          last_heartbeat_at?: string | null
          last_quote_at?: string | null
          mt5_account_id?: string | null
          mt5_connected?: boolean
          spread?: number | null
          status?: string
          symbol?: string | null
          terminal_build?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ask?: number | null
          bid?: number | null
          bridge_id?: string
          created_at?: string
          execution_enabled?: boolean
          id?: string
          last_error?: string | null
          last_heartbeat_at?: string | null
          last_quote_at?: string | null
          mt5_account_id?: string | null
          mt5_connected?: boolean
          spread?: number | null
          status?: string
          symbol?: string | null
          terminal_build?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bridge_status_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_account_secrets: {
        Row: {
          account_id: string
          created_at: string
          password_ciphertext: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          password_ciphertext: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          password_ciphertext?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mt5_account_secrets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_accounts: {
        Row: {
          account_login: string
          balance: number | null
          broker_server: string
          created_at: string
          currency: string
          equity: number | null
          id: string
          label: string
          last_synced_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_login: string
          balance?: number | null
          broker_server: string
          created_at?: string
          currency?: string
          equity?: number | null
          id?: string
          label: string
          last_synced_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_login?: string
          balance?: number | null
          broker_server?: string
          created_at?: string
          currency?: string
          equity?: number | null
          id?: string
          label?: string
          last_synced_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      pf_nexus_access_periods: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          paid_profit_days: number
          stage_days: number
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          paid_profit_days?: number
          stage_days?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          paid_profit_days?: number
          stage_days?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pf_nexus_invoices: {
        Row: {
          amount_due: number
          checkout_url: string | null
          created_at: string
          currency: string
          due_date: string
          id: string
          invoice_number: string | null
          paid_at: string | null
          platform_share: number
          realized_net_profit: number
          status: string
          trading_date: string
          updated_at: string
          user_id: string
          user_share: number
        }
        Insert: {
          amount_due?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          platform_share?: number
          realized_net_profit?: number
          status?: string
          trading_date: string
          updated_at?: string
          user_id: string
          user_share?: number
        }
        Update: {
          amount_due?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          platform_share?: number
          realized_net_profit?: number
          status?: string
          trading_date?: string
          updated_at?: string
          user_id?: string
          user_share?: number
        }
        Relationships: []
      }
      pf_nexus_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          paid_at: string | null
          provider: string | null
          provider_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pf_nexus_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "pf_nexus_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pf_nexus_profit_days: {
        Row: {
          created_at: string
          id: string
          is_profitable: boolean
          platform_share: number
          realized_net_profit: number
          trading_date: string
          updated_at: string
          user_id: string
          user_share: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_profitable?: boolean
          platform_share?: number
          realized_net_profit?: number
          trading_date: string
          updated_at?: string
          user_id: string
          user_share?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_profitable?: boolean
          platform_share?: number
          realized_net_profit?: number
          trading_date?: string
          updated_at?: string
          user_id?: string
          user_share?: number
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          interval: string
          is_active: boolean
          max_accounts: number
          max_bots: number
          name: string
          price_cents: number
          slug: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          max_accounts?: number
          max_bots?: number
          name: string
          price_cents: number
          slug: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          max_accounts?: number
          max_bots?: number
          name?: string
          price_cents?: number
          slug?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          current_price: number | null
          id: string
          mt5_account_id: string | null
          open_price: number
          opened_at: string
          profit: number
          side: string
          symbol: string
          user_id: string
          volume: number
        }
        Insert: {
          current_price?: number | null
          id?: string
          mt5_account_id?: string | null
          open_price: number
          opened_at?: string
          profit?: number
          side: string
          symbol: string
          user_id: string
          volume: number
        }
        Update: {
          current_price?: number | null
          id?: string
          mt5_account_id?: string | null
          open_price?: number
          opened_at?: string
          profit?: number
          side?: string
          symbol?: string
          user_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "positions_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_settings: {
        Row: {
          activation_id: string
          created_at: string
          id: string
          max_daily_loss_pct: number
          max_drawdown_pct: number
          max_open_positions: number
          risk_per_trade_pct: number
          trading_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          activation_id: string
          created_at?: string
          id?: string
          max_daily_loss_pct?: number
          max_drawdown_pct?: number
          max_open_positions?: number
          risk_per_trade_pct?: number
          trading_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          activation_id?: string
          created_at?: string
          id?: string
          max_daily_loss_pct?: number
          max_drawdown_pct?: number
          max_open_positions?: number
          risk_per_trade_pct?: number
          trading_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_settings_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: true
            referencedRelation: "bot_activations"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          close_price: number | null
          closed_at: string
          id: string
          mt5_account_id: string | null
          open_price: number
          opened_at: string
          profit: number
          side: string
          symbol: string
          user_id: string
          volume: number
        }
        Insert: {
          close_price?: number | null
          closed_at?: string
          id?: string
          mt5_account_id?: string | null
          open_price: number
          opened_at?: string
          profit?: number
          side: string
          symbol: string
          user_id: string
          volume: number
        }
        Update: {
          close_price?: number | null
          closed_at?: string
          id?: string
          mt5_account_id?: string | null
          open_price?: number
          opened_at?: string
          profit?: number
          side?: string
          symbol?: string
          user_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "trades_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
