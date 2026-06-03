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
      app_admins: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          target: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          target?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          target?: Json
        }
        Relationships: []
      }
      challenges: {
        Row: {
          challenger_id: string
          competition_id: string
          created_at: string
          expires_at: string
          id: string
          opponent_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["challenge_status"]
        }
        Insert: {
          challenger_id: string
          competition_id: string
          created_at?: string
          expires_at?: string
          id?: string
          opponent_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
        }
        Update: {
          challenger_id?: string
          competition_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          opponent_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
        }
        Relationships: [
          {
            foreignKeyName: "challenges_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competition"
            referencedColumns: ["id"]
          },
        ]
      }
      competition: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          location: string | null
          name: string
          registration_closes_at: string | null
          registration_opens_at: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["competition_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          name: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["competition_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          name?: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["competition_status"]
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          challenge_id: string | null
          competition_id: string
          confirm_deadline: string
          confirmed_at: string | null
          id: string
          loser_id: string
          played_on: string
          pre_loser_pos: number | null
          pre_winner_pos: number | null
          sets: Json
          status: Database["public"]["Enums"]["match_status"]
          submitted_at: string
          submitted_by: string
          winner_id: string
        }
        Insert: {
          challenge_id?: string | null
          competition_id: string
          confirm_deadline?: string
          confirmed_at?: string | null
          id?: string
          loser_id: string
          played_on?: string
          pre_loser_pos?: number | null
          pre_winner_pos?: number | null
          sets: Json
          status?: Database["public"]["Enums"]["match_status"]
          submitted_at?: string
          submitted_by: string
          winner_id: string
        }
        Update: {
          challenge_id?: string | null
          competition_id?: string
          confirm_deadline?: string
          confirmed_at?: string | null
          id?: string
          loser_id?: string
          played_on?: string
          pre_loser_pos?: number | null
          pre_winner_pos?: number | null
          sets?: Json
          status?: Database["public"]["Enums"]["match_status"]
          submitted_at?: string
          submitted_by?: string
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competition"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          email: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      rankings: {
        Row: {
          competition_id: string
          id: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          position: number
          updated_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rankings_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competition"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          competition_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competition"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_sliding_rule: {
        Args: { _competition: string; _loser: string; _winner: string }
        Returns: undefined
      }
      finalize_match: {
        Args: { _auto: boolean; _match: string }
        Returns: undefined
      }
      get_my_email: { Args: never; Returns: string }
      is_admin: { Args: { _user: string }; Returns: boolean }
      sweep_timeouts: { Args: never; Returns: undefined }
    }
    Enums: {
      challenge_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "completed"
      competition_status: "draft" | "registration" | "active" | "finished"
      match_status:
        | "pending_confirmation"
        | "confirmed"
        | "auto_confirmed"
        | "disputed"
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
      challenge_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "completed",
      ],
      competition_status: ["draft", "registration", "active", "finished"],
      match_status: [
        "pending_confirmation",
        "confirmed",
        "auto_confirmed",
        "disputed",
      ],
    },
  },
} as const
