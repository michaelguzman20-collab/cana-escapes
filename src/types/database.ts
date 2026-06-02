export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "guest";

export interface Database {
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          id: string;
          type: string;
          title: string;
          message: string;
          user_email: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type?: string;
          title: string;
          message: string;
          user_email?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string;
          message?: string;
          user_email?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_configs: {
        Row: {
          id: string;
          platform: string;
          commission_pct: number;
          fixed_amount_usd: number;
          marketing_pct: number;
          notes: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          platform: string;
          commission_pct: number;
          fixed_amount_usd?: number;
          marketing_pct?: number;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          platform?: string;
          commission_pct?: number;
          fixed_amount_usd?: number;
          marketing_pct?: number;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          name: string;
          owner_name: string;
          owner_profile_id: string | null;
          reference_rate: number;
          active: boolean;
          share_token: string;
          share_enabled: boolean;
          owner_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_name: string;
          owner_profile_id?: string | null;
          reference_rate?: number;
          active?: boolean;
          share_token?: string;
          share_enabled?: boolean;
          owner_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_name?: string;
          owner_profile_id?: string | null;
          reference_rate?: number;
          active?: boolean;
          share_token?: string;
          share_enabled?: boolean;
          owner_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          property_id: string;
          period_month: number;
          period_year: number;
          checkin: string;
          checkout: string;
          nights: number;
          guest_name: string;
          guests: number;
          guest_phone: string | null;
          guest_email: string | null;
          extra_guests: Json | null;
          platform: string;
          currency: string;
          payment_type: string;
          gross_amount: number;
          platform_comm_pct: number;
          platform_comm_usd: number;
          marketing_usd: number;
          card_fee_pct: number;
          card_fee_usd: number;
          extra_pct: number;
          extra_usd: number;
          net_amount: number;
          owner_pct: number;
          owner_amount: number;
          ce_pct: number;
          ce_amount: number;
          exchange_rate: number;
          owner_rds: number;
          status: string;
          notes: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          period_month: number;
          period_year: number;
          checkin: string;
          checkout: string;
          nights: number;
          guest_name: string;
          guests?: number;
          guest_phone?: string | null;
          guest_email?: string | null;
          extra_guests?: Json | null;
          platform: string;
          currency?: string;
          payment_type?: string;
          gross_amount: number;
          platform_comm_pct?: number;
          platform_comm_usd?: number;
          marketing_usd?: number;
          card_fee_pct?: number;
          card_fee_usd?: number;
          extra_pct?: number;
          extra_usd?: number;
          net_amount: number;
          owner_pct: number;
          owner_amount: number;
          ce_pct: number;
          ce_amount: number;
          exchange_rate?: number;
          owner_rds?: number;
          status?: string;
          notes?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reservations"]["Insert"]>;
        Relationships: [];
      };
      guests: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          nationality: string | null;
          document_type: string | null;
          document_number: string | null;
          notes: string | null;
          tags: string[] | null;
          property_ids: string[] | null;
          related_guest_ids: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          nationality?: string | null;
          document_type?: string | null;
          document_number?: string | null;
          notes?: string | null;
          tags?: string[] | null;
          property_ids?: string[] | null;
          related_guest_ids?: string[] | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["guests"]["Insert"]>;
        Relationships: [];
      };
      brackets: {
        Row: {
          id: string;
          range_min: number;
          range_max: number | null;
          owner_pct: number;
          ce_pct: number;
          description: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          range_min: number;
          range_max?: number | null;
          owner_pct: number;
          ce_pct: number;
          description?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["brackets"]["Insert"]>;
        Relationships: [];
      };
      owners: {
        Row: {
          id: string;
          full_name: string;
          co_owner_name: string | null;
          email: string | null;
          phone: string | null;
          cedula_pasaporte: string | null;
          nationality: string | null;
          address: string | null;
          bank_name: string | null;
          bank_account: string | null;
          bank_account_type: string | null;
          contract_start: string | null;
          contract_end: string | null;
          commission_notes: string | null;
          emergency_contact: string | null;
          emergency_phone: string | null;
          notes: string | null;
          active: boolean;
          profile_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          co_owner_name?: string | null;
          email?: string | null;
          phone?: string | null;
          cedula_pasaporte?: string | null;
          nationality?: string | null;
          address?: string | null;
          bank_name?: string | null;
          bank_account?: string | null;
          bank_account_type?: string | null;
          contract_start?: string | null;
          contract_end?: string | null;
          commission_notes?: string | null;
          emergency_contact?: string | null;
          emergency_phone?: string | null;
          notes?: string | null;
          active?: boolean;
          profile_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["owners"]["Insert"]>;
        Relationships: [];
      };
      charges: {
        Row: {
          id: string;
          property_id: string | null;
          owner_id: string | null;
          category: string;
          description: string;
          currency: string;
          amount: number;
          exchange_rate: number;
          amount_usd: number;
          date: string;
          status: string;
          charge_type: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          owner_id?: string | null;
          category?: string;
          description: string;
          currency?: string;
          amount?: number;
          exchange_rate?: number;
          amount_usd?: number;
          date?: string;
          status?: string;
          charge_type?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["charges"]["Insert"]>;
        Relationships: [];
      };
      charge_items: {
        Row: {
          id: string;
          charge_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          charge_id: string;
          description: string;
          quantity?: number;
          unit_price?: number;
          total?: number;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["charge_items"]["Insert"]>;
        Relationships: [];
      };
      ce_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ce_settings"]["Insert"]>;
        Relationships: [];
      };
      access_logs: {
        Row: {
          id: string;
          user_id: string | null;
          user_email: string;
          user_role: string | null;
          action: string;
          page: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_email: string;
          user_role?: string | null;
          action: string;
          page?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["access_logs"]["Insert"]>;
        Relationships: [];
      };
      maintenance_tickets: {
        Row: {
          id: string;
          property_id: string;
          categoria: string;
          prioridad: string;
          estado: string;
          titulo: string;
          descripcion: string | null;
          tecnico_nombre: string | null;
          tecnico_telefono: string | null;
          costo_estimado: number;
          costo_real: number;
          currency: string;
          fecha_reporte: string;
          fecha_programada: string | null;
          fecha_resuelto: string | null;
          fotos: string[];
          notas: string | null;
          asignacion_costo: string;
          charge_id: string | null;
          synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          categoria?: string;
          prioridad?: string;
          estado?: string;
          titulo: string;
          descripcion?: string | null;
          tecnico_nombre?: string | null;
          tecnico_telefono?: string | null;
          costo_estimado?: number;
          costo_real?: number;
          currency?: string;
          fecha_reporte?: string;
          fecha_programada?: string | null;
          fecha_resuelto?: string | null;
          fotos?: string[];
          notas?: string | null;
          asignacion_costo?: string;
          charge_id?: string | null;
          synced_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_tickets"]["Insert"]>;
        Relationships: [];
      };
      maintenance_schedules: {
        Row: {
          id: string;
          property_id: string;
          categoria: string;
          titulo: string;
          descripcion: string | null;
          tecnico_nombre: string | null;
          tecnico_telefono: string | null;
          frecuencia_dias: number;
          costo_estimado: number;
          currency: string;
          ultima_ejecucion: string | null;
          proxima_ejecucion: string | null;
          activo: boolean;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          categoria: string;
          titulo: string;
          descripcion?: string | null;
          tecnico_nombre?: string | null;
          tecnico_telefono?: string | null;
          frecuencia_dias?: number;
          costo_estimado?: number;
          currency?: string;
          ultima_ejecucion?: string | null;
          proxima_ejecucion?: string | null;
          activo?: boolean;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_schedules"]["Insert"]>;
        Relationships: [];
      };
      owner_payments: {
        Row: {
          id: string;
          owner_id: string;
          period_month: number;
          period_year: number;
          amount_paid_usd: number;
          amount_paid_rd: number;
          transfer_cost_usd: number;
          transfer_cost_rd: number;
          payment_date: string;
          payment_method: string;
          reference: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          period_month: number;
          period_year: number;
          amount_paid_usd?: number;
          amount_paid_rd?: number;
          transfer_cost_usd?: number;
          transfer_cost_rd?: number;
          payment_date: string;
          payment_method?: string;
          reference?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["owner_payments"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type PlatformConfig =
  Database["public"]["Tables"]["platform_configs"]["Row"];
export type PlatformConfigInsert =
  Database["public"]["Tables"]["platform_configs"]["Insert"];
export type PlatformConfigUpdate =
  Database["public"]["Tables"]["platform_configs"]["Update"];

export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type PropertyInsert =
  Database["public"]["Tables"]["properties"]["Insert"];

export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type ReservationInsert =
  Database["public"]["Tables"]["reservations"]["Insert"];

export type Owner = Database["public"]["Tables"]["owners"]["Row"];
export type OwnerInsert = Database["public"]["Tables"]["owners"]["Insert"];

export type Bracket = Database["public"]["Tables"]["brackets"]["Row"];

export type Guest = Database["public"]["Tables"]["guests"]["Row"];
export type GuestInsert = Database["public"]["Tables"]["guests"]["Insert"];
export type GuestUpdate = Database["public"]["Tables"]["guests"]["Update"];

export type Charge = Database["public"]["Tables"]["charges"]["Row"];
export type ChargeInsert = Database["public"]["Tables"]["charges"]["Insert"];
export type ChargeUpdate = Database["public"]["Tables"]["charges"]["Update"];
export type ChargeItem = Database["public"]["Tables"]["charge_items"]["Row"];
export type ChargeItemInsert = Database["public"]["Tables"]["charge_items"]["Insert"];

export type MaintenanceTicket = Database["public"]["Tables"]["maintenance_tickets"]["Row"];
export type MaintenanceTicketInsert = Database["public"]["Tables"]["maintenance_tickets"]["Insert"];
export type MaintenanceTicketUpdate = Database["public"]["Tables"]["maintenance_tickets"]["Update"];

export type MaintenanceSchedule = Database["public"]["Tables"]["maintenance_schedules"]["Row"];
export type MaintenanceScheduleInsert = Database["public"]["Tables"]["maintenance_schedules"]["Insert"];
export type MaintenanceScheduleUpdate = Database["public"]["Tables"]["maintenance_schedules"]["Update"];

export type OwnerPayment = Database["public"]["Tables"]["owner_payments"]["Row"];
export type OwnerPaymentInsert = Database["public"]["Tables"]["owner_payments"]["Insert"];
export type OwnerPaymentUpdate = Database["public"]["Tables"]["owner_payments"]["Update"];
