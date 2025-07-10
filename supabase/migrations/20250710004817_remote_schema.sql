

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."cleanup_expired_personas"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM personas WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_personas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_bill_hierarchy"("node_id_param" integer) RETURNS TABLE("id" integer, "bill_id" character varying, "parent_id" integer, "level" character varying, "heading" "text", "node_text" "text", "full_path" "text", "depth" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE bill_hierarchy AS (
        -- Base case: start with the specified node
        SELECT 
            bn.id,
            bn.bill_id,
            bn.parent_id,
            bn.level,
            bn.heading,
            bn.node_text,
            bn.full_path,
            0 as depth
        FROM bill_nodes bn
        WHERE bn.id = node_id_param
        
        UNION ALL
        
        -- Recursive case: find children
        SELECT 
            bn.id,
            bn.bill_id,
            bn.parent_id,
            bn.level,
            bn.heading,
            bn.node_text,
            bn.full_path,
            bh.depth + 1
        FROM bill_nodes bn
        INNER JOIN bill_hierarchy bh ON bn.parent_id = bh.id
    )
    SELECT * FROM bill_hierarchy
    ORDER BY depth, id;
END;
$$;


ALTER FUNCTION "public"."get_bill_hierarchy"("node_id_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_message_analytics"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO message_signature_analytics (message_id, total_signatures, campaign_started_at)
    SELECT 
        id as message_id,
        0 as total_signatures,
        created_at as campaign_started_at
    FROM generated_representative_messages
    WHERE id NOT IN (SELECT message_id FROM message_signature_analytics)
    ON CONFLICT (message_id) DO NOTHING;
    
    -- Update counts for existing signatures
    UPDATE message_signature_analytics 
    SET total_signatures = (
        SELECT COUNT(*) 
        FROM message_signatures 
        WHERE message_signatures.message_id = message_signature_analytics.message_id
    );
END;
$$;


ALTER FUNCTION "public"."initialize_message_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_user_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_user_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_summary_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" bigint, "summary_id" bigint, "bill_table_id" integer, "chunk_text" "text", "source_column" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.summary_id,
    se.bill_table_id,
    se.chunk_text,
    se.source_column,
    1 - (se.embedding <=> query_embedding) AS similarity
  FROM
    summary_embeddings AS se
  WHERE 1 - (se.embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$;


ALTER FUNCTION "public"."match_summary_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_bill_chunks"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.8, "match_count" integer DEFAULT 10) RETURNS TABLE("id" integer, "node_id" integer, "bill_id" character varying, "chunk_text" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        bill_chunks.id,
        bill_chunks.node_id,
        bill_chunks.bill_id,
        bill_chunks.chunk_text,
        bill_chunks.metadata,
        1 - (bill_chunks.embedding <-> query_embedding) as similarity
    FROM bill_chunks
    WHERE 1 - (bill_chunks.embedding <-> query_embedding) > match_threshold
    ORDER BY bill_chunks.embedding <-> query_embedding
    LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_bill_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_message_signature_analytics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update or insert analytics record
        INSERT INTO message_signature_analytics (message_id, total_signatures, last_signature_at)
        VALUES (NEW.message_id, 1, COALESCE(NEW.signed_at, NEW.created_at))
        ON CONFLICT (message_id) 
        DO UPDATE SET 
            total_signatures = message_signature_analytics.total_signatures + 1,
            last_signature_at = COALESCE(NEW.signed_at, NEW.created_at);
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrease signature count
        UPDATE message_signature_analytics 
        SET total_signatures = GREATEST(total_signatures - 1, 0)
        WHERE message_id = OLD.message_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_message_signature_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_preferences_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_bill_summaries" (
    "id" integer NOT NULL,
    "bill_id" character varying(50) NOT NULL,
    "what_it_does" "text" NOT NULL,
    "key_changes" "text"[] NOT NULL,
    "who_it_affects" "text"[] NOT NULL,
    "fiscal_impact" "text" NOT NULL,
    "timeline" "text" NOT NULL,
    "model_used" character varying(100) DEFAULT 'gpt-4o-mini'::character varying NOT NULL,
    "generated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "bill_text_hash" character varying(64) NOT NULL,
    "bill_table_id" integer NOT NULL,
    "is_embedded" boolean DEFAULT false
);


ALTER TABLE "public"."ai_bill_summaries" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ai_bill_summaries"."bill_table_id" IS 'Foreign key to bills.id primary key - preferred over bill_id string reference';



CREATE SEQUENCE IF NOT EXISTS "public"."ai_bill_summaries_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ai_bill_summaries_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ai_bill_summaries_id_seq" OWNED BY "public"."ai_bill_summaries"."id";



CREATE TABLE IF NOT EXISTS "public"."bill_actions" (
    "id" integer NOT NULL,
    "bill_id" character varying(50) NOT NULL,
    "action_date" "date",
    "action_code" character varying(20),
    "action_text" "text",
    "source_system" character varying(50),
    "committee_code" character varying(20),
    "committee_name" character varying(255),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."bill_actions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bill_actions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bill_actions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bill_actions_id_seq" OWNED BY "public"."bill_actions"."id";



CREATE TABLE IF NOT EXISTS "public"."bill_chunks" (
    "id" integer NOT NULL,
    "node_id" integer NOT NULL,
    "bill_id" character varying(255) NOT NULL,
    "chunk_text" "text",
    "embedding" "public"."vector"(1536),
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."bill_chunks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bill_chunks_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bill_chunks_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bill_chunks_id_seq" OWNED BY "public"."bill_chunks"."id";



CREATE TABLE IF NOT EXISTS "public"."bill_cosponsors" (
    "id" integer NOT NULL,
    "bill_id" character varying(50) NOT NULL,
    "member_id" character varying(50) NOT NULL,
    "member_name" character varying(255),
    "party" character varying(10),
    "state" character varying(2),
    "district" integer,
    "sponsorship_date" "date",
    "is_withdrawn" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."bill_cosponsors" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bill_cosponsors_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bill_cosponsors_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bill_cosponsors_id_seq" OWNED BY "public"."bill_cosponsors"."id";



CREATE TABLE IF NOT EXISTS "public"."bill_nodes" (
    "id" integer NOT NULL,
    "bill_id" character varying(255) NOT NULL,
    "parent_id" integer,
    "level" character varying(50) NOT NULL,
    "heading" "text",
    "node_text" "text",
    "full_path" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."bill_nodes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bill_nodes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bill_nodes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bill_nodes_id_seq" OWNED BY "public"."bill_nodes"."id";



CREATE TABLE IF NOT EXISTS "public"."bill_subjects" (
    "id" integer NOT NULL,
    "bill_id" character varying(50) NOT NULL,
    "subject_name" character varying(255) NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."bill_subjects" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bill_subjects_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bill_subjects_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bill_subjects_id_seq" OWNED BY "public"."bill_subjects"."id";



CREATE TABLE IF NOT EXISTS "public"."bill_summaries" (
    "id" integer NOT NULL,
    "bill_id" character varying(50) NOT NULL,
    "version_code" character varying(20),
    "action_date" "date",
    "action_desc" character varying(255),
    "update_date" timestamp without time zone,
    "summary_text" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."bill_summaries" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bill_summaries_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bill_summaries_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bill_summaries_id_seq" OWNED BY "public"."bill_summaries"."id";



CREATE TABLE IF NOT EXISTS "public"."bill_vote_counters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "bill_id" character varying(50),
    "support_count" integer DEFAULT 0,
    "oppose_count" integer DEFAULT 0,
    "total_votes" integer GENERATED ALWAYS AS (("support_count" + "oppose_count")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bill_vote_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bills" (
    "id" integer NOT NULL,
    "bill_id" character varying(50) NOT NULL,
    "congress" integer NOT NULL,
    "type" character varying(10) NOT NULL,
    "number" integer NOT NULL,
    "title" "text",
    "introduced_date" "date",
    "latest_action_date" "date",
    "latest_action" "text",
    "sponsor_id" character varying(50),
    "sponsor_name" character varying(255),
    "sponsor_party" character varying(10),
    "sponsor_state" character varying(2),
    "is_active" boolean DEFAULT true,
    "policy_area" character varying(255),
    "cboc_estimate_url" "text",
    "constitutional_authority_text" "text",
    "origin_chamber" character varying(20),
    "update_date" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "raw_data" "jsonb",
    "summary" "text",
    "text" "text",
    "jurisdiction" character varying(2) DEFAULT 'US'::character varying,
    "tags" "text"[]
);


ALTER TABLE "public"."bills" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bills"."summary" IS 'Latest summary text for the bill - added for summary functionality';



COMMENT ON COLUMN "public"."bills"."jurisdiction" IS 'Jurisdiction code: US for federal, state abbreviations for state bills (AL, CA, etc.)';



CREATE SEQUENCE IF NOT EXISTS "public"."bills_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bills_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bills_id_seq" OWNED BY "public"."bills"."id";



CREATE TABLE IF NOT EXISTS "public"."committees" (
    "id" integer NOT NULL,
    "committee_code" character varying(20) NOT NULL,
    "congress" integer NOT NULL,
    "chamber" character varying(20) NOT NULL,
    "name" character varying(255),
    "committee_type" character varying(50),
    "parent_committee_code" character varying(20),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."committees" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."committees_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."committees_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."committees_id_seq" OWNED BY "public"."committees"."id";



CREATE TABLE IF NOT EXISTS "public"."export_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid",
    "analysis_id" "uuid" NOT NULL,
    "export_type" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "export_history_export_type_check" CHECK (("export_type" = ANY (ARRAY['pdf'::"text", 'csv'::"text", 'json'::"text"])))
);


ALTER TABLE "public"."export_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."generated_representative_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "bill_id" character varying(50),
    "sentiment" character varying(10) NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "threshold_reached" integer NOT NULL,
    "target_state" character varying(2),
    "target_district" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "generated_representative_messages_sentiment_check" CHECK ((("sentiment")::"text" = ANY ((ARRAY['support'::character varying, 'oppose'::character varying])::"text"[])))
);


ALTER TABLE "public"."generated_representative_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" integer NOT NULL,
    "member_id" character varying(50) NOT NULL,
    "congress" integer NOT NULL,
    "chamber" character varying(20) NOT NULL,
    "title" character varying(10),
    "first_name" character varying(100),
    "middle_name" character varying(100),
    "last_name" character varying(100),
    "suffix" character varying(20),
    "nickname" character varying(100),
    "full_name" character varying(255),
    "birth_year" integer,
    "death_year" integer,
    "party" character varying(10),
    "state" character varying(2),
    "district" integer,
    "leadership_role" character varying(100),
    "terms" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."members_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."members_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."members_id_seq" OWNED BY "public"."members"."id";



CREATE TABLE IF NOT EXISTS "public"."message_signature_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "total_signatures" integer DEFAULT 0,
    "target_signatures" integer DEFAULT 100,
    "campaign_status" "text" DEFAULT 'active'::"text",
    "campaign_started_at" timestamp with time zone DEFAULT "now"(),
    "campaign_sent_at" timestamp with time zone,
    "last_signature_at" timestamp with time zone,
    CONSTRAINT "message_signature_analytics_campaign_status_check" CHECK (("campaign_status" = ANY (ARRAY['active'::"text", 'sent'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."message_signature_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_signature_analytics" IS 'Tracks signature campaign metrics and status for generated representative messages';



COMMENT ON COLUMN "public"."message_signature_analytics"."total_signatures" IS 'Current total number of signatures';



COMMENT ON COLUMN "public"."message_signature_analytics"."target_signatures" IS 'Target number of signatures before sending';



COMMENT ON COLUMN "public"."message_signature_analytics"."campaign_status" IS 'Status of the signature campaign (active/sent/closed)';



CREATE TABLE IF NOT EXISTS "public"."message_signatures" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message_id" "uuid",
    "user_id" "uuid",
    "user_name" "text" NOT NULL,
    "user_email" "text",
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    "signed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_signatures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid",
    "location" "text" NOT NULL,
    "age" integer NOT NULL,
    "occupation" "text" NOT NULL,
    "dependents" integer DEFAULT 0 NOT NULL,
    "income_bracket" "text" NOT NULL,
    "business_type" "text",
    "employee_count" integer,
    "has_health_insurance" boolean DEFAULT false NOT NULL,
    "has_medicare" boolean DEFAULT false NOT NULL,
    "has_social_security" boolean DEFAULT false NOT NULL,
    "school_district" "text",
    "has_higher_education" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval) NOT NULL,
    CONSTRAINT "personas_age_check" CHECK ((("age" >= 18) AND ("age" <= 120))),
    CONSTRAINT "personas_dependents_check" CHECK (("dependents" >= 0)),
    CONSTRAINT "personas_employee_count_check" CHECK (("employee_count" > 0))
);


ALTER TABLE "public"."personas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sent_representative_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message_id" "uuid",
    "representative_bioguide_id" character varying(20) NOT NULL,
    "representative_name" "text" NOT NULL,
    "representative_title" "text" NOT NULL,
    "representative_party" character varying(5) NOT NULL,
    "representative_state" character varying(2) NOT NULL,
    "representative_district" integer,
    "signature_count" integer NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "delivery_status" character varying(20) DEFAULT 'pending'::character varying,
    CONSTRAINT "sent_representative_messages_delivery_status_check" CHECK ((("delivery_status")::"text" = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'delivered'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "public"."sent_representative_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."summary_embeddings" (
    "id" bigint NOT NULL,
    "summary_id" bigint NOT NULL,
    "bill_table_id" integer NOT NULL,
    "source_column" "text" NOT NULL,
    "chunk_text" "text" NOT NULL,
    "embedding" "public"."vector"(1536) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."summary_embeddings" OWNER TO "postgres";


ALTER TABLE "public"."summary_embeddings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."summary_embeddings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."usage_analytics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid",
    "event_type" "text" NOT NULL,
    "event_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."usage_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_bill_votes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "bill_id" character varying(50),
    "sentiment" character varying(10) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_bill_votes_sentiment_check" CHECK ((("sentiment")::"text" = ANY ((ARRAY['support'::character varying, 'oppose'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_bill_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_feedback" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid",
    "analysis_id" "uuid",
    "rating" integer NOT NULL,
    "comment" "text",
    "feedback_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_feedback_feedback_type_check" CHECK (("feedback_type" = ANY (ARRAY['general'::"text", 'accuracy'::"text", 'usability'::"text", 'feature_request'::"text"]))),
    CONSTRAINT "user_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."user_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "notify_analysis_complete" boolean DEFAULT true NOT NULL,
    "notify_weekly_digest" boolean DEFAULT false NOT NULL,
    "notify_new_features" boolean DEFAULT true NOT NULL,
    "data_retention_enabled" boolean DEFAULT true NOT NULL,
    "analytics_enabled" boolean DEFAULT false NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_preferences" IS 'Stores user notification preferences, privacy settings, and profile information';



COMMENT ON COLUMN "public"."user_preferences"."notify_analysis_complete" IS 'Whether user wants notifications when analysis is complete';



COMMENT ON COLUMN "public"."user_preferences"."notify_weekly_digest" IS 'Whether user wants weekly digest emails';



COMMENT ON COLUMN "public"."user_preferences"."notify_new_features" IS 'Whether user wants notifications about new features';



COMMENT ON COLUMN "public"."user_preferences"."data_retention_enabled" IS 'Whether to automatically delete session data after 24 hours';



COMMENT ON COLUMN "public"."user_preferences"."analytics_enabled" IS 'Whether user consents to anonymous analytics collection';



CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "session_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_bill_summaries" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ai_bill_summaries_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bill_actions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bill_actions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bill_chunks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bill_chunks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bill_cosponsors" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bill_cosponsors_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bill_nodes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bill_nodes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bill_subjects" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bill_subjects_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bill_summaries" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bill_summaries_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bills" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bills_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."committees" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."committees_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."members" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."members_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_bill_summaries"
    ADD CONSTRAINT "ai_bill_summaries_bill_id_key" UNIQUE ("bill_id");



ALTER TABLE ONLY "public"."ai_bill_summaries"
    ADD CONSTRAINT "ai_bill_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_actions"
    ADD CONSTRAINT "bill_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_chunks"
    ADD CONSTRAINT "bill_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_cosponsors"
    ADD CONSTRAINT "bill_cosponsors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_nodes"
    ADD CONSTRAINT "bill_nodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_subjects"
    ADD CONSTRAINT "bill_subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_summaries"
    ADD CONSTRAINT "bill_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_vote_counters"
    ADD CONSTRAINT "bill_vote_counters_bill_id_key" UNIQUE ("bill_id");



ALTER TABLE ONLY "public"."bill_vote_counters"
    ADD CONSTRAINT "bill_vote_counters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_bill_id_key" UNIQUE ("bill_id");



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."committees"
    ADD CONSTRAINT "committees_committee_code_key" UNIQUE ("committee_code");



ALTER TABLE ONLY "public"."committees"
    ADD CONSTRAINT "committees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."export_history"
    ADD CONSTRAINT "export_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generated_representative_messages"
    ADD CONSTRAINT "generated_representative_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_member_id_key" UNIQUE ("member_id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_signature_analytics"
    ADD CONSTRAINT "message_signature_analytics_message_id_key" UNIQUE ("message_id");



ALTER TABLE ONLY "public"."message_signature_analytics"
    ADD CONSTRAINT "message_signature_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_signatures"
    ADD CONSTRAINT "message_signatures_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_signatures"
    ADD CONSTRAINT "message_signatures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personas"
    ADD CONSTRAINT "personas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sent_representative_messages"
    ADD CONSTRAINT "sent_representative_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."summary_embeddings"
    ADD CONSTRAINT "summary_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_analytics"
    ADD CONSTRAINT "usage_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_bill_votes"
    ADD CONSTRAINT "user_bill_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_bill_votes"
    ADD CONSTRAINT "user_bill_votes_user_id_bill_id_key" UNIQUE ("user_id", "bill_id");



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



CREATE INDEX "bill_chunks_embedding_idx" ON "public"."bill_chunks" USING "ivfflat" ("embedding") WITH ("lists"='100');



CREATE INDEX "idx_ai_bill_summaries_bill_id" ON "public"."ai_bill_summaries" USING "btree" ("bill_id");



CREATE INDEX "idx_ai_bill_summaries_bill_table_id" ON "public"."ai_bill_summaries" USING "btree" ("bill_table_id");



CREATE INDEX "idx_bill_actions_action_date" ON "public"."bill_actions" USING "btree" ("action_date");



CREATE INDEX "idx_bill_actions_bill_id" ON "public"."bill_actions" USING "btree" ("bill_id");



CREATE INDEX "idx_bill_chunks_bill_id" ON "public"."bill_chunks" USING "btree" ("bill_id");



CREATE INDEX "idx_bill_chunks_node_id" ON "public"."bill_chunks" USING "btree" ("node_id");



CREATE INDEX "idx_bill_cosponsors_bill_id" ON "public"."bill_cosponsors" USING "btree" ("bill_id");



CREATE INDEX "idx_bill_cosponsors_member_id" ON "public"."bill_cosponsors" USING "btree" ("member_id");



CREATE INDEX "idx_bill_nodes_bill_id" ON "public"."bill_nodes" USING "btree" ("bill_id");



CREATE INDEX "idx_bill_nodes_parent_id" ON "public"."bill_nodes" USING "btree" ("parent_id");



CREATE INDEX "idx_bill_subjects_bill_id" ON "public"."bill_subjects" USING "btree" ("bill_id");



CREATE INDEX "idx_bill_subjects_subject_name" ON "public"."bill_subjects" USING "btree" ("subject_name");



CREATE INDEX "idx_bill_summaries_bill_id" ON "public"."bill_summaries" USING "btree" ("bill_id");



CREATE INDEX "idx_bill_vote_counters_bill_id" ON "public"."bill_vote_counters" USING "btree" ("bill_id");



CREATE INDEX "idx_bills_congress" ON "public"."bills" USING "btree" ("congress");



CREATE INDEX "idx_bills_introduced_date" ON "public"."bills" USING "btree" ("introduced_date");



CREATE INDEX "idx_bills_is_active" ON "public"."bills" USING "btree" ("is_active");



CREATE INDEX "idx_bills_jurisdiction" ON "public"."bills" USING "btree" ("jurisdiction");



CREATE INDEX "idx_bills_policy_area" ON "public"."bills" USING "btree" ("policy_area");



CREATE INDEX "idx_bills_sponsor_id" ON "public"."bills" USING "btree" ("sponsor_id");



CREATE INDEX "idx_bills_summary" ON "public"."bills" USING "gin" ("to_tsvector"('"english"'::"regconfig", "summary"));



CREATE INDEX "idx_bills_text" ON "public"."bills" USING "gin" ("to_tsvector"('"english"'::"regconfig", "text"));



CREATE INDEX "idx_bills_title" ON "public"."bills" USING "gin" ("to_tsvector"('"english"'::"regconfig", "title"));



CREATE INDEX "idx_committees_chamber" ON "public"."committees" USING "btree" ("chamber");



CREATE INDEX "idx_committees_congress" ON "public"."committees" USING "btree" ("congress");



CREATE INDEX "idx_export_history_session_id" ON "public"."export_history" USING "btree" ("session_id");



CREATE INDEX "idx_export_history_user_id" ON "public"."export_history" USING "btree" ("user_id");



CREATE INDEX "idx_generated_messages_bill_id" ON "public"."generated_representative_messages" USING "btree" ("bill_id");



CREATE INDEX "idx_generated_messages_sentiment" ON "public"."generated_representative_messages" USING "btree" ("sentiment");



CREATE INDEX "idx_members_chamber" ON "public"."members" USING "btree" ("chamber");



CREATE INDEX "idx_members_congress" ON "public"."members" USING "btree" ("congress");



CREATE INDEX "idx_members_party" ON "public"."members" USING "btree" ("party");



CREATE INDEX "idx_members_state" ON "public"."members" USING "btree" ("state");



CREATE INDEX "idx_message_signature_analytics_campaign_status" ON "public"."message_signature_analytics" USING "btree" ("campaign_status");



CREATE INDEX "idx_message_signature_analytics_message_id" ON "public"."message_signature_analytics" USING "btree" ("message_id");



CREATE INDEX "idx_message_signatures_created_at" ON "public"."message_signatures" USING "btree" ("created_at");



CREATE INDEX "idx_message_signatures_message_id" ON "public"."message_signatures" USING "btree" ("message_id");



CREATE INDEX "idx_message_signatures_user_id" ON "public"."message_signatures" USING "btree" ("user_id");



CREATE INDEX "idx_personas_expires_at" ON "public"."personas" USING "btree" ("expires_at");



CREATE INDEX "idx_personas_session_id" ON "public"."personas" USING "btree" ("session_id");



CREATE INDEX "idx_personas_user_id" ON "public"."personas" USING "btree" ("user_id");



CREATE INDEX "idx_sent_messages_message_id" ON "public"."sent_representative_messages" USING "btree" ("message_id");



CREATE INDEX "idx_usage_analytics_event_type" ON "public"."usage_analytics" USING "btree" ("event_type");



CREATE INDEX "idx_usage_analytics_session_id" ON "public"."usage_analytics" USING "btree" ("session_id");



CREATE INDEX "idx_usage_analytics_user_id" ON "public"."usage_analytics" USING "btree" ("user_id");



CREATE INDEX "idx_user_bill_votes_bill_id" ON "public"."user_bill_votes" USING "btree" ("bill_id");



CREATE INDEX "idx_user_bill_votes_user_id" ON "public"."user_bill_votes" USING "btree" ("user_id");



CREATE INDEX "idx_user_feedback_session_id" ON "public"."user_feedback" USING "btree" ("session_id");



CREATE INDEX "idx_user_feedback_user_id" ON "public"."user_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_sessions_expires_at" ON "public"."user_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_user_sessions_user_id" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE INDEX "summary_embeddings_embedding_idx" ON "public"."summary_embeddings" USING "hnsw" ("embedding" "public"."vector_cosine_ops");



CREATE OR REPLACE TRIGGER "update_message_signature_analytics_trigger" AFTER INSERT OR DELETE ON "public"."message_signatures" FOR EACH ROW EXECUTE FUNCTION "public"."update_message_signature_analytics"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_preferences_updated_at"();



ALTER TABLE ONLY "public"."bill_actions"
    ADD CONSTRAINT "bill_actions_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("bill_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_chunks"
    ADD CONSTRAINT "bill_chunks_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "public"."bill_nodes"("id");



ALTER TABLE ONLY "public"."bill_cosponsors"
    ADD CONSTRAINT "bill_cosponsors_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("bill_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_nodes"
    ADD CONSTRAINT "bill_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."bill_nodes"("id");



ALTER TABLE ONLY "public"."bill_subjects"
    ADD CONSTRAINT "bill_subjects_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("bill_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_summaries"
    ADD CONSTRAINT "bill_summaries_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("bill_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_vote_counters"
    ADD CONSTRAINT "bill_vote_counters_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("bill_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."export_history"
    ADD CONSTRAINT "export_history_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."export_history"
    ADD CONSTRAINT "export_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_bill_summaries"
    ADD CONSTRAINT "fk_ai_summaries_bill_id" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("bill_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_bill_summaries"
    ADD CONSTRAINT "fk_ai_summaries_bill_table_id" FOREIGN KEY ("bill_table_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generated_representative_messages"
    ADD CONSTRAINT "generated_representative_messages_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("bill_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_signature_analytics"
    ADD CONSTRAINT "message_signature_analytics_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."generated_representative_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_signatures"
    ADD CONSTRAINT "message_signatures_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."generated_representative_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_signatures"
    ADD CONSTRAINT "message_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personas"
    ADD CONSTRAINT "personas_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personas"
    ADD CONSTRAINT "personas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sent_representative_messages"
    ADD CONSTRAINT "sent_representative_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."generated_representative_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."summary_embeddings"
    ADD CONSTRAINT "summary_embeddings_bill_table_id_fkey" FOREIGN KEY ("bill_table_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."summary_embeddings"
    ADD CONSTRAINT "summary_embeddings_summary_id_fkey" FOREIGN KEY ("summary_id") REFERENCES "public"."ai_bill_summaries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_analytics"
    ADD CONSTRAINT "usage_analytics_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usage_analytics"
    ADD CONSTRAINT "usage_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_bill_votes"
    ADD CONSTRAINT "user_bill_votes_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("bill_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_bill_votes"
    ADD CONSTRAINT "user_bill_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Analytics are publicly viewable" ON "public"."message_signature_analytics" FOR SELECT USING (true);



CREATE POLICY "Anyone can view bill chunks" ON "public"."bill_chunks" FOR SELECT USING (true);



CREATE POLICY "Anyone can view bill nodes" ON "public"."bill_nodes" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can delete bill_actions" ON "public"."bill_actions" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete bill_cosponsors" ON "public"."bill_cosponsors" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete bill_subjects" ON "public"."bill_subjects" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete bill_summaries" ON "public"."bill_summaries" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete bills" ON "public"."bills" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete committees" ON "public"."committees" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete members" ON "public"."members" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert analytics" ON "public"."message_signature_analytics" FOR INSERT WITH CHECK (true);



CREATE POLICY "Authenticated users can insert bill_actions" ON "public"."bill_actions" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert bill_cosponsors" ON "public"."bill_cosponsors" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert bill_subjects" ON "public"."bill_subjects" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert bill_summaries" ON "public"."bill_summaries" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert bills" ON "public"."bills" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert committees" ON "public"."committees" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert members" ON "public"."members" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update analytics" ON "public"."message_signature_analytics" FOR UPDATE USING (true);



CREATE POLICY "Authenticated users can update bill_actions" ON "public"."bill_actions" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update bill_cosponsors" ON "public"."bill_cosponsors" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update bill_subjects" ON "public"."bill_subjects" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update bill_summaries" ON "public"."bill_summaries" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update bills" ON "public"."bills" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update committees" ON "public"."committees" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update members" ON "public"."members" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Public read access on ai_bill_summaries" ON "public"."ai_bill_summaries" FOR SELECT USING (true);



CREATE POLICY "Public read access on bill_actions" ON "public"."bill_actions" FOR SELECT USING (true);



CREATE POLICY "Public read access on bill_cosponsors" ON "public"."bill_cosponsors" FOR SELECT USING (true);



CREATE POLICY "Public read access on bill_subjects" ON "public"."bill_subjects" FOR SELECT USING (true);



CREATE POLICY "Public read access on bill_summaries" ON "public"."bill_summaries" FOR SELECT USING (true);



CREATE POLICY "Public read access on bills" ON "public"."bills" FOR SELECT USING (true);



CREATE POLICY "Public read access on committees" ON "public"."committees" FOR SELECT USING (true);



CREATE POLICY "Public read access on members" ON "public"."members" FOR SELECT USING (true);



CREATE POLICY "Service role can manage bill chunks" ON "public"."bill_chunks" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage bill nodes" ON "public"."bill_nodes" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can delete their own personas" ON "public"."personas" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("session_id" IS NOT NULL)));



CREATE POLICY "Users can delete their own preferences" ON "public"."user_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own sessions" ON "public"."user_sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert analytics" ON "public"."usage_analytics" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert export history" ON "public"."export_history" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert feedback" ON "public"."user_feedback" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert personas" ON "public"."personas" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert their own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own sessions" ON "public"."user_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own personas" ON "public"."personas" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("session_id" IS NOT NULL)));



CREATE POLICY "Users can update their own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own sessions" ON "public"."user_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own analytics" ON "public"."usage_analytics" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("session_id" IS NOT NULL)));



CREATE POLICY "Users can view their own export history" ON "public"."export_history" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("session_id" IS NOT NULL)));



CREATE POLICY "Users can view their own feedback" ON "public"."user_feedback" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("session_id" IS NOT NULL)));



CREATE POLICY "Users can view their own personas" ON "public"."personas" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("session_id" IS NOT NULL)));



CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sessions" ON "public"."user_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ai_bill_summaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_cosponsors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_nodes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_summaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."committees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."export_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_signature_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_personas"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_personas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_personas"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bill_hierarchy"("node_id_param" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_bill_hierarchy"("node_id_param" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bill_hierarchy"("node_id_param" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_message_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_message_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_message_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_user_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_user_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_user_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_summary_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_summary_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_summary_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_bill_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_bill_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_bill_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_message_signature_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_message_signature_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_message_signature_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."ai_bill_summaries" TO "anon";
GRANT ALL ON TABLE "public"."ai_bill_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_bill_summaries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_bill_summaries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_bill_summaries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_bill_summaries_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bill_actions" TO "anon";
GRANT ALL ON TABLE "public"."bill_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_actions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bill_actions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bill_actions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bill_actions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bill_chunks" TO "anon";
GRANT ALL ON TABLE "public"."bill_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_chunks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bill_chunks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bill_chunks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bill_chunks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bill_cosponsors" TO "anon";
GRANT ALL ON TABLE "public"."bill_cosponsors" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_cosponsors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bill_cosponsors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bill_cosponsors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bill_cosponsors_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bill_nodes" TO "anon";
GRANT ALL ON TABLE "public"."bill_nodes" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_nodes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bill_nodes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bill_nodes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bill_nodes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bill_subjects" TO "anon";
GRANT ALL ON TABLE "public"."bill_subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_subjects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bill_subjects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bill_subjects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bill_subjects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bill_summaries" TO "anon";
GRANT ALL ON TABLE "public"."bill_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_summaries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bill_summaries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bill_summaries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bill_summaries_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bill_vote_counters" TO "anon";
GRANT ALL ON TABLE "public"."bill_vote_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_vote_counters" TO "service_role";



GRANT ALL ON TABLE "public"."bills" TO "anon";
GRANT ALL ON TABLE "public"."bills" TO "authenticated";
GRANT ALL ON TABLE "public"."bills" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bills_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bills_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bills_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."committees" TO "anon";
GRANT ALL ON TABLE "public"."committees" TO "authenticated";
GRANT ALL ON TABLE "public"."committees" TO "service_role";



GRANT ALL ON SEQUENCE "public"."committees_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."committees_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."committees_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."export_history" TO "anon";
GRANT ALL ON TABLE "public"."export_history" TO "authenticated";
GRANT ALL ON TABLE "public"."export_history" TO "service_role";



GRANT ALL ON TABLE "public"."generated_representative_messages" TO "anon";
GRANT ALL ON TABLE "public"."generated_representative_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."generated_representative_messages" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."members_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."message_signature_analytics" TO "anon";
GRANT ALL ON TABLE "public"."message_signature_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."message_signature_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."message_signatures" TO "anon";
GRANT ALL ON TABLE "public"."message_signatures" TO "authenticated";
GRANT ALL ON TABLE "public"."message_signatures" TO "service_role";



GRANT ALL ON TABLE "public"."personas" TO "anon";
GRANT ALL ON TABLE "public"."personas" TO "authenticated";
GRANT ALL ON TABLE "public"."personas" TO "service_role";



GRANT ALL ON TABLE "public"."sent_representative_messages" TO "anon";
GRANT ALL ON TABLE "public"."sent_representative_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."sent_representative_messages" TO "service_role";



GRANT ALL ON TABLE "public"."summary_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."summary_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."summary_embeddings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."summary_embeddings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."summary_embeddings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."summary_embeddings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."usage_analytics" TO "anon";
GRANT ALL ON TABLE "public"."usage_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."user_bill_votes" TO "anon";
GRANT ALL ON TABLE "public"."user_bill_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_bill_votes" TO "service_role";



GRANT ALL ON TABLE "public"."user_feedback" TO "anon";
GRANT ALL ON TABLE "public"."user_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."user_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
