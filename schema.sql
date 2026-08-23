-- ============================================================================
-- ONLINE TEST / EXAM PLATFORM - CLEAN SUPABASE SCHEMA
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TESTS TABLE
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
    passing_percentage NUMERIC(5,2) NOT NULL DEFAULT 40.00 CHECK (passing_percentage >= 0 AND passing_percentage <= 100),
    marks_per_correct NUMERIC(6,2) NOT NULL DEFAULT 1.00 CHECK (marks_per_correct > 0),
    negative_marks_per_wrong NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (negative_marks_per_wrong >= 0),
    negative_marking_enabled BOOLEAN NOT NULL DEFAULT false,
    show_answers_after_submission BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'mcq',
    marks NUMERIC(6,2) DEFAULT 1.00,
    explanation TEXT,
    question_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. OPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_order INTEGER NOT NULL DEFAULT 1,
    is_correct BOOLEAN NOT NULL DEFAULT false
);

-- 5. ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    score NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    wrong_answers INTEGER NOT NULL DEFAULT 0,
    unanswered INTEGER NOT NULL DEFAULT 0,
    positive_marks NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    negative_marks NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    time_taken_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ATTEMPT ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.attempt_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.options(id) ON DELETE SET NULL,
    is_marked_for_review BOOLEAN NOT NULL DEFAULT false,
    is_correct BOOLEAN,
    marks_obtained NUMERIC(6,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_tests_status ON public.tests(status);
CREATE INDEX IF NOT EXISTS idx_questions_test ON public.questions(test_id, question_order);
CREATE INDEX IF NOT EXISTS idx_options_question ON public.options(question_id, option_order);
CREATE INDEX IF NOT EXISTS idx_attempts_user_test ON public.attempts(user_id, test_id);

-- ----------------------------------------------------------------------------
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        'student'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- SECURITY HELPER & ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

-- Profiles: Users view own/admin all. Students cannot self-promote.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin())
WITH CHECK (public.is_admin() OR (auth.uid() = id AND role = 'student'));

-- Tests: Students view published, Admin manages all
DROP POLICY IF EXISTS "tests_select" ON public.tests;
CREATE POLICY "tests_select" ON public.tests FOR SELECT USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "tests_admin_all" ON public.tests;
CREATE POLICY "tests_admin_all" ON public.tests FOR ALL USING (public.is_admin());

-- Questions: Students view questions for published tests, Admin manages all
DROP POLICY IF EXISTS "questions_select" ON public.questions;
CREATE POLICY "questions_select" ON public.questions FOR SELECT
USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.tests WHERE id = questions.test_id AND status = 'published'));

DROP POLICY IF EXISTS "questions_admin_all" ON public.questions;
CREATE POLICY "questions_admin_all" ON public.questions FOR ALL USING (public.is_admin());

-- Options: Students view options for published tests, Admin manages all
DROP POLICY IF EXISTS "options_select" ON public.options;
CREATE POLICY "options_select" ON public.options FOR SELECT
USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.questions q JOIN public.tests t ON t.id = q.test_id
    WHERE q.id = options.question_id AND t.status = 'published'
));

DROP POLICY IF EXISTS "options_admin_all" ON public.options;
CREATE POLICY "options_admin_all" ON public.options FOR ALL USING (public.is_admin());

-- Attempts: Students manage own attempts, Admin views all
DROP POLICY IF EXISTS "attempts_select" ON public.attempts;
CREATE POLICY "attempts_select" ON public.attempts FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "attempts_insert" ON public.attempts;
CREATE POLICY "attempts_insert" ON public.attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attempts_update" ON public.attempts;
CREATE POLICY "attempts_update" ON public.attempts FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- Attempt Answers: Students manage own answers, Admin views all
DROP POLICY IF EXISTS "answers_select" ON public.attempt_answers;
CREATE POLICY "answers_select" ON public.attempt_answers FOR SELECT
USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.attempts WHERE id = attempt_answers.attempt_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "answers_insert" ON public.attempt_answers;
CREATE POLICY "answers_insert" ON public.attempt_answers FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.attempts WHERE id = attempt_answers.attempt_id AND user_id = auth.uid() AND status = 'in_progress'));

DROP POLICY IF EXISTS "answers_update" ON public.attempt_answers;
CREATE POLICY "answers_update" ON public.attempt_answers FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.attempts WHERE id = attempt_answers.attempt_id AND user_id = auth.uid() AND status = 'in_progress'));

-- ----------------------------------------------------------------------------
-- ANTI-CHEATING RPC: STRIP CORRECT ANSWERS DURING TEST TAKING
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_test_questions_for_student(p_test_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', q.id,
                'question_text', q.question_text,
                'question_type', q.question_type,
                'marks', q.marks,
                'question_order', q.question_order,
                'options', (
                    SELECT jsonb_agg(
                        jsonb_build_object('id', o.id, 'option_text', o.option_text, 'option_order', o.option_order)
                        ORDER BY o.option_order ASC
                    )
                    FROM public.options o WHERE o.question_id = q.id
                )
            ) ORDER BY q.question_order ASC
        ), '[]'::jsonb)
        FROM public.questions q WHERE q.test_id = p_test_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- SERVER-SIDE TAMPER-PROOF SCORING RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_test_attempt(
    p_attempt_id UUID,
    p_answers JSONB,
    p_time_taken INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_attempt RECORD;
    v_test RECORD;
    v_item JSONB;
    v_question RECORD;
    v_question_id UUID;
    v_selected_option_id UUID;
    v_is_marked_review BOOLEAN;
    v_correct_option_id UUID;
    v_total_questions INTEGER := 0;
    v_correct_count INTEGER := 0;
    v_wrong_count INTEGER := 0;
    v_unanswered_count INTEGER := 0;
    v_positive_marks NUMERIC(6,2) := 0.00;
    v_negative_marks NUMERIC(6,2) := 0.00;
    v_final_score NUMERIC(6,2) := 0.00;
    v_max_marks NUMERIC(6,2) := 0.00;
    v_percentage NUMERIC(5,2) := 0.00;
    v_is_passed BOOLEAN := false;
    v_is_correct BOOLEAN;
    v_mark_obtained NUMERIC(6,2);
BEGIN
    SELECT * INTO v_attempt FROM public.attempts WHERE id = p_attempt_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
    IF v_attempt.user_id <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    IF v_attempt.status IN ('completed', 'expired') THEN
        RETURN jsonb_build_object(
            'success', true,
            'score', v_attempt.score,
            'percentage', v_attempt.percentage,
            'status', v_attempt.status
        );
    END IF;

    SELECT * INTO v_test FROM public.tests WHERE id = v_attempt.test_id;

    FOR v_question IN (SELECT id FROM public.questions WHERE test_id = v_test.id ORDER BY question_order ASC) LOOP
        v_total_questions := v_total_questions + 1;
        v_question_id := v_question.id;
        v_selected_option_id := NULL;
        v_is_marked_review := false;
        v_is_correct := false;
        v_mark_obtained := 0.00;

        FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
            IF (v_item->>'question_id')::uuid = v_question_id THEN
                IF v_item->>'selected_option_id' IS NOT NULL AND v_item->>'selected_option_id' <> '' THEN
                    v_selected_option_id := (v_item->>'selected_option_id')::uuid;
                END IF;
                v_is_marked_review := COALESCE((v_item->>'is_marked_for_review')::boolean, false);
                EXIT;
            END IF;
        END LOOP;

        SELECT id INTO v_correct_option_id FROM public.options WHERE question_id = v_question_id AND is_correct = true LIMIT 1;

        IF v_selected_option_id IS NULL THEN
            v_unanswered_count := v_unanswered_count + 1;
            v_is_correct := NULL;
            v_mark_obtained := 0.00;
        ELSIF v_correct_option_id IS NOT NULL AND v_selected_option_id = v_correct_option_id THEN
            v_correct_count := v_correct_count + 1;
            v_is_correct := true;
            v_mark_obtained := v_test.marks_per_correct;
            v_positive_marks := v_positive_marks + v_test.marks_per_correct;
        ELSE
            v_wrong_count := v_wrong_count + 1;
            v_is_correct := false;
            IF v_test.negative_marking_enabled THEN
                v_mark_obtained := -v_test.negative_marks_per_wrong;
                v_negative_marks := v_negative_marks + v_test.negative_marks_per_wrong;
            ELSE
                v_mark_obtained := 0.00;
            END IF;
        END IF;

        INSERT INTO public.attempt_answers (
            attempt_id, question_id, selected_option_id, is_marked_for_review, is_correct, marks_obtained, updated_at
        ) VALUES (
            p_attempt_id, v_question_id, v_selected_option_id, v_is_marked_review, v_is_correct, v_mark_obtained, now()
        )
        ON CONFLICT (attempt_id, question_id) DO UPDATE SET
            selected_option_id = EXCLUDED.selected_option_id,
            is_marked_for_review = EXCLUDED.is_marked_for_review,
            is_correct = EXCLUDED.is_correct,
            marks_obtained = EXCLUDED.marks_obtained,
            updated_at = now();
    END LOOP;

    v_max_marks := v_total_questions * v_test.marks_per_correct;
    v_final_score := GREATEST(0.00, v_positive_marks - v_negative_marks);

    IF v_max_marks > 0 THEN
        v_percentage := ROUND(((v_final_score / v_max_marks) * 100.00), 2);
    ELSE
        v_percentage := 0.00;
    END IF;

    v_is_passed := v_percentage >= v_test.passing_percentage;

    UPDATE public.attempts SET
        submitted_at = now(),
        score = v_final_score,
        percentage = v_percentage,
        correct_answers = v_correct_count,
        wrong_answers = v_wrong_count,
        unanswered = v_unanswered_count,
        positive_marks = v_positive_marks,
        negative_marks = v_negative_marks,
        time_taken_seconds = p_time_taken,
        status = 'completed'
    WHERE id = p_attempt_id;

    RETURN jsonb_build_object(
        'success', true,
        'attempt_id', p_attempt_id,
        'total_questions', v_total_questions,
        'correct_answers', v_correct_count,
        'wrong_answers', v_wrong_count,
        'unanswered', v_unanswered_count,
        'max_marks', v_max_marks,
        'positive_marks', v_positive_marks,
        'negative_marks', v_negative_marks,
        'final_score', v_final_score,
        'percentage', v_percentage,
        'passing_percentage', v_test.passing_percentage,
        'is_passed', v_is_passed,
        'time_taken_seconds', p_time_taken,
        'status', 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
