// User and Session Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
}

// Persona Types
export interface Persona {
  id: string;
  user_id?: string;
  session_id?: string;
  
  // Demographics
  location: string;
  age: number;
  occupation: string;
  
  // Family & Household
  dependents: number;
  income_bracket: string;
  
  // Business & Employment
  business_type?: string;
  employee_count?: number;
  
  // Health & Benefits
  has_health_insurance: boolean;
  has_medicare: boolean;
  has_social_security: boolean;
  
  // Education & Community
  school_district?: string;
  has_higher_education: boolean;
  
  created_at: string;
  expires_at: string;
}

// Bill and Analysis Types
export interface BillDocument {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  upload_status: 'pending' | 'uploaded' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface AnalysisRequest {
  id: string;
  persona_id: string;
  bill_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export interface ImpactCard {
  id: string;
  analysis_id: string;
  category: 'education' | 'business' | 'health' | 'general';
  title: string;
  description: string;
  impact_level: 'low' | 'medium' | 'high';
  confidence_score: number;
  source_text: string;
  section_reference: string;
  created_at: string;
}

// Feedback Types
export interface UserFeedback {
  id: string;
  user_id?: string;
  session_id?: string;
  analysis_id?: string;
  rating: number;
  comment?: string;
  feedback_type: 'general' | 'accuracy' | 'usability' | 'feature_request';
  created_at: string;
}

// Analytics Types
export interface AnalyticsEvent {
  id: string;
  user_id?: string;
  session_id?: string;
  event_type: string;
  event_data: Record<string, any>;
  created_at: string;
}

// Export Types
export interface ExportHistory {
  id: string;
  user_id?: string;
  session_id?: string;
  analysis_id: string;
  export_type: 'pdf' | 'csv' | 'json';
  file_path: string;
  created_at: string;
} 