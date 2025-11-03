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
          schedule_active: boolean | null
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
          schedule_active?: boolean | null
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
          schedule_active?: boolean | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_execution_logs: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          error_message: string | null
          id: string
          program_id: string | null
          session_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          program_id?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          program_id?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_execution_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_execution_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "streaming_sessions"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "program_schedule_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_schedule_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_outputs: {
        Row: {
          bitrate_kbps: number | null
          channel_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_status: string | null
          protocol: string
          quality_profile: string | null
          resolution: string | null
          session_id: string | null
          target_url: string
          updated_at: string | null
        }
        Insert: {
          bitrate_kbps?: number | null
          channel_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_status?: string | null
          protocol: string
          quality_profile?: string | null
          resolution?: string | null
          session_id?: string | null
          target_url: string
          updated_at?: string | null
        }
        Update: {
          bitrate_kbps?: number | null
          channel_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_status?: string | null
          protocol?: string
          quality_profile?: string | null
          resolution?: string | null
          session_id?: string | null
          target_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_outputs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_outputs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "streaming_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      streaming_sessions: {
        Row: {
          channel_id: string
          created_at: string | null
          current_program_id: string | null
          error_message: string | null
          hls_manifest_url: string | null
          id: string
          last_heartbeat: string | null
          metadata: Json | null
          playlist_position: number | null
          source_type: string | null
          started_at: string | null
          status: string
          stream_url: string | null
          updated_at: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          current_program_id?: string | null
          error_message?: string | null
          hls_manifest_url?: string | null
          id?: string
          last_heartbeat?: string | null
          metadata?: Json | null
          playlist_position?: number | null
          source_type?: string | null
          started_at?: string | null
          status?: string
          stream_url?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          current_program_id?: string | null
          error_message?: string | null
          hls_manifest_url?: string | null
          id?: string
          last_heartbeat?: string | null
          metadata?: Json | null
          playlist_position?: number | null
          source_type?: string | null
          started_at?: string | null
          status?: string
          stream_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streaming_sessions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streaming_sessions_current_program_id_fkey"
            columns: ["current_program_id"]
            isOneToOne: false
            referencedRelation: "program_schedule"
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
      webhook_logs: {
        Row: {
          channel_id: string | null
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_activation_key: { Args: never; Returns: string }
      get_current_program: {
        Args: { p_channel_id: string }
        Returns: {
          duration_minutes: number
          program_id: string
          start_time: string
          title: string
          type: string
          video_url: string
        }[]
      }
      get_next_program: {
        Args: { p_channel_id: string }
        Returns: {
          duration_minutes: number
          program_id: string
          start_time: string
          title: string
          type: string
          video_url: string
        }[]
      }
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
