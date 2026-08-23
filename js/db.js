/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - DATABASE & SUPABASE DATA ACCESS LAYER
 * ============================================================================
 */

import { getSupabase } from './config.js';

export const db = {
  // --------------------------------------------------------------------------
  // PROFILES
  // --------------------------------------------------------------------------
  async getProfile(userId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Error fetching profile:', error);
      return null;
    }
    return data;
  },

  async ensureProfile(user) {
    if (!user) return null;
    const supabase = getSupabase();
    let profile = await this.getProfile(user.id);

    if (!profile) {
      // Create default student profile if trigger hasn't run
      const newProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        email: user.email,
        role: 'student',
      };
      const { data, error } = await supabase
        .from('profiles')
        .upsert(newProfile)
        .select()
        .single();

      if (!error) profile = data;
    }
    return profile;
  },

  // --------------------------------------------------------------------------
  // TESTS (CRUD & PUBLISH)
  // --------------------------------------------------------------------------
  async getTests(isAdmin = false) {
    const supabase = getSupabase();
    let query = supabase.from('tests').select('*, questions(count)').order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((t) => ({
      ...t,
      question_count: t.questions?.[0]?.count || 0,
    }));
  },

  async getTestById(testId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (error) throw error;
    return data;
  },

  async createTest(testData) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('tests')
      .insert([testData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTest(testId, testData) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('tests')
      .update({ ...testData, updated_at: new Date().toISOString() })
      .eq('id', testId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTest(testId) {
    const supabase = getSupabase();
    const { error } = await supabase.from('tests').delete().eq('id', testId);
    if (error) throw error;
    return true;
  },

  async toggleTestPublish(testId, currentStatus) {
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    return this.updateTest(testId, { status: nextStatus });
  },

  // --------------------------------------------------------------------------
  // QUESTIONS & OPTIONS MANAGEMENT
  // --------------------------------------------------------------------------
  async getQuestionsForTest(testId, isAdmin = false) {
    const supabase = getSupabase();

    // If student, try the secure RPC first
    if (!isAdmin) {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_test_questions_for_student', {
          p_test_id: testId,
        });
        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          return rpcData;
        }
      } catch (err) {
        console.warn('RPC get_test_questions_for_student not available, falling back to query');
      }
    }

    // Direct query
    const { data, error } = await supabase
      .from('questions')
      .select(`
        id,
        test_id,
        question_text,
        question_type,
        marks,
        explanation,
        question_order,
        options (
          id,
          option_text,
          option_order,
          is_correct
        )
      `)
      .eq('test_id', testId)
      .order('question_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((q) => {
      const sortedOptions = (q.options || []).sort((a, b) => a.option_order - b.option_order);
      if (!isAdmin) {
        // Strip is_correct and explanation during test taking for students
        return {
          ...q,
          explanation: null,
          options: sortedOptions.map((o) => ({
            id: o.id,
            option_text: o.option_text,
            option_order: o.option_order,
          })),
        };
      }
      return {
        ...q,
        options: sortedOptions,
      };
    });
  },

  async saveQuestionWithOptions({ testId, questionId, questionText, explanation, marks, questionOrder, options }) {
    const supabase = getSupabase();

    let targetQuestionId = questionId;

    if (targetQuestionId) {
      // Update existing question
      const { error: qError } = await supabase
        .from('questions')
        .update({
          question_text: questionText,
          explanation: explanation,
          marks: marks,
          question_order: questionOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetQuestionId);

      if (qError) throw qError;

      // Delete existing options and insert fresh ones
      await supabase.from('options').delete().eq('question_id', targetQuestionId);
    } else {
      // Insert new question
      const { data: newQ, error: qError } = await supabase
        .from('questions')
        .insert([
          {
            test_id: testId,
            question_text: questionText,
            explanation: explanation,
            marks: marks,
            question_order: questionOrder,
          },
        ])
        .select()
        .single();

      if (qError) throw qError;
      targetQuestionId = newQ.id;
    }

    // Insert options
    const optionsToInsert = options.map((opt, idx) => ({
      question_id: targetQuestionId,
      option_text: opt.option_text,
      option_order: idx + 1,
      is_correct: !!opt.is_correct,
    }));

    const { error: optError } = await supabase.from('options').insert(optionsToInsert);
    if (optError) throw optError;

    return targetQuestionId;
  },

  async deleteQuestion(questionId) {
    const supabase = getSupabase();
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) throw error;
    return true;
  },

  async duplicateQuestion(questionId) {
    const supabase = getSupabase();
    // Fetch original
    const { data: origQ, error: fetchErr } = await supabase
      .from('questions')
      .select('*, options(*)')
      .eq('id', questionId)
      .single();

    if (fetchErr) throw fetchErr;

    // Get max question order
    const { data: allQ } = await supabase
      .from('questions')
      .select('question_order')
      .eq('test_id', origQ.test_id)
      .order('question_order', { ascending: false })
      .limit(1);

    const nextOrder = (allQ?.[0]?.question_order || 0) + 1;

    // Insert copy
    const { data: newQ, error: insErr } = await supabase
      .from('questions')
      .insert([
        {
          test_id: origQ.test_id,
          question_text: `${origQ.question_text} (Copy)`,
          explanation: origQ.explanation,
          marks: origQ.marks,
          question_order: nextOrder,
        },
      ])
      .select()
      .single();

    if (insErr) throw insErr;

    if (origQ.options && origQ.options.length > 0) {
      const copyOptions = origQ.options.map((opt) => ({
        question_id: newQ.id,
        option_text: opt.option_text,
        option_order: opt.option_order,
        is_correct: opt.is_correct,
      }));
      await supabase.from('options').insert(copyOptions);
    }

    return newQ;
  },

  async reorderQuestions(orderedQuestions) {
    const supabase = getSupabase();
    const updates = orderedQuestions.map((q, index) =>
      supabase.from('questions').update({ question_order: index + 1 }).eq('id', q.id)
    );
    await Promise.all(updates);
  },

  // --------------------------------------------------------------------------
  // ATTEMPTS & TEST TAKING
  // --------------------------------------------------------------------------
  async startOrResumeAttempt(testId, userId) {
    const supabase = getSupabase();

    // Check if there is an in-progress attempt for this test
    const { data: existing, error: findErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1);

    if (!findErr && existing && existing.length > 0) {
      const activeAttempt = existing[0];
      // Fetch already saved answers
      const { data: answers } = await supabase
        .from('attempt_answers')
        .select('*')
        .eq('attempt_id', activeAttempt.id);

      const answersMap = {};
      (answers || []).forEach((ans) => {
        answersMap[ans.question_id] = {
          selected_option_id: ans.selected_option_id,
          is_marked_for_review: ans.is_marked_for_review,
        };
      });

      return { attempt: activeAttempt, answersMap, isResume: true };
    }

    // Create new attempt
    const { data: newAttempt, error: createErr } = await supabase
      .from('attempts')
      .insert([
        {
          test_id: testId,
          user_id: userId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (createErr) throw createErr;
    return { attempt: newAttempt, answersMap: {}, isResume: false };
  },

  async saveAttemptAnswer(attemptId, questionId, selectedOptionId, isMarkedForReview = false) {
    const supabase = getSupabase();
    const { error } = await supabase.from('attempt_answers').upsert(
      [
        {
          attempt_id: attemptId,
          question_id: questionId,
          selected_option_id: selectedOptionId || null,
          is_marked_for_review: isMarkedForReview,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'attempt_id,question_id' }
    );

    if (error) {
      console.warn('Failed to autosave answer:', error);
    }
  },

  async submitAttempt(attemptId, answersPayload, timeTakenSeconds) {
    const supabase = getSupabase();

    // 1. Try secure Server-Side RPC first
    try {
      const { data, error } = await supabase.rpc('submit_test_attempt', {
        p_attempt_id: attemptId,
        p_answers: answersPayload,
        p_time_taken: timeTakenSeconds,
      });

      if (!error && data && data.success) {
        return data;
      }
      if (error) {
        console.warn('RPC submit_test_attempt error, falling back to client evaluation:', error);
      }
    } catch (e) {
      console.warn('RPC not available, falling back to client evaluation:', e);
    }

    // 2. Client-Side Fallback Scoring (if SQL script was not run yet)
    return this.fallbackSubmitAttempt(attemptId, answersPayload, timeTakenSeconds);
  },

  async fallbackSubmitAttempt(attemptId, answersPayload, timeTakenSeconds) {
    const supabase = getSupabase();

    // Fetch attempt & test
    const { data: attempt } = await supabase.from('attempts').select('*').eq('id', attemptId).single();
    const { data: test } = await supabase.from('tests').select('*').eq('id', attempt.test_id).single();
    const { data: questions } = await supabase
      .from('questions')
      .select('id, options(id, is_correct)')
      .eq('test_id', test.id);

    const marksPerCorrect = Number(test.marks_per_correct) || 1;
    const negMarksPerWrong = Number(test.negative_marks_per_wrong) || 0;
    const isNegEnabled = !!test.negative_marking_enabled;

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let positiveMarks = 0;
    let negativeMarks = 0;

    const answersMap = new Map();
    answersPayload.forEach((ans) => answersMap.set(ans.question_id, ans));

    for (const q of questions) {
      const userAns = answersMap.get(q.id);
      const selectedOptId = userAns?.selected_option_id;
      const isReview = !!userAns?.is_marked_for_review;
      const correctOpt = q.options?.find((o) => o.is_correct);

      let isCorrect = null;
      let marksObtained = 0;

      if (!selectedOptId) {
        unansweredCount++;
      } else if (correctOpt && selectedOptId === correctOpt.id) {
        correctCount++;
        isCorrect = true;
        marksObtained = marksPerCorrect;
        positiveMarks += marksPerCorrect;
      } else {
        wrongCount++;
        isCorrect = false;
        if (isNegEnabled) {
          marksObtained = -negMarksPerWrong;
          negativeMarks += negMarksPerWrong;
        }
      }

      // Upsert answer
      await supabase.from('attempt_answers').upsert(
        [
          {
            attempt_id: attemptId,
            question_id: q.id,
            selected_option_id: selectedOptId || null,
            is_marked_for_review: isReview,
            is_correct: isCorrect,
            marks_obtained: marksObtained,
          },
        ],
        { onConflict: 'attempt_id,question_id' }
      );
    }

    const totalQuestions = questions.length;
    const maxMarks = totalQuestions * marksPerCorrect;
    const finalScore = Math.max(0, positiveMarks - negativeMarks);
    const percentage = maxMarks > 0 ? Number(((finalScore / maxMarks) * 100).toFixed(2)) : 0;
    const isPassed = percentage >= Number(test.passing_percentage);

    await supabase
      .from('attempts')
      .update({
        submitted_at: new Date().toISOString(),
        score: finalScore,
        percentage: percentage,
        correct_answers: correctCount,
        wrong_answers: wrongCount,
        unanswered: unansweredCount,
        positive_marks: positiveMarks,
        negative_marks: negativeMarks,
        time_taken_seconds: timeTakenSeconds,
        status: 'completed',
      })
      .eq('id', attemptId);

    return {
      success: true,
      attempt_id: attemptId,
      total_questions: totalQuestions,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      unanswered: unansweredCount,
      max_marks: maxMarks,
      positive_marks: positiveMarks,
      negative_marks: negativeMarks,
      final_score: finalScore,
      percentage: percentage,
      passing_percentage: test.passing_percentage,
      is_passed: isPassed,
      time_taken_seconds: timeTakenSeconds,
      status: 'completed',
    };
  },

  // --------------------------------------------------------------------------
  // RESULTS & ATTEMPT REVIEW
  // --------------------------------------------------------------------------
  async getAttemptResult(attemptId) {
    const supabase = getSupabase();
    const { data: attempt, error: attErr } = await supabase
      .from('attempts')
      .select(`
        *,
        tests (*),
        profiles:user_id (id, full_name, email)
      `)
      .eq('id', attemptId)
      .single();

    if (attErr) throw attErr;

    // Fetch questions, options, and attempt_answers
    const { data: questions } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        explanation,
        marks,
        question_order,
        options (
          id,
          option_text,
          option_order,
          is_correct
        )
      `)
      .eq('test_id', attempt.test_id)
      .order('question_order', { ascending: true });

    const { data: answers } = await supabase
      .from('attempt_answers')
      .select('*')
      .eq('attempt_id', attemptId);

    const answersMap = {};
    (answers || []).forEach((a) => {
      answersMap[a.question_id] = a;
    });

    return {
      attempt,
      test: attempt.tests,
      student: attempt.profiles,
      questions: questions || [],
      answersMap,
    };
  },

  async getUserAttempts(userId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('attempts')
      .select(`
        *,
        tests (
          id,
          title,
          category,
          duration_minutes,
          passing_percentage,
          marks_per_correct,
          show_answers_after_submission
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // --------------------------------------------------------------------------
  // ADMIN ANALYTICS & DIRECTORY
  // --------------------------------------------------------------------------
  async getAdminStats() {
    const supabase = getSupabase();

    const [testsRes, pubTestsRes, profilesRes, attemptsRes] = await Promise.all([
      supabase.from('tests').select('id', { count: 'exact', head: true }),
      supabase.from('tests').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('attempts').select('score, percentage, status').eq('status', 'completed'),
    ]);

    const totalTests = testsRes.count || 0;
    const publishedTests = pubTestsRes.count || 0;
    const totalStudents = profilesRes.count || 0;
    const completedAttempts = attemptsRes.data || [];
    const totalAttempts = completedAttempts.length;

    let avgPercentage = 0;
    if (totalAttempts > 0) {
      const sum = completedAttempts.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0);
      avgPercentage = (sum / totalAttempts).toFixed(1);
    }

    return {
      totalTests,
      publishedTests,
      totalStudents,
      totalAttempts,
      avgPercentage,
    };
  },

  async getAllAttempts({ testId = '', status = '', search = '' } = {}) {
    const supabase = getSupabase();
    let query = supabase
      .from('attempts')
      .select(`
        *,
        tests (id, title, category, passing_percentage, marks_per_correct),
        profiles:user_id (id, full_name, email)
      `)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false });

    if (testId) {
      query = query.eq('test_id', testId);
    }

    const { data, error } = await query;
    if (error) throw error;

    let results = data || [];

    // Client-side search and status filter for seamless reactivity
    if (status === 'passed') {
      results = results.filter((a) => Number(a.percentage) >= Number(a.tests?.passing_percentage || 40));
    } else if (status === 'failed') {
      results = results.filter((a) => Number(a.percentage) < Number(a.tests?.passing_percentage || 40));
    }

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (a) =>
          a.profiles?.full_name?.toLowerCase().includes(q) ||
          a.profiles?.email?.toLowerCase().includes(q) ||
          a.tests?.title?.toLowerCase().includes(q)
      );
    }

    return results;
  },

  async getAllStudents() {
    const supabase = getSupabase();
    const { data: students, error } = await supabase
      .from('profiles')
      .select(`
        *,
        attempts (
          id,
          score,
          percentage,
          status,
          submitted_at
        )
      `)
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (students || []).map((s) => {
      const completed = (s.attempts || []).filter((a) => a.status === 'completed');
      const attemptsCount = completed.length;
      let avgScore = 0;
      if (attemptsCount > 0) {
        const sum = completed.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0);
        avgScore = (sum / attemptsCount).toFixed(1);
      }
      return {
        ...s,
        attemptsCount,
        avgScore,
        lastActive: completed[0]?.submitted_at || s.created_at,
      };
    });
  },
};
