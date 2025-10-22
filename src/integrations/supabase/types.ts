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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activation_keys: {
        Row: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          key: string
          machine_id: string | null
          max_usage: number | null
          usage_count: number
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          key: string
          machine_id?: string | null
          max_usage?: number | null
          usage_count?: number
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          key?: string
          machine_id?: string | null
          max_usage?: number | null
          usage_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      channels: {
        Row: {
          allowed_domains: string[] | null
          created_at: string
          description: string | null
          embed_enabled: boolean | null
          embed_primary_color: string | null
          embed_show_guide: boolean | null
          hls_url: string | null
          id: string
          is_live: boolean | null
          logo_url: string | null
          name: string
          rtmp_in_key: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_domains?: string[] | null
          created_at?: string
          description?: string | null
          embed_enabled?: boolean | null
          embed_primary_color?: string | null
          embed_show_guide?: boolean | null
          hls_url?: string | null
          id?: string
          is_live?: boolean | null
          logo_url?: string | null
          name: string
          rtmp_in_key?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_domains?: string[] | null
          created_at?: string
          description?: string | null
          embed_enabled?: boolean | null
          embed_primary_color?: string | null
          embed_show_guide?: boolean | null
          hls_url?: string | null
          id?: string
          is_live?: boolean | null
          logo_url?: string | null
          name?: string
          rtmp_in_key?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_schedule: {
        Row: {
          asset_id: string | null
          channel_id: string
          created_at: string
          duration_minutes: number
          id: string
          repeat_pattern: string | null
          start_time: string
          title: string
          type: string
        }
        Insert: {
          asset_id?: string | null
          channel_id: string
          created_at?: string
          duration_minutes: number
          id?: string
          repeat_pattern?: string | null
          start_time: string
          title: string
          type: string
        }
        Update: {
          asset_id?: string | null
          channel_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          repeat_pattern?: string | null
          start_time?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_schedule_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      transmission_logs: {
        Row: {
          audio_format: string | null
          bitrate: number | null
          channel_id: string
          created_at: string
          ended_at: string | null
          error_message: string | null
          format: string | null
          id: string
          protocol: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          audio_format?: string | null
          bitrate?: number | null
          channel_id: string
          created_at?: string
          ended_at?: string | null
          error_message?: string | null
          format?: string | null
          id?: string
          protocol?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          audio_format?: string | null
          bitrate?: number | null
          channel_id?: string
          created_at?: string
          ended_at?: string | null
          error_message?: string | null
          format?: string | null
          id?: string
          protocol?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transmission_logs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
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
      video_assets: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          encoding_status: string | null
          file_url: string
          hls_url: string | null
          id: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          encoding_status?: string | null
          file_url: string
          hls_url?: string | null
          id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          encoding_status?: string | null
          file_url?: string
          hls_url?: string | null
          id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_activation_key: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_activation_key: {
        Args: { _ip_address?: string; _key: string; _machine_id?: string }
        Returns: {
          expires_at: string
          is_valid: boolean
          key_id: string
          message: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
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
      app_role: ["admin", "operator", "viewer"],
    },
  },
} as const
