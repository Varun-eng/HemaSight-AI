-- =============================================
-- HemaSight AI - Complete Database Schema
-- =============================================

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- PROFILES ----------
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  role TEXT CHECK (role IN ('patient', 'doctor', 'admin')) DEFAULT 'patient',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- BLOOD TESTS ----------
CREATE TABLE public.blood_tests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  wbc DECIMAL,
  rbc DECIMAL,
  hemoglobin DECIMAL,
  platelets DECIMAL,
  blast_percentage DECIMAL,
  risk_score DECIMAL,
  risk_flag BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blood_tests_patient ON public.blood_tests(patient_id, test_date DESC);

-- ---------- MICROSCOPIC IMAGES ----------
CREATE TABLE public.microscopic_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT CHECK (image_type IN ('original', 'generated', 'reference')) NOT NULL,
  comparison_score DECIMAL,
  matched_reference_id UUID REFERENCES public.microscopic_images(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- ANALYSIS SESSIONS ----------
CREATE TABLE public.analysis_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_test_id UUID REFERENCES public.blood_tests(id) ON DELETE SET NULL,
  generated_image_id UUID REFERENCES public.microscopic_images(id) ON DELETE SET NULL,
  current_stage TEXT CHECK (current_stage IN ('xgboost', 'cgan', 'timeseries', 'chatbot', 'completed')) DEFAULT 'xgboost',
  result_summary TEXT,
  relapse_risk DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- CHAT HISTORY ----------
CREATE TABLE public.chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender TEXT CHECK (sender IN ('user', 'bot')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- DATASET REFERENCES ----------
CREATE TABLE public.dataset_references (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  label TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cell_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microscopic_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_references ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/edit own
CREATE POLICY "View own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Blood tests: users own their records
CREATE POLICY "Own blood tests" ON public.blood_tests
  FOR ALL USING (auth.uid() = patient_id);

-- Images
CREATE POLICY "Own images" ON public.microscopic_images
  FOR ALL USING (auth.uid() = patient_id);

-- Sessions
CREATE POLICY "Own sessions" ON public.analysis_sessions
  FOR ALL USING (auth.uid() = patient_id);

-- Chat
CREATE POLICY "Own chat" ON public.chat_history
  FOR ALL USING (auth.uid() = patient_id);

-- Datasets: readable by all authenticated users
CREATE POLICY "Read datasets" ON public.dataset_references
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('microscopic-images', 'microscopic-images', true);

CREATE POLICY "Upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'microscopic-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "View images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'microscopic-images');