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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bot_trades: {
        Row: {
          amount: number
          bot_id: string
          created_at: string
          crypto_id: string
          id: string
          pnl: number | null
          price: number
          side: string
          total: number
        }
        Insert: {
          amount: number
          bot_id: string
          created_at?: string
          crypto_id: string
          id?: string
          pnl?: number | null
          price: number
          side: string
          total?: number
        }
        Update: {
          amount?: number
          bot_id?: string
          created_at?: string
          crypto_id?: string
          id?: string
          pnl?: number | null
          price?: number
          side?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "bot_trades_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "trading_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_monitors: {
        Row: {
          address: string
          amount_detected: number | null
          created_at: string
          crypto_id: string
          expires_at: string
          id: string
          network: string | null
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          amount_detected?: number | null
          created_at?: string
          crypto_id: string
          expires_at?: string
          id?: string
          network?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          amount_detected?: number | null
          created_at?: string
          crypto_id?: string
          expires_at?: string
          id?: string
          network?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_type: string
          file_url: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          created_at: string
          crypto_id: string
          description: string | null
          entry_type: string
          id: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          crypto_id: string
          description?: string | null
          entry_type: string
          id?: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          crypto_id?: string
          description?: string | null
          entry_type?: string
          id?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          crypto_id: string
          filled: number
          id: string
          is_futures: boolean | null
          leverage: number | null
          price: number | null
          side: string
          status: string
          total: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          crypto_id: string
          filled?: number
          id?: string
          is_futures?: boolean | null
          leverage?: number | null
          price?: number | null
          side: string
          status?: string
          total?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          crypto_id?: string
          filled?: number
          id?: string
          is_futures?: boolean | null
          leverage?: number | null
          price?: number | null
          side?: string
          status?: string
          total?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      p2p_listings: {
        Row: {
          amount: number
          created_at: string
          crypto_id: string
          id: string
          max_amount: number | null
          min_amount: number | null
          payment_methods: string[] | null
          price: number
          side: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          crypto_id: string
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          payment_methods?: string[] | null
          price: number
          side: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          crypto_id?: string
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          payment_methods?: string[] | null
          price?: number
          side?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          is_default: boolean | null
          label: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          is_default?: boolean | null
          label: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          is_default?: boolean | null
          label?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          kyc_status: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          kyc_status?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          kyc_status?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_amount: number | null
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          bonus_amount?: number | null
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          bonus_amount?: number | null
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      staking: {
        Row: {
          amount: number
          apy: number
          created_at: string
          crypto_id: string
          ends_at: string | null
          id: string
          lock_days: number | null
          rewards_earned: number | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          apy?: number
          created_at?: string
          crypto_id: string
          ends_at?: string | null
          id?: string
          lock_days?: number | null
          rewards_earned?: number | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          apy?: number
          created_at?: string
          crypto_id?: string
          ends_at?: string | null
          id?: string
          lock_days?: number | null
          rewards_earned?: number | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_bots: {
        Row: {
          bot_users: number | null
          config: Json | null
          created_at: string
          crypto_id: string
          daily_earn: number | null
          description: string | null
          id: string
          is_ai: boolean | null
          min_stake: number | null
          name: string
          runs: number | null
          status: string
          strategy: string
          tier: string | null
          total_profit: number
          total_trades: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bot_users?: number | null
          config?: Json | null
          created_at?: string
          crypto_id?: string
          daily_earn?: number | null
          description?: string | null
          id?: string
          is_ai?: boolean | null
          min_stake?: number | null
          name: string
          runs?: number | null
          status?: string
          strategy?: string
          tier?: string | null
          total_profit?: number
          total_trades?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bot_users?: number | null
          config?: Json | null
          created_at?: string
          crypto_id?: string
          daily_earn?: number | null
          description?: string | null
          id?: string
          is_ai?: boolean | null
          min_stake?: number | null
          name?: string
          runs?: number | null
          status?: string
          strategy?: string
          tier?: string | null
          total_profit?: number
          total_trades?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          crypto_id: string
          id: string
          notes: string | null
          status: string
          tx_hash: string | null
          type: string
          updated_at: string
          usd_amount: number
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          crypto_id: string
          id?: string
          notes?: string | null
          status?: string
          tx_hash?: string | null
          type: string
          updated_at?: string
          usd_amount?: number
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          crypto_id?: string
          id?: string
          notes?: string | null
          status?: string
          tx_hash?: string | null
          type?: string
          updated_at?: string
          usd_amount?: number
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          crypto_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          crypto_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          crypto_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
