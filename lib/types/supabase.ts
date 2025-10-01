/**
 * Supabase pn“{‹šI
 * 
 * Ù*‡ö+Î Supabase pn“ê¨„{‹šI
 * ÐL `yarn db:types` eô°Ù›{‹šI
 * 
 * èS Supabase yîËÙ*‡ö«ê¨„{‹†Ö
 */

export interface Database {
  public: {
    Tables: {
      // (7h{‹šI:‹	
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string | null
          username: string | null
          avatar_url: string | null
          full_name: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string | null
          username?: string | null
          avatar_url?: string | null
          full_name?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string | null
          username?: string | null
          avatar_url?: string | null
          full_name?: string | null
        }
      }
      // ôüþh{‹šI:‹	
      mind_maps: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string | null
          content: unknown // JSON pn
          user_id: string
          is_public: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description?: string | null
          content?: unknown
          user_id: string
          is_public?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string | null
          content?: unknown
          user_id?: string
          is_public?: boolean
        }
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

// üúpn“øs{‹
export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

// 8(„h{‹+
export type Profile = Tables<"profiles">
export type MindMap = Tables<"mind_maps">

// Òe{‹+
export type ProfileInsert = TablesInsert<"profiles">
export type MindMapInsert = TablesInsert<"mind_maps">

// ô°{‹+  
export type ProfileUpdate = TablesUpdate<"profiles">
export type MindMapUpdate = TablesUpdate<"mind_maps">