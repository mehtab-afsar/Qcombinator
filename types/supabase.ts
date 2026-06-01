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
      academy_mentors: {
        Row: {
          availability: string
          avatar: string
          bio: string
          company: string
          created_at: string
          expertise: string[]
          id: string
          linkedin: string | null
          name: string
          rating: number
          sessions_completed: number
          sort_order: number
          title: string
        }
        Insert: {
          availability: string
          avatar?: string
          bio: string
          company: string
          created_at?: string
          expertise?: string[]
          id?: string
          linkedin?: string | null
          name: string
          rating?: number
          sessions_completed?: number
          sort_order?: number
          title: string
        }
        Update: {
          availability?: string
          avatar?: string
          bio?: string
          company?: string
          created_at?: string
          expertise?: string[]
          id?: string
          linkedin?: string | null
          name?: string
          rating?: number
          sessions_completed?: number
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      academy_programs: {
        Row: {
          cohort_size: number
          created_at: string
          curriculum: string[]
          description: string
          duration: string
          id: string
          min_q_score: number
          name: string
          sort_order: number
          spots_left: number
          stage: string[]
          start_date: string
          status: string
        }
        Insert: {
          cohort_size?: number
          created_at?: string
          curriculum?: string[]
          description: string
          duration: string
          id?: string
          min_q_score?: number
          name: string
          sort_order?: number
          spots_left?: number
          stage?: string[]
          start_date: string
          status?: string
        }
        Update: {
          cohort_size?: number
          created_at?: string
          curriculum?: string[]
          description?: string
          duration?: string
          id?: string
          min_q_score?: number
          name?: string
          sort_order?: number
          spots_left?: number
          stage?: string[]
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      academy_workshops: {
        Row: {
          capacity: number
          created_at: string
          date: string
          description: string
          duration: string
          id: string
          instructor: string
          instructor_title: string
          is_past: boolean
          recording_url: string | null
          registered: number
          sort_order: number
          spots_left: number
          status: string
          time: string
          title: string
          topic: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          date: string
          description: string
          duration: string
          id?: string
          instructor: string
          instructor_title: string
          is_past?: boolean
          recording_url?: string | null
          registered?: number
          sort_order?: number
          spots_left?: number
          status?: string
          time: string
          title: string
          topic: string
        }
        Update: {
          capacity?: number
          created_at?: string
          date?: string
          description?: string
          duration?: string
          id?: string
          instructor?: string
          instructor_title?: string
          is_past?: boolean
          recording_url?: string | null
          registered?: number
          sort_order?: number
          spots_left?: number
          status?: string
          time?: string
          title?: string
          topic?: string
        }
        Relationships: []
      }
      agent_actions: {
        Row: {
          action_text: string
          action_type: string | null
          agent_id: string
          completed_at: string | null
          conversation_id: string | null
          created_at: string | null
          cta_label: string | null
          id: string
          priority: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action_text: string
          action_type?: string | null
          agent_id: string
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          cta_label?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action_text?: string
          action_type?: string | null
          agent_id?: string
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          cta_label?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_activity: {
        Row: {
          action_type: string
          agent_id: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          agent_id: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          agent_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      agent_artifacts: {
        Row: {
          agent_id: string
          artifact_type: string
          compressed_summary: string | null
          content: Json
          conversation_id: string | null
          created_at: string | null
          critique_metadata: Json | null
          icp_id: string | null
          id: string
          key_fields: Json | null
          title: string
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          agent_id: string
          artifact_type: string
          compressed_summary?: string | null
          content: Json
          conversation_id?: string | null
          created_at?: string | null
          critique_metadata?: Json | null
          icp_id?: string | null
          id?: string
          key_fields?: Json | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          agent_id?: string
          artifact_type?: string
          compressed_summary?: string | null
          content?: Json
          conversation_id?: string | null
          created_at?: string | null
          critique_metadata?: Json | null
          icp_id?: string | null
          id?: string
          key_fields?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_artifacts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          summary: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          summary?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          summary?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      agent_goals: {
        Row: {
          agent_id: string
          created_at: string
          goal: string
          id: string
          last_evaluated: string
          priority: string
          reason: string
          status: string
          success_condition: string
          suggested_action: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          goal: string
          id?: string
          last_evaluated?: string
          priority: string
          reason?: string
          status?: string
          success_condition: string
          suggested_action?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          goal?: string
          id?: string
          last_evaluated?: string
          priority?: string
          reason?: string
          status?: string
          success_condition?: string
          suggested_action?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          agent_id: string
          id: string
          key_facts: string | null
          relationship_tier: string
          session_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          id?: string
          key_facts?: string | null
          relationship_tier?: string
          session_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          id?: string
          key_facts?: string | null
          relationship_tier?: string
          session_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          role: string
          sender: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          sender?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          sender?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_trigger_log: {
        Row: {
          agent_id: string
          completed_at: string | null
          fired_at: string | null
          id: string
          result: string | null
          status: string
          trigger: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          fired_at?: string | null
          id?: string
          result?: string | null
          status?: string
          trigger: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          fired_at?: string | null
          id?: string
          result?: string | null
          status?: string
          trigger?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          applicant_email: string
          applicant_name: string
          id: string
          resume_text: string | null
          resume_url: string | null
          role_slug: string
          role_title: string | null
          score: number | null
          score_notes: string | null
          status: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          id?: string
          resume_text?: string | null
          resume_url?: string | null
          role_slug: string
          role_title?: string | null
          score?: number | null
          score_notes?: string | null
          status?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          id?: string
          resume_text?: string | null
          resume_url?: string | null
          role_slug?: string
          role_title?: string | null
          score?: number | null
          score_notes?: string | null
          status?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artifact_embeddings: {
        Row: {
          artifact_id: string
          chunk_index: number
          chunk_text: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          artifact_id: string
          chunk_index: number
          chunk_text: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          artifact_id?: string
          chunk_index?: number
          chunk_text?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_embeddings_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "agent_artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      artifact_jobs: {
        Row: {
          agent_id: string
          artifact_type: string
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          error: string | null
          id: string
          result: Json | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          agent_id: string
          artifact_type: string
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          artifact_type?: string
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      connection_requests: {
        Row: {
          created_at: string | null
          demo_investor_id: string | null
          founder_id: string | null
          founder_qscore: number | null
          id: string
          investor_id: string | null
          match_metadata: Json | null
          personal_message: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          demo_investor_id?: string | null
          founder_id?: string | null
          founder_qscore?: number | null
          id?: string
          investor_id?: string | null
          match_metadata?: Json | null
          personal_message?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          demo_investor_id?: string | null
          founder_id?: string | null
          founder_qscore?: number | null
          id?: string
          investor_id?: string | null
          match_metadata?: Json | null
          personal_message?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      content_calendar: {
        Row: {
          angle: string | null
          channel: string
          created_at: string
          id: string
          status: string
          topic: string
          user_id: string
          week: number
        }
        Insert: {
          angle?: string | null
          channel: string
          created_at?: string
          id?: string
          status?: string
          topic: string
          user_id: string
          week: number
        }
        Update: {
          angle?: string | null
          channel?: string
          created_at?: string
          id?: string
          status?: string
          topic?: string
          user_id?: string
          week?: number
        }
        Relationships: []
      }
      customer_accounts: {
        Row: {
          arr: number | null
          company: string
          contact_name: string | null
          created_at: string
          health: string
          id: string
          last_contact: string | null
          notes: string | null
          stage: string
          user_id: string
        }
        Insert: {
          arr?: number | null
          company: string
          contact_name?: string | null
          created_at?: string
          health?: string
          id?: string
          last_contact?: string | null
          notes?: string | null
          stage?: string
          user_id: string
        }
        Update: {
          arr?: number | null
          company?: string
          contact_name?: string | null
          created_at?: string
          health?: string
          id?: string
          last_contact?: string | null
          notes?: string | null
          stage?: string
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          company: string
          contact_email: string | null
          contact_name: string | null
          contact_title: string | null
          created_at: string
          id: string
          loss_reason: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          source: string | null
          stage: string
          updated_at: string
          user_id: string
          value: string | null
          win_reason: string | null
        }
        Insert: {
          company: string
          contact_email?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          id?: string
          loss_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          user_id: string
          value?: string | null
          win_reason?: string | null
        }
        Update: {
          company?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          id?: string
          loss_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
          value?: string | null
          win_reason?: string | null
        }
        Relationships: []
      }
      delegation_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          expires_at: string
          from_agent: string
          id: string
          instruction: string
          payload_data: Json
          payload_type: string
          priority: string
          result: Json | null
          status: string
          to_agent: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          expires_at?: string
          from_agent: string
          id?: string
          instruction: string
          payload_data?: Json
          payload_type: string
          priority?: string
          result?: Json | null
          status?: string
          to_agent: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          expires_at?: string
          from_agent?: string
          id?: string
          instruction?: string
          payload_data?: Json
          payload_type?: string
          priority?: string
          result?: Json | null
          status?: string
          to_agent?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_investors: {
        Row: {
          check_sizes: string[] | null
          created_at: string | null
          firm: string
          geography: string[] | null
          id: string
          is_active: boolean | null
          location: string
          name: string
          portfolio: string[] | null
          response_rate: number | null
          sectors: string[] | null
          stages: string[] | null
          thesis: string | null
          title: string
        }
        Insert: {
          check_sizes?: string[] | null
          created_at?: string | null
          firm: string
          geography?: string[] | null
          id?: string
          is_active?: boolean | null
          location: string
          name: string
          portfolio?: string[] | null
          response_rate?: number | null
          sectors?: string[] | null
          stages?: string[] | null
          thesis?: string | null
          title: string
        }
        Update: {
          check_sizes?: string[] | null
          created_at?: string | null
          firm?: string
          geography?: string[] | null
          id?: string
          is_active?: boolean | null
          location?: string
          name?: string
          portfolio?: string[] | null
          response_rate?: number | null
          sectors?: string[] | null
          stages?: string[] | null
          thesis?: string | null
          title?: string
        }
        Relationships: []
      }
      deployed_sites: {
        Row: {
          artifact_id: string | null
          deploy_type: string | null
          deployed_at: string
          id: string
          netlify_site_id: string | null
          site_name: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          artifact_id?: string | null
          deploy_type?: string | null
          deployed_at?: string
          id?: string
          netlify_site_id?: string | null
          site_name: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          artifact_id?: string | null
          deploy_type?: string | null
          deployed_at?: string
          id?: string
          netlify_site_id?: string | null
          site_name?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          body: string
          comments_count: number
          created_at: string
          id: string
          likes_count: number
          media_url: string | null
          metadata: Json
          post_type: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          comments_count?: number
          created_at?: string
          id?: string
          likes_count?: number
          media_url?: string | null
          metadata?: Json
          post_type?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          comments_count?: number
          created_at?: string
          id?: string
          likes_count?: number
          media_url?: string | null
          metadata?: Json
          post_type?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_behavioural_signals: {
        Row: {
          created_at: string | null
          id: string
          signal_context: Json | null
          signal_type: string
          signal_value: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          signal_context?: Json | null
          signal_type: string
          signal_value?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          signal_context?: Json | null
          signal_type?: string
          signal_value?: number | null
          user_id?: string
        }
        Relationships: []
      }
      founder_metric_snapshots: {
        Row: {
          calculated_at: string | null
          dimension_scores: Json
          id: string
          metrics: Json
          overall_score: number | null
          qscore_history_id: string | null
          sector: string
          user_id: string | null
        }
        Insert: {
          calculated_at?: string | null
          dimension_scores?: Json
          id?: string
          metrics?: Json
          overall_score?: number | null
          qscore_history_id?: string | null
          sector?: string
          user_id?: string | null
        }
        Update: {
          calculated_at?: string | null
          dimension_scores?: Json
          id?: string
          metrics?: Json
          overall_score?: number | null
          qscore_history_id?: string | null
          sector?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_metric_snapshots_qscore_history_id_fkey"
            columns: ["qscore_history_id"]
            isOneToOne: false
            referencedRelation: "qscore_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_metric_snapshots_qscore_history_id_fkey"
            columns: ["qscore_history_id"]
            isOneToOne: false
            referencedRelation: "qscore_with_delta"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_profiles: {
        Row: {
          assessment_completed: boolean | null
          avatar_url: string | null
          behavioural_score: number | null
          bio: string | null
          cofounder_count: number | null
          company_logo_url: string | null
          company_name: string | null
          created_at: string | null
          customer_proof: string | null
          description: string | null
          email_confirm_token: string | null
          email_confirmed_at: string | null
          email_day1_sent: boolean | null
          email_day7_sent: boolean | null
          founded_date: string | null
          founder_name: string | null
          full_name: string
          funding: string | null
          funding_status: string | null
          fundraising_status: string | null
          id: string
          incorporation_type: string | null
          industry: string | null
          integrity_index: number | null
          is_impact_focused: boolean
          is_public: boolean | null
          linkedin_url: string | null
          location: string | null
          momentum_score: number | null
          momentum_updated_at: string | null
          notification_preferences: Json | null
          onboarding_chat_history: Json | null
          onboarding_completed: boolean | null
          onboarding_extracted_data: Json | null
          prior_experience: string | null
          profile_builder_completed: boolean | null
          profile_builder_completed_at: string | null
          profile_builder_draft: Json | null
          profile_builder_flow: Json | null
          public_slug: string | null
          registration_completed: boolean | null
          revenue_status: string | null
          role: string | null
          signal_strength: number | null
          stage: string | null
          startup_name: string | null
          startup_profile_completed: boolean | null
          startup_profile_data: Json | null
          stripe_account_id: string | null
          stripe_arr: number | null
          stripe_customer_id: string | null
          stripe_customers: number | null
          stripe_last30: number | null
          stripe_mrr: number | null
          stripe_subscription_id: string | null
          stripe_verified: boolean
          stripe_verified_at: string | null
          subscription_current_period_end: string | null
          subscription_status: string | null
          subscription_tier: string | null
          tagline: string | null
          team_size: string | null
          time_commitment: string | null
          updated_at: string | null
          user_id: string | null
          visibility_gated: boolean
          website: string | null
          years_on_problem: string | null
        }
        Insert: {
          assessment_completed?: boolean | null
          avatar_url?: string | null
          behavioural_score?: number | null
          bio?: string | null
          cofounder_count?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_proof?: string | null
          description?: string | null
          email_confirm_token?: string | null
          email_confirmed_at?: string | null
          email_day1_sent?: boolean | null
          email_day7_sent?: boolean | null
          founded_date?: string | null
          founder_name?: string | null
          full_name: string
          funding?: string | null
          funding_status?: string | null
          fundraising_status?: string | null
          id?: string
          incorporation_type?: string | null
          industry?: string | null
          integrity_index?: number | null
          is_impact_focused?: boolean
          is_public?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          momentum_score?: number | null
          momentum_updated_at?: string | null
          notification_preferences?: Json | null
          onboarding_chat_history?: Json | null
          onboarding_completed?: boolean | null
          onboarding_extracted_data?: Json | null
          prior_experience?: string | null
          profile_builder_completed?: boolean | null
          profile_builder_completed_at?: string | null
          profile_builder_draft?: Json | null
          profile_builder_flow?: Json | null
          public_slug?: string | null
          registration_completed?: boolean | null
          revenue_status?: string | null
          role?: string | null
          signal_strength?: number | null
          stage?: string | null
          startup_name?: string | null
          startup_profile_completed?: boolean | null
          startup_profile_data?: Json | null
          stripe_account_id?: string | null
          stripe_arr?: number | null
          stripe_customer_id?: string | null
          stripe_customers?: number | null
          stripe_last30?: number | null
          stripe_mrr?: number | null
          stripe_subscription_id?: string | null
          stripe_verified?: boolean
          stripe_verified_at?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tagline?: string | null
          team_size?: string | null
          time_commitment?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility_gated?: boolean
          website?: string | null
          years_on_problem?: string | null
        }
        Update: {
          assessment_completed?: boolean | null
          avatar_url?: string | null
          behavioural_score?: number | null
          bio?: string | null
          cofounder_count?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_proof?: string | null
          description?: string | null
          email_confirm_token?: string | null
          email_confirmed_at?: string | null
          email_day1_sent?: boolean | null
          email_day7_sent?: boolean | null
          founded_date?: string | null
          founder_name?: string | null
          full_name?: string
          funding?: string | null
          funding_status?: string | null
          fundraising_status?: string | null
          id?: string
          incorporation_type?: string | null
          industry?: string | null
          integrity_index?: number | null
          is_impact_focused?: boolean
          is_public?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          momentum_score?: number | null
          momentum_updated_at?: string | null
          notification_preferences?: Json | null
          onboarding_chat_history?: Json | null
          onboarding_completed?: boolean | null
          onboarding_extracted_data?: Json | null
          prior_experience?: string | null
          profile_builder_completed?: boolean | null
          profile_builder_completed_at?: string | null
          profile_builder_draft?: Json | null
          profile_builder_flow?: Json | null
          public_slug?: string | null
          registration_completed?: boolean | null
          revenue_status?: string | null
          role?: string | null
          signal_strength?: number | null
          stage?: string | null
          startup_name?: string | null
          startup_profile_completed?: boolean | null
          startup_profile_data?: Json | null
          stripe_account_id?: string | null
          stripe_arr?: number | null
          stripe_customer_id?: string | null
          stripe_customers?: number | null
          stripe_last30?: number | null
          stripe_mrr?: number | null
          stripe_subscription_id?: string | null
          stripe_verified?: boolean
          stripe_verified_at?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tagline?: string | null
          team_size?: string | null
          time_commitment?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility_gated?: boolean
          website?: string | null
          years_on_problem?: string | null
        }
        Relationships: []
      }
      growth_experiments: {
        Row: {
          channel: string | null
          created_at: string
          hypothesis: string
          id: string
          metric: string | null
          result: string | null
          status: string
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          hypothesis: string
          id?: string
          metric?: string | null
          result?: string | null
          status?: string
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          hypothesis?: string
          id?: string
          metric?: string | null
          result?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      hiring_candidates: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          role: string
          score: number | null
          source: string | null
          stage: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          role: string
          score?: number | null
          source?: string | null
          stage?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          role?: string
          score?: number | null
          source?: string | null
          stage?: string
          user_id?: string
        }
        Relationships: []
      }
      investor_contacts: {
        Row: {
          created_at: string
          email: string
          firm: string | null
          id: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          firm?: string | null
          id?: string
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          firm?: string | null
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      investor_parameter_weights: {
        Row: {
          id: string
          investor_user_id: string
          updated_at: string | null
          weight_financial: number
          weight_gtm: number
          weight_market: number
          weight_product: number
          weight_team: number
          weight_traction: number
        }
        Insert: {
          id?: string
          investor_user_id: string
          updated_at?: string | null
          weight_financial?: number
          weight_gtm?: number
          weight_market?: number
          weight_product?: number
          weight_team?: number
          weight_traction?: number
        }
        Update: {
          id?: string
          investor_user_id?: string
          updated_at?: string | null
          weight_financial?: number
          weight_gtm?: number
          weight_market?: number
          weight_product?: number
          weight_team?: number
          weight_traction?: number
        }
        Relationships: []
      }
      investor_pipeline: {
        Row: {
          created_at: string | null
          founder_user_id: string
          id: string
          investor_user_id: string
          notes: string | null
          stage: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          founder_user_id: string
          id?: string
          investor_user_id: string
          notes?: string | null
          stage?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          founder_user_id?: string
          id?: string
          investor_user_id?: string
          notes?: string | null
          stage?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      investor_profiles: {
        Row: {
          ai_personalization: Json | null
          aum: string | null
          avatar_url: string | null
          check_sizes: string[] | null
          created_at: string | null
          deal_flow_notifications: boolean | null
          deal_flow_strategy: string | null
          decision_process: string | null
          demo_investor_id: string | null
          email: string
          email_confirm_token: string | null
          email_confirmed_at: string | null
          email_day1_sent: boolean | null
          email_day7_sent: boolean | null
          firm_logo_url: string | null
          firm_name: string | null
          firm_size: string | null
          firm_type: string | null
          full_name: string
          geography: string[] | null
          id: string
          linkedin_url: string | null
          location: string | null
          monthly_deal_volume: string | null
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          phone: string | null
          portfolio_display_config: Json | null
          sectors: string[] | null
          stages: string[] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          subscription_status: string | null
          subscription_tier: string
          thesis: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          ai_personalization?: Json | null
          aum?: string | null
          avatar_url?: string | null
          check_sizes?: string[] | null
          created_at?: string | null
          deal_flow_notifications?: boolean | null
          deal_flow_strategy?: string | null
          decision_process?: string | null
          demo_investor_id?: string | null
          email: string
          email_confirm_token?: string | null
          email_confirmed_at?: string | null
          email_day1_sent?: boolean | null
          email_day7_sent?: boolean | null
          firm_logo_url?: string | null
          firm_name?: string | null
          firm_size?: string | null
          firm_type?: string | null
          full_name: string
          geography?: string[] | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          monthly_deal_volume?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          phone?: string | null
          portfolio_display_config?: Json | null
          sectors?: string[] | null
          stages?: string[] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string
          thesis?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          ai_personalization?: Json | null
          aum?: string | null
          avatar_url?: string | null
          check_sizes?: string[] | null
          created_at?: string | null
          deal_flow_notifications?: boolean | null
          deal_flow_strategy?: string | null
          decision_process?: string | null
          demo_investor_id?: string | null
          email?: string
          email_confirm_token?: string | null
          email_confirmed_at?: string | null
          email_day1_sent?: boolean | null
          email_day7_sent?: boolean | null
          firm_logo_url?: string | null
          firm_name?: string | null
          firm_size?: string | null
          firm_type?: string | null
          full_name?: string
          geography?: string[] | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          monthly_deal_volume?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          phone?: string | null
          portfolio_display_config?: Json | null
          sectors?: string[] | null
          stages?: string[] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string
          thesis?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_profiles_demo_investor_id_fkey"
            columns: ["demo_investor_id"]
            isOneToOne: false
            referencedRelation: "demo_investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_updates: {
        Row: {
          body_html: string
          id: string
          metrics_snapshot: Json | null
          recipients: string[] | null
          resend_id: string | null
          sent_at: string
          subject: string
          user_id: string
        }
        Insert: {
          body_html: string
          id?: string
          metrics_snapshot?: Json | null
          recipients?: string[] | null
          resend_id?: string | null
          sent_at?: string
          subject: string
          user_id: string
        }
        Update: {
          body_html?: string
          id?: string
          metrics_snapshot?: Json | null
          recipients?: string[] | null
          resend_id?: string | null
          sent_at?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_library: {
        Row: {
          access_level: string
          author: string | null
          created_at: string
          format: string
          function_owner: string
          id: string
          source: string
          stage_relevance: string[]
          summary: string
          tags: string[]
          title: string
          topic_cluster: string
          type: string
          url: string | null
        }
        Insert: {
          access_level?: string
          author?: string | null
          created_at?: string
          format?: string
          function_owner: string
          id?: string
          source: string
          stage_relevance?: string[]
          summary: string
          tags?: string[]
          title: string
          topic_cluster: string
          type: string
          url?: string | null
        }
        Update: {
          access_level?: string
          author?: string | null
          created_at?: string
          format?: string
          function_owner?: string
          id?: string
          source?: string
          stage_relevance?: string[]
          summary?: string
          tags?: string[]
          title?: string
          topic_cluster?: string
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content_html: string | null
          counterparty_email: string | null
          counterparty_name: string | null
          created_at: string
          doc_type: string
          id: string
          sent_at: string | null
          signed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          content_html?: string | null
          counterparty_email?: string | null
          counterparty_name?: string | null
          created_at?: string
          doc_type: string
          id?: string
          sent_at?: string | null
          signed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          content_html?: string | null
          counterparty_email?: string | null
          counterparty_name?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          sent_at?: string | null
          signed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_risks: {
        Row: {
          category: string
          created_at: string
          id: string
          notes: string | null
          resolved: boolean
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          resolved?: boolean
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          resolved?: boolean
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      linear_tokens: {
        Row: {
          api_key: string
          created_at: string
          id: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          connection_request_id: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          connection_request_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          connection_request_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_connection_request_id_fkey"
            columns: ["connection_request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          connection_req: boolean
          created_at: string
          deal_flow_notifications: boolean
          email_notifications: boolean
          high_q_score: boolean
          id: string
          investor_messages: boolean
          qscore_updates: boolean
          runway_alerts: boolean
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          connection_req?: boolean
          created_at?: string
          deal_flow_notifications?: boolean
          email_notifications?: boolean
          high_q_score?: boolean
          id?: string
          investor_messages?: boolean
          qscore_updates?: boolean
          runway_alerts?: boolean
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          connection_req?: boolean
          created_at?: string
          deal_flow_notifications?: boolean
          email_notifications?: boolean
          high_q_score?: boolean
          id?: string
          investor_messages?: boolean
          qscore_updates?: boolean
          runway_alerts?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_sends: {
        Row: {
          artifact_id: string | null
          body_html: string
          bounced: boolean
          clicked_at: string | null
          contact_company: string | null
          contact_email: string
          contact_name: string | null
          contact_title: string | null
          delivered_at: string | null
          id: string
          opened_at: string | null
          replied_at: string | null
          resend_id: string | null
          sent_at: string
          sequence_name: string | null
          status: string
          step_index: number
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          artifact_id?: string | null
          body_html: string
          bounced?: boolean
          clicked_at?: string | null
          contact_company?: string | null
          contact_email: string
          contact_name?: string | null
          contact_title?: string | null
          delivered_at?: string | null
          id?: string
          opened_at?: string | null
          replied_at?: string | null
          resend_id?: string | null
          sent_at?: string
          sequence_name?: string | null
          status?: string
          step_index?: number
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          artifact_id?: string | null
          body_html?: string
          bounced?: boolean
          clicked_at?: string | null
          contact_company?: string | null
          contact_email?: string
          contact_name?: string | null
          contact_title?: string | null
          delivered_at?: string | null
          id?: string
          opened_at?: string | null
          replied_at?: string | null
          resend_id?: string | null
          sent_at?: string
          sequence_name?: string | null
          status?: string
          step_index?: number
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patel_diagnostic_scores: {
        Row: {
          confidence: Json
          id: string
          scores: Json
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: Json
          id?: string
          scores?: Json
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: Json
          id?: string
          scores?: Json
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_actions: {
        Row: {
          action_type: string
          agent_id: string
          created_at: string
          executed_at: string | null
          id: string
          payload: Json
          reviewed_at: string | null
          status: string
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_type: string
          agent_id: string
          created_at?: string
          executed_at?: string | null
          id?: string
          payload?: Json
          reviewed_at?: string | null
          status?: string
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_type?: string
          agent_id?: string
          created_at?: string
          executed_at?: string | null
          id?: string
          payload?: Json
          reviewed_at?: string | null
          status?: string
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_views: {
        Row: {
          founder_id: string
          id: string
          referrer: string | null
          viewed_at: string | null
          viewer_ip: string | null
        }
        Insert: {
          founder_id: string
          id?: string
          referrer?: string | null
          viewed_at?: string | null
          viewer_ip?: string | null
        }
        Update: {
          founder_id?: string
          id?: string
          referrer?: string | null
          viewed_at?: string | null
          viewer_ip?: string | null
        }
        Relationships: []
      }
      processed_webhook_events: {
        Row: {
          event_id: string
          id: string
          processed_at: string
          source: string
        }
        Insert: {
          event_id: string
          id?: string
          processed_at?: string
          source?: string
        }
        Update: {
          event_id?: string
          id?: string
          processed_at?: string
          source?: string
        }
        Relationships: []
      }
      profile_builder_data: {
        Row: {
          completed_at: string | null
          completion_score: number | null
          confidence_map: Json | null
          created_at: string | null
          extracted_fields: Json | null
          id: string
          raw_conversation: string | null
          section: number
          updated_at: string | null
          uploaded_documents: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_score?: number | null
          confidence_map?: Json | null
          created_at?: string | null
          extracted_fields?: Json | null
          id?: string
          raw_conversation?: string | null
          section: number
          updated_at?: string | null
          uploaded_documents?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_score?: number | null
          confidence_map?: Json | null
          created_at?: string | null
          extracted_fields?: Json | null
          id?: string
          raw_conversation?: string | null
          section?: number
          updated_at?: string | null
          uploaded_documents?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profile_builder_uploads: {
        Row: {
          confidence: number | null
          extracted_text: string | null
          file_type: string | null
          filename: string | null
          id: string
          parsed_data: Json | null
          section: number
          storage_path: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          extracted_text?: string | null
          file_type?: string | null
          filename?: string | null
          id?: string
          parsed_data?: Json | null
          section: number
          storage_path?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          extracted_text?: string | null
          file_type?: string | null
          filename?: string | null
          id?: string
          parsed_data?: Json | null
          section?: number
          storage_path?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          artifact_id: string | null
          deal_value: string | null
          id: string
          opened_at: string | null
          proposal_html: string
          prospect_company: string | null
          prospect_email: string
          prospect_name: string
          prospect_title: string | null
          replied_at: string | null
          resend_id: string | null
          sent_at: string
          status: string
          subject: string
          use_case: string | null
          user_id: string
        }
        Insert: {
          artifact_id?: string | null
          deal_value?: string | null
          id?: string
          opened_at?: string | null
          proposal_html: string
          prospect_company?: string | null
          prospect_email: string
          prospect_name: string
          prospect_title?: string | null
          replied_at?: string | null
          resend_id?: string | null
          sent_at?: string
          status?: string
          subject: string
          use_case?: string | null
          user_id: string
        }
        Update: {
          artifact_id?: string | null
          deal_value?: string | null
          id?: string
          opened_at?: string | null
          proposal_html?: string
          prospect_company?: string | null
          prospect_email?: string
          prospect_name?: string
          prospect_title?: string | null
          replied_at?: string | null
          resend_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          use_case?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qscore_assessments: {
        Row: {
          assessment_data: Json
          created_at: string | null
          id: string
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assessment_data: Json
          created_at?: string | null
          id?: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assessment_data?: Json
          created_at?: string | null
          id?: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      qscore_benchmarks: {
        Row: {
          id: string
          indicator_id: string
          last_updated: string | null
          p10: number | null
          p25: number | null
          p50: number | null
          p75: number | null
          p90: number | null
          sample_size: number
          sector: string
          stage: string
        }
        Insert: {
          id?: string
          indicator_id: string
          last_updated?: string | null
          p10?: number | null
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          sample_size?: number
          sector: string
          stage: string
        }
        Update: {
          id?: string
          indicator_id?: string
          last_updated?: string | null
          p10?: number | null
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          sample_size?: number
          sector?: string
          stage?: string
        }
        Relationships: []
      }
      qscore_history: {
        Row: {
          ai_actions: Json | null
          assessment_data: Json | null
          assessment_id: string | null
          available_iq: number | null
          calculated_at: string | null
          cohort_scores: Json | null
          created_at: string | null
          data_source: string | null
          grade: string | null
          gtm_diagnostics: Json | null
          id: string
          iq_breakdown: Json | null
          overall_score: number
          p1_score: number | null
          p2_score: number | null
          p3_score: number | null
          p4_score: number | null
          p5_score: number | null
          p6_score: number | null
          percentile: number | null
          previous_score_id: string | null
          reconciliation_flags: Json | null
          score_version: string
          source_artifact_type: string | null
          track: string | null
          user_id: string | null
          validation_warnings: Json | null
        }
        Insert: {
          ai_actions?: Json | null
          assessment_data?: Json | null
          assessment_id?: string | null
          available_iq?: number | null
          calculated_at?: string | null
          cohort_scores?: Json | null
          created_at?: string | null
          data_source?: string | null
          grade?: string | null
          gtm_diagnostics?: Json | null
          id?: string
          iq_breakdown?: Json | null
          overall_score: number
          p1_score?: number | null
          p2_score?: number | null
          p3_score?: number | null
          p4_score?: number | null
          p5_score?: number | null
          p6_score?: number | null
          percentile?: number | null
          previous_score_id?: string | null
          reconciliation_flags?: Json | null
          score_version?: string
          source_artifact_type?: string | null
          track?: string | null
          user_id?: string | null
          validation_warnings?: Json | null
        }
        Update: {
          ai_actions?: Json | null
          assessment_data?: Json | null
          assessment_id?: string | null
          available_iq?: number | null
          calculated_at?: string | null
          cohort_scores?: Json | null
          created_at?: string | null
          data_source?: string | null
          grade?: string | null
          gtm_diagnostics?: Json | null
          id?: string
          iq_breakdown?: Json | null
          overall_score?: number
          p1_score?: number | null
          p2_score?: number | null
          p3_score?: number | null
          p4_score?: number | null
          p5_score?: number | null
          p6_score?: number | null
          percentile?: number | null
          previous_score_id?: string | null
          reconciliation_flags?: Json | null
          score_version?: string
          source_artifact_type?: string | null
          track?: string | null
          user_id?: string | null
          validation_warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "qscore_history_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "qscore_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qscore_history_previous_score_id_fkey"
            columns: ["previous_score_id"]
            isOneToOne: false
            referencedRelation: "qscore_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qscore_history_previous_score_id_fkey"
            columns: ["previous_score_id"]
            isOneToOne: false
            referencedRelation: "qscore_with_delta"
            referencedColumns: ["id"]
          },
        ]
      }
      qscore_knowledge_chunks: {
        Row: {
          active: boolean
          category: string
          content: string
          created_at: string
          dimension: string
          id: string
          metadata: Json
          sector: string[]
          stage: string[]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          content: string
          created_at?: string
          dimension: string
          id: string
          metadata?: Json
          sector: string[]
          stage: string[]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          content?: string
          created_at?: string
          dimension?: string
          id?: string
          metadata?: Json
          sector?: string[]
          stage?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      qscore_reconciliation_log: {
        Row: {
          ai_estimate: Json | null
          anomaly_severity: string | null
          applied: boolean
          confidence_adjustment: number | null
          created_at: string | null
          deviation: number | null
          error: string | null
          founder_value: Json | null
          id: string
          indicator_id: string
          user_id: string | null
          vc_alert: string | null
        }
        Insert: {
          ai_estimate?: Json | null
          anomaly_severity?: string | null
          applied?: boolean
          confidence_adjustment?: number | null
          created_at?: string | null
          deviation?: number | null
          error?: string | null
          founder_value?: Json | null
          id?: string
          indicator_id: string
          user_id?: string | null
          vc_alert?: string | null
        }
        Update: {
          ai_estimate?: Json | null
          anomaly_severity?: string | null
          applied?: boolean
          confidence_adjustment?: number | null
          created_at?: string | null
          deviation?: number | null
          error?: string | null
          founder_value?: Json | null
          id?: string
          indicator_id?: string
          user_id?: string | null
          vc_alert?: string | null
        }
        Relationships: []
      }
      rag_execution_logs: {
        Row: {
          answer_quality: Json | null
          benchmark_score: number | null
          cache_hit: boolean
          created_at: string
          dimension: string | null
          error_msg: string | null
          evidence_conflicts: number
          evidence_corroborations: number
          evidence_score: number | null
          final_score: number | null
          id: string
          latency_ms: number | null
          rag_confidence: number | null
          rubric_score: number | null
          scoring_method: string
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          answer_quality?: Json | null
          benchmark_score?: number | null
          cache_hit?: boolean
          created_at?: string
          dimension?: string | null
          error_msg?: string | null
          evidence_conflicts?: number
          evidence_corroborations?: number
          evidence_score?: number | null
          final_score?: number | null
          id?: string
          latency_ms?: number | null
          rag_confidence?: number | null
          rubric_score?: number | null
          scoring_method: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          answer_quality?: Json | null
          benchmark_score?: number | null
          cache_hit?: boolean
          created_at?: string
          dimension?: string | null
          error_msg?: string | null
          evidence_conflicts?: number
          evidence_corroborations?: number
          evidence_score?: number | null
          final_score?: number | null
          id?: string
          latency_ms?: number | null
          rag_confidence?: number | null
          rubric_score?: number | null
          scoring_method?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      rag_score_cache: {
        Row: {
          assessment_hash: string
          created_at: string | null
          expires_at: string | null
          id: string
          scores: Json
          user_id: string
        }
        Insert: {
          assessment_hash: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          scores: Json
          user_id: string
        }
        Update: {
          assessment_hash?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          scores?: Json
          user_id?: string
        }
        Relationships: []
      }
      scheduled_actions: {
        Row: {
          action_type: string
          agent_id: string
          created_at: string
          error: string | null
          execute_at: string
          id: string
          payload: Json
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          agent_id: string
          created_at?: string
          error?: string | null
          execute_at: string
          id?: string
          payload?: Json
          result?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          agent_id?: string
          created_at?: string
          error?: string | null
          execute_at?: string
          id?: string
          payload?: Json
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      score_evidence: {
        Row: {
          created_at: string | null
          data_value: string | null
          description: string | null
          dimension: string
          evidence_type: string
          file_url: string | null
          id: string
          points_awarded: number | null
          reviewed_at: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_value?: string | null
          description?: string | null
          dimension: string
          evidence_type: string
          file_url?: string | null
          id?: string
          points_awarded?: number | null
          reviewed_at?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_value?: string | null
          description?: string | null
          dimension?: string
          evidence_type?: string
          file_url?: string | null
          id?: string
          points_awarded?: number | null
          reviewed_at?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      sector_weight_profiles: {
        Row: {
          p1_weight: number
          p2_weight: number
          p3_weight: number
          p4_weight: number
          p5_weight: number
          p6_weight: number
          rationale: string | null
          sector: string
          updated_at: string | null
        }
        Insert: {
          p1_weight: number
          p2_weight: number
          p3_weight: number
          p4_weight: number
          p5_weight: number
          p6_weight: number
          rationale?: string | null
          sector: string
          updated_at?: string | null
        }
        Update: {
          p1_weight?: number
          p2_weight?: number
          p3_weight?: number
          p4_weight?: number
          p5_weight?: number
          p6_weight?: number
          rationale?: string | null
          sector?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      startup_state: {
        Row: {
          arr: number | null
          cac: number | null
          churn_rate: number | null
          company_name: string | null
          competitor_count: number | null
          created_at: string | null
          day30_retention: number | null
          fundraising_stage: string | null
          gross_margin: number | null
          id: string
          industry: string | null
          investor_readiness_score: number | null
          last_competitor_scan: string | null
          last_updated_by: string | null
          meetings_booked: number | null
          monthly_burn: number | null
          monthly_growth_rate: number | null
          mrr: number | null
          mrr_growth_rate: number | null
          nps_score: number | null
          open_deals_count: number | null
          open_roles_count: number | null
          outreach_open_rate: number | null
          outreach_reply_rate: number | null
          outreach_sent_count: number | null
          paying_customer_count: number | null
          pmf_score: number | null
          runway_months: number | null
          stage: string | null
          team_size: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          arr?: number | null
          cac?: number | null
          churn_rate?: number | null
          company_name?: string | null
          competitor_count?: number | null
          created_at?: string | null
          day30_retention?: number | null
          fundraising_stage?: string | null
          gross_margin?: number | null
          id?: string
          industry?: string | null
          investor_readiness_score?: number | null
          last_competitor_scan?: string | null
          last_updated_by?: string | null
          meetings_booked?: number | null
          monthly_burn?: number | null
          monthly_growth_rate?: number | null
          mrr?: number | null
          mrr_growth_rate?: number | null
          nps_score?: number | null
          open_deals_count?: number | null
          open_roles_count?: number | null
          outreach_open_rate?: number | null
          outreach_reply_rate?: number | null
          outreach_sent_count?: number | null
          paying_customer_count?: number | null
          pmf_score?: number | null
          runway_months?: number | null
          stage?: string | null
          team_size?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          arr?: number | null
          cac?: number | null
          churn_rate?: number | null
          company_name?: string | null
          competitor_count?: number | null
          created_at?: string | null
          day30_retention?: number | null
          fundraising_stage?: string | null
          gross_margin?: number | null
          id?: string
          industry?: string | null
          investor_readiness_score?: number | null
          last_competitor_scan?: string | null
          last_updated_by?: string | null
          meetings_booked?: number | null
          monthly_burn?: number | null
          monthly_growth_rate?: number | null
          mrr?: number | null
          mrr_growth_rate?: number | null
          nps_score?: number | null
          open_deals_count?: number | null
          open_roles_count?: number | null
          outreach_open_rate?: number | null
          outreach_reply_rate?: number | null
          outreach_sent_count?: number | null
          paying_customer_count?: number | null
          pmf_score?: number | null
          runway_months?: number | null
          stage?: string | null
          team_size?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          created_at: string | null
          feature: string
          id: string
          limit_count: number | null
          reset_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          feature: string
          id?: string
          limit_count?: number | null
          reset_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          feature?: string
          id?: string
          limit_count?: number | null
          reset_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          answers: Json
          id: string
          respondent_email: string | null
          submitted_at: string
          survey_id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          id?: string
          respondent_email?: string | null
          submitted_at?: string
          survey_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          id?: string
          respondent_email?: string | null
          submitted_at?: string
          survey_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_execution_logs: {
        Row: {
          agent_id: string
          args_hash: string | null
          cache_hit: boolean
          conversation_id: string | null
          cost_usd: number | null
          created_at: string
          error_msg: string | null
          id: string
          latency_ms: number | null
          model_tier: string | null
          status: string
          tool_name: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          args_hash?: string | null
          cache_hit?: boolean
          conversation_id?: string | null
          cost_usd?: number | null
          created_at?: string
          error_msg?: string | null
          id?: string
          latency_ms?: number | null
          model_tier?: string | null
          status: string
          tool_name: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          args_hash?: string | null
          cache_hit?: boolean
          conversation_id?: string | null
          cost_usd?: number | null
          created_at?: string
          error_msg?: string | null
          id?: string
          latency_ms?: number | null
          model_tier?: string | null
          status?: string
          tool_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tracked_competitors: {
        Row: {
          created_at: string
          id: string
          last_price_data: Json | null
          last_scraped_at: string | null
          name: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_price_data?: Json | null
          last_scraped_at?: string | null
          name: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_price_data?: Json | null
          last_scraped_at?: string | null
          name?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          email: string
          id: string
          name: string | null
          source: string | null
          submitted_at: string
          test_id: string
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          name?: string | null
          source?: string | null
          submitted_at?: string
          test_id: string
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          name?: string | null
          source?: string | null
          submitted_at?: string
          test_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      qscore_with_delta: {
        Row: {
          assessment_id: string | null
          calculated_at: string | null
          grade: string | null
          id: string | null
          overall_change: number | null
          overall_score: number | null
          p1_change: number | null
          p1_score: number | null
          p2_change: number | null
          p2_score: number | null
          p3_change: number | null
          p3_score: number | null
          p4_change: number | null
          p4_score: number | null
          p5_change: number | null
          p5_score: number | null
          p6_change: number | null
          p6_score: number | null
          percentile: number | null
          previous_score_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qscore_history_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "qscore_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qscore_history_previous_score_id_fkey"
            columns: ["previous_score_id"]
            isOneToOne: false
            referencedRelation: "qscore_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qscore_history_previous_score_id_fkey"
            columns: ["previous_score_id"]
            isOneToOne: false
            referencedRelation: "qscore_with_delta"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      compute_qscore_percentile: {
        Args: { target_score: number }
        Returns: number
      }
      increment_usage_if_allowed: {
        Args: { p_feature: string; p_user_id: string }
        Returns: {
          allowed: boolean
          remaining: number
          usage_id: string
        }[]
      }
      match_artifact_embeddings: {
        Args: {
          match_count?: number
          match_threshold?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          artifact_id: string
          chunk_index: number
          chunk_text: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      merge_startup_profile_data: {
        Args: { p_patch: Json; p_user_id: string }
        Returns: undefined
      }
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
