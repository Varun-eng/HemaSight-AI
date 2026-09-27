export interface CBCData {
  // Core CBC
  wbc: number;
  rbc: number;
  hgb: number;
  plt: number;
  totalCount?: number;

  // Differential
  anc?: number;
  neutrophils?: number;
  lymphocytes?: number;
  monocytes?: number;
  eosinophils?: number;
  basophils?: number;
  blasts: number;

  // RBC indices
  mcv?: number;
  mch?: number;
  mchc?: number;
  rdw: number;

  // Organ function
  sgot?: number;   // AST
  sgpt?: number;   // ALT
  creatinine?: number;
  potassium?: number;

  // Transplant monitoring
  gvhd?: string;      // 'none' | 'skin' | 'gut' | 'liver' | 'multi'
  chimerism?: number; // % donor cells

  // Meta
  sampleDate?: string;
  reportImageUrl?: string;
  notes?: string;
}

export interface UserProfile {
  name: string;
  mrn?: string;
  role: 'patient' | 'doctor' | 'admin';
  diagnosis?: string;
  oncologistName?: string;
  email?: string;
}

export interface XGBoostResult {
  riskPercent: number;
  riskCategory: 'Low' | 'Moderate' | 'High' | 'Critical';
  primaryCondition: string;
  modelConfidence: string;
}

export interface LongitudinalDataPoint {
  date: string;
  month: number;
  anc: number;
  blasts: number;
  sgot?: number;
  sgpt?: number;
  potassium?: number;
  creatinine?: number;
  chimerism?: number;
}

export interface ComplianceSettings {
  anonymize: boolean;
  autoRefresh: boolean;
  notifyEmail: boolean;
}