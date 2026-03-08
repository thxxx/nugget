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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      block: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: number
        }
        Insert: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: number
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "block_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "block_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calls: {
        Row: {
          created_at: string
          id: number
          resume_id: string | null
          script: string | null
          total_session_time: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          resume_id?: string | null
          script?: string | null
          total_session_time?: number | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: number
          resume_id?: string | null
          script?: string | null
          total_session_time?: number | null
          user_id?: string
        }
        Relationships: []
      }
      comment: {
        Row: {
          comment_id: string
          content: string | null
          created_at: string
          created_by: string
          is_encrypted: boolean | null
          is_read: boolean | null
          liked_by_user: boolean | null
          likes_count: number
          owner_id: string | null
          parent_comment_id: string | null
          post_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          comment_id?: string
          content?: string | null
          created_at?: string
          created_by?: string
          is_encrypted?: boolean | null
          is_read?: boolean | null
          liked_by_user?: boolean | null
          likes_count?: number
          owner_id?: string | null
          parent_comment_id?: string | null
          post_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          comment_id?: string
          content?: string | null
          created_at?: string
          created_by?: string
          is_encrypted?: boolean | null
          is_read?: boolean | null
          liked_by_user?: boolean | null
          likes_count?: number
          owner_id?: string | null
          parent_comment_id?: string | null
          post_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comment"
            referencedColumns: ["comment_id"]
          },
          {
            foreignKeyName: "comment_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "comment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["user_id"]
          },
        ]
      }
      company_code: {
        Row: {
          code: string
          company: string
          created_at: string
          domain: string
          id: string
        }
        Insert: {
          code?: string
          company: string
          created_at?: string
          domain: string
          id?: string
        }
        Update: {
          code?: string
          company?: string
          created_at?: string
          domain?: string
          id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          content: string | null
          created_at: string
          id: number
          name: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: number
          name?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: number
          name?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_user_id: string
          following_user_id: string
          id: number
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          following_user_id: string
          id?: never
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          following_user_id?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_user_id_fkey"
            columns: ["follower_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_user_id_fkey"
            columns: ["following_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel: {
        Row: {
          created_at: string
          device: number | null
          is_click_desc: boolean | null
          is_click_login: boolean | null
          is_click_write: boolean | null
          is_post: boolean | null
          is_signup: boolean | null
          log_id: string
          nation: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device?: number | null
          is_click_desc?: boolean | null
          is_click_login?: boolean | null
          is_click_write?: boolean | null
          is_post?: boolean | null
          is_signup?: boolean | null
          log_id?: string
          nation?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device?: number | null
          is_click_desc?: boolean | null
          is_click_login?: boolean | null
          is_click_write?: boolean | null
          is_post?: boolean | null
          is_signup?: boolean | null
          log_id?: string
          nation?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["user_id"]
          },
        ]
      }
      harper_waitlist: {
        Row: {
          abtest: string | null
          created_at: string
          email: string
          expect: string | null
          id: number
          is_mobile: boolean | null
          links: string | null
          local_id: string | null
          name: string | null
          role: string | null
          type: number | null
        }
        Insert: {
          abtest?: string | null
          created_at?: string
          email: string
          expect?: string | null
          id?: number
          is_mobile?: boolean | null
          links?: string | null
          local_id?: string | null
          name?: string | null
          role?: string | null
          type?: number | null
        }
        Update: {
          abtest?: string | null
          created_at?: string
          email?: string
          expect?: string | null
          id?: number
          is_mobile?: boolean | null
          links?: string | null
          local_id?: string | null
          name?: string | null
          role?: string | null
          type?: number | null
        }
        Relationships: []
      }
      harper_waitlist_company: {
        Row: {
          additional: string | null
          company: string | null
          company_link: string | null
          created_at: string
          email: string
          expect: string[]
          is_mobile: boolean | null
          local_id: string | null
          name: string | null
          needs: string | null
          role: string[] | null
          salary: string | null
          size: string | null
        }
        Insert: {
          additional?: string | null
          company?: string | null
          company_link?: string | null
          created_at?: string
          email: string
          expect: string[]
          is_mobile?: boolean | null
          local_id?: string | null
          name?: string | null
          needs?: string | null
          role?: string[] | null
          salary?: string | null
          size?: string | null
        }
        Update: {
          additional?: string | null
          company?: string | null
          company_link?: string | null
          created_at?: string
          email?: string
          expect?: string[]
          is_mobile?: boolean | null
          local_id?: string | null
          name?: string | null
          needs?: string | null
          role?: string[] | null
          salary?: string | null
          size?: string | null
        }
        Relationships: []
      }
      landing_logs: {
        Row: {
          abtest: string | null
          action: string | null
          created_at: string
          id: number
          is_mobile: boolean | null
          log_id: string
        }
        Insert: {
          abtest?: string | null
          action?: string | null
          created_at?: string
          id?: number
          is_mobile?: boolean | null
          log_id: string
        }
        Update: {
          abtest?: string | null
          action?: string | null
          created_at?: string
          id?: number
          is_mobile?: boolean | null
          log_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          content_id: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "comment"
            referencedColumns: ["comment_id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["user_id"]
          },
        ]
      }
      logs: {
        Row: {
          created_at: string
          get_num: number | null
          id: number
          status: string | null
          total_num: number | null
          url: string | null
        }
        Insert: {
          created_at?: string
          get_num?: number | null
          id?: number
          status?: string | null
          total_num?: number | null
          url?: string | null
        }
        Update: {
          created_at?: string
          get_num?: number | null
          id?: number
          status?: string | null
          total_num?: number | null
          url?: string | null
        }
        Relationships: []
      }
      place_save_reactions: {
        Row: {
          created_at: string
          id: number
          reaction: string
          save_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          reaction: string
          save_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          reaction?: string
          save_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_save_reactions_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "place_saves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_save_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_saves: {
        Row: {
          created_at: string
          id: number
          is_public: boolean
          memo: string
          place_id: number
          rating: number
          tags: string[]
          updated_at: string
          user_id: string
          visit_status: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_public?: boolean
          memo?: string
          place_id: number
          rating?: number
          tags?: string[]
          updated_at?: string
          user_id: string
          visit_status?: string
        }
        Update: {
          created_at?: string
          id?: never
          is_public?: boolean
          memo?: string
          place_id?: number
          rating?: number
          tags?: string[]
          updated_at?: string
          user_id?: string
          visit_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_saves_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          category: string | null
          created_at: string
          external_place_key: string
          id: number
          jibun_address: string | null
          latitude: number
          longitude: number
          mapx: number | null
          mapy: number | null
          name: string
          phone: string | null
          raw_json: Json | null
          road_address: string | null
          source_link: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          external_place_key: string
          id?: never
          jibun_address?: string | null
          latitude: number
          longitude: number
          mapx?: number | null
          mapy?: number | null
          name: string
          phone?: string | null
          raw_json?: Json | null
          road_address?: string | null
          source_link?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          external_place_key?: string
          id?: never
          jibun_address?: string | null
          latitude?: number
          longitude?: number
          mapx?: number | null
          mapy?: number | null
          name?: string
          phone?: string | null
          raw_json?: Json | null
          road_address?: string | null
          source_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      post: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          emotion: string | null
          image_url: string | null
          is_encrypted: boolean | null
          likes_count: number
          post_id: string
          status: string | null
          title: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          emotion?: string | null
          image_url?: string | null
          is_encrypted?: boolean | null
          likes_count?: number
          post_id?: string
          status?: string | null
          title?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          emotion?: string | null
          image_url?: string | null
          is_encrypted?: boolean | null
          likes_count?: number
          post_id?: string
          status?: string | null
          title?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          fcm_token: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fcm_token: string
          id?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          fcm_token?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          content: string | null
          created_at: string
          id: number
          locale: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: number
          locale?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: number
          locale?: string | null
        }
        Relationships: []
      }
      urls: {
        Row: {
          created_at: string
          id: number
          status: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          status?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          status?: string | null
          url?: string | null
        }
        Relationships: []
      }
      user: {
        Row: {
          age: string | null
          bio: string | null
          display_name: string | null
          email: string | null
          fortune: string | null
          fortune_date: string | null
          gender: string | null
          improvements: string | null
          improvments_date: string | null
          last_login_at: string | null
          name: string | null
          nation: string | null
          personal_question: string | null
          personal_question_date: string | null
          privacyMode: boolean | null
          profile_image_url: string | null
          pw: string | null
          recent_thoughts: string | null
          recent_thoughts_date: string | null
          registered_at: string
          singleMode: boolean | null
          type: number | null
          user_id: string
        }
        Insert: {
          age?: string | null
          bio?: string | null
          display_name?: string | null
          email?: string | null
          fortune?: string | null
          fortune_date?: string | null
          gender?: string | null
          improvements?: string | null
          improvments_date?: string | null
          last_login_at?: string | null
          name?: string | null
          nation?: string | null
          personal_question?: string | null
          personal_question_date?: string | null
          privacyMode?: boolean | null
          profile_image_url?: string | null
          pw?: string | null
          recent_thoughts?: string | null
          recent_thoughts_date?: string | null
          registered_at?: string
          singleMode?: boolean | null
          type?: number | null
          user_id?: string
        }
        Update: {
          age?: string | null
          bio?: string | null
          display_name?: string | null
          email?: string | null
          fortune?: string | null
          fortune_date?: string | null
          gender?: string | null
          improvements?: string | null
          improvments_date?: string | null
          last_login_at?: string | null
          name?: string | null
          nation?: string | null
          personal_question?: string | null
          personal_question_date?: string | null
          privacyMode?: boolean | null
          profile_image_url?: string | null
          pw?: string | null
          recent_thoughts?: string | null
          recent_thoughts_date?: string | null
          registered_at?: string
          singleMode?: boolean | null
          type?: number | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          nickname: string
          nickname_normalized: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nickname: string
          nickname_normalized?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nickname?: string
          nickname_normalized?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string | null
          id: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
