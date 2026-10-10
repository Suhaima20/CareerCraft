import { useEffect, useMemo, useState } from 'react';

import {
  HelpCircle,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  Video,
  ToggleLeft,
  ToggleRight,
  Briefcase,
  GraduationCap,
  BookOpen,
  ChevronDown,
  GitBranch,
} from 'lucide-react';

import { adminAPI } from '@/services/api';

import { useToast } from '@/components/Toast';

import {
  FullPageSpinner,
  ButtonSpinner,
} from '@/components/Spinner';

import {
  ErrorState,
  EmptyState,
} from '@/components/States';

import Modal from '@/components/Modal';

export default function QuizManagement() {
  const toast = useToast();

  // ============================================================
  // DATA
  // ============================================================

  const [careers, setCareers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [chapters, setChapters] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================
  // SELECTION
  // ============================================================

  const [selectedCareer, setSelectedCareer] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');

  // ============================================================
  // QUIZ
  // ============================================================

  const [quiz, setQuiz] = useState(null);

  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([]);

  const [passScore, setPassScore] = useState(70);
  const [requiredWatchPercentage, setRequiredWatchPercentage] =
    useState(98);

  const [quizActive, setQuizActive] = useState(true);

  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // ============================================================
  // QUESTION MODAL
  // ============================================================

  const [showQuestionModal, setShowQuestionModal] =
    useState(false);

  const [editingQuestionIndex, setEditingQuestionIndex] =
    useState(null);

  const [questionForm, setQuestionForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctOption: 0,
    explanation: '',
  });

  // ============================================================
  // LOAD CAREERS + CHAPTERS
  // ============================================================

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const careerRes = await adminAPI.listCareers({
        q: '',
      });

      setCareers(
        careerRes.data?.careers || []
      );

      const chapterRes = await adminAPI.listChapters({
        q: '',
      });

      setChapters(
        chapterRes.data?.chapters || []
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to load quiz management data'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // ============================================================
  // LOAD SKILLS FOR CAREER
  // ============================================================

  useEffect(() => {
    const loadSkills = async () => {
      if (!selectedCareer) {
        setSkills([]);
        setSelectedSkill('');
        setSelectedChapter('');
        setQuiz(null);
        return;
      }

      try {
        const res =
          await adminAPI.getCareerSkills(
            selectedCareer
          );

        if (Array.isArray(res.data?.skills)) {
          setSkills(res.data.skills);
        } else {
          const allSkillsRes =
            await adminAPI.listSkills({
              limit: 1000,
            });

          const allSkills =
            allSkillsRes.data?.skills || [];

          const skillIds =
            res.data?.skillIds || [];

          setSkills(
            allSkills.filter((skill) =>
              skillIds.includes(skill._id)
            )
          );
        }

        setSelectedSkill('');
        setSelectedChapter('');
        setQuiz(null);
      } catch (err) {
        toast.error(
          err.response?.data?.error ||
            'Failed to load career skills'
        );

        setSkills([]);
      }
    };

    loadSkills();
  }, [selectedCareer]);

  // ============================================================
  // LOAD CHAPTERS FOR SKILL
  // ============================================================

  useEffect(() => {
    const loadSkillChapters = async () => {
      if (!selectedSkill) {
        setSelectedChapter('');
        setChapters([]);
        setQuiz(null);
        return;
      }

      try {
        const res =
          await adminAPI.getSkillChapters(
            selectedSkill
          );

        if (Array.isArray(res.data?.chapters)) {
          setChapters(
            res.data.chapters
          );
        } else {
          const chapterIds =
            res.data?.chapterIds || [];

          const chapterRes =
            await adminAPI.listChapters({
              limit: 1000,
            });

          const allChapters =
            chapterRes.data?.chapters || [];

          setChapters(
            allChapters.filter((chapter) =>
              chapterIds.includes(chapter._id)
            )
          );
        }

        setSelectedChapter('');
        setQuiz(null);
      } catch (err) {
        toast.error(
          err.response?.data?.error ||
            'Failed to load skill chapters'
        );

        setChapters([]);
      }
    };

    loadSkillChapters();
  }, [selectedSkill]);

  // ============================================================
  // CURRENT OBJECTS
  // ============================================================

  const currentCareer = useMemo(
    () =>
      careers.find(
        (career) =>
          career._id === selectedCareer
      ),
    [careers, selectedCareer]
  );

  const currentSkill = useMemo(
    () =>
      skills.find(
        (skill) =>
          skill._id === selectedSkill
      ),
    [skills, selectedSkill]
  );

  const currentChapter = useMemo(
    () =>
      chapters.find(
        (chapter) =>
          chapter._id === selectedChapter
      ),
    [chapters, selectedChapter]
  );

  // ============================================================
  // RESET QUIZ
  // ============================================================

  const resetQuiz = () => {
    setQuiz(null);

    setQuizTitle(
      `${currentChapter?.title || 'Chapter'} Quiz`
    );

    setQuizQuestions([]);

    setPassScore(70);

    setRequiredWatchPercentage(98);

    setQuizActive(true);
  };

  // ============================================================
  // LOAD QUIZ
  // ============================================================

  const loadQuiz = async (
    chapterId = selectedChapter
  ) => {
    if (!chapterId) {
      setQuiz(null);
      return;
    }

    setLoadingQuiz(true);

    try {
      const res =
        await adminAPI.getChapterQuiz(
          chapterId
        );

      const loadedQuiz =
        res.data?.quiz || null;

      if (!loadedQuiz) {
        resetQuiz();
        return;
      }

      setQuiz(loadedQuiz);

      setQuizTitle(
        loadedQuiz.title ||
          `${currentChapter?.title || 'Chapter'} Quiz`
      );

      setQuizQuestions(
        Array.isArray(loadedQuiz.questions)
          ? loadedQuiz.questions
          : []
      );

      setPassScore(
        loadedQuiz.passScore !== undefined
          ? Number(loadedQuiz.passScore)
          : 70
      );

      setRequiredWatchPercentage(
        loadedQuiz.requiredWatchPercentage !==
          undefined
          ? Number(
              loadedQuiz.requiredWatchPercentage
            )
          : 98
      );

      setQuizActive(
        loadedQuiz.active !== false
      );
    } catch (err) {
      if (err.response?.status === 404) {
        resetQuiz();
      } else {
        toast.error(
          err.response?.data?.error ||
            'Failed to load quiz'
        );
      }
    } finally {
      setLoadingQuiz(false);
    }
  };

  useEffect(() => {
    if (selectedChapter) {
      loadQuiz(selectedChapter);
    }
  }, [selectedChapter]);

  // ============================================================
  // CREATE NEW QUIZ
  // ============================================================

  const createNewQuiz = () => {
    if (!selectedChapter) {
      toast.error(
        'Select a chapter first'
      );
      return;
    }

    resetQuiz();

    toast.success(
      'New quiz ready to configure'
    );
  };

  // ============================================================
  // QUESTION FORM
  // ============================================================

  const resetQuestionForm = () => {
    setQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctOption: 0,
      explanation: '',
    });

    setEditingQuestionIndex(null);
  };

  const openAddQuestion = () => {
    resetQuestionForm();
    setShowQuestionModal(true);
  };

  const openEditQuestion = (index) => {
    const question =
      quizQuestions[index];

    if (!question) {
      return;
    }

    setEditingQuestionIndex(index);

    const options = Array.isArray(
      question.options
    )
      ? [...question.options]
      : ['', '', '', ''];

    while (options.length < 4) {
      options.push('');
    }

    setQuestionForm({
      question:
        question.question || '',

      options: options.slice(0, 4),

      correctOption:
        Number(
          question.correctOption ?? 0
        ),

      explanation:
        question.explanation || '',
    });

    setShowQuestionModal(true);
  };

  // ============================================================
  // SAVE QUESTION
  // ============================================================

  const saveQuestion = () => {
    const question =
      questionForm.question.trim();

    if (!question) {
      toast.error(
        'Question text is required'
      );
      return;
    }

    if (
      questionForm.options.length !== 4
    ) {
      toast.error(
        'Exactly 4 options are required'
      );
      return;
    }

    if (
      questionForm.options.some(
        (option) =>
          !option.trim()
      )
    ) {
      toast.error(
        'All 4 options are required'
      );
      return;
    }

    const correctOption =
      Number(
        questionForm.correctOption
      );

    if (
      correctOption < 0 ||
      correctOption > 3
    ) {
      toast.error(
        'Select a valid correct answer'
      );
      return;
    }

    const existingQuestion =
      editingQuestionIndex !== null
        ? quizQuestions[
            editingQuestionIndex
          ]
        : null;

    const newQuestion = {
      id:
        existingQuestion?.id ||
        existingQuestion?._id ||
        Date.now().toString(),

      question,

      options:
        questionForm.options.map(
          (option) =>
            option.trim()
        ),

      correctOption,

      explanation:
        questionForm.explanation.trim(),
    };

    if (
      editingQuestionIndex !== null
    ) {
      const updated = [
        ...quizQuestions,
      ];

      updated[
        editingQuestionIndex
      ] = newQuestion;

      setQuizQuestions(updated);
    } else {
      setQuizQuestions([
        ...quizQuestions,
        newQuestion,
      ]);
    }

    setShowQuestionModal(false);

    resetQuestionForm();

    toast.success(
      editingQuestionIndex !== null
        ? 'Question updated'
        : 'Question added'
    );
  };

  // ============================================================
  // DELETE QUESTION
  // ============================================================

  const deleteQuestion = (index) => {
    if (
      !window.confirm(
        'Delete this quiz question?'
      )
    ) {
      return;
    }

    setQuizQuestions(
      quizQuestions.filter(
        (_, i) => i !== index
      )
    );

    toast.success(
      'Question removed'
    );
  };

  // ============================================================
  // SAVE QUIZ
  // ============================================================

  const saveQuiz = async () => {
    if (!selectedCareer) {
      toast.error(
        'Select a career'
      );
      return;
    }

    if (!selectedSkill) {
      toast.error(
        'Select a skill'
      );
      return;
    }

    if (!selectedChapter) {
      toast.error(
        'Select a chapter'
      );
      return;
    }

    if (!quizTitle.trim()) {
      toast.error(
        'Quiz title is required'
      );
      return;
    }

    if (
      Number(passScore) < 70 ||
      Number(passScore) > 100
    ) {
      toast.error(
        'Passing score must be between 70% and 100%'
      );
      return;
    }

    if (
      Number(requiredWatchPercentage) < 98 ||
      Number(requiredWatchPercentage) > 100
    ) {
      toast.error(
        'Required video watch percentage must be between 98% and 100%'
      );
      return;
    }

    if (
      quizQuestions.length === 0
    ) {
      toast.error(
        'Add at least one question'
      );
      return;
    }

    setSavingQuiz(true);

    try {
      await adminAPI.updateChapterQuiz(
        selectedChapter,
        {
          title:
            quizTitle.trim(),

          questions:
            quizQuestions,

          passScore:
            Number(passScore),

          requiredWatchPercentage:
            Number(
              requiredWatchPercentage
            ),

          active:
            quizActive,

          careerId:
            selectedCareer,

          skillId:
            selectedSkill,

          chapterId:
            selectedChapter,
        }
      );

      toast.success(
        'Quiz saved successfully'
      );

      await loadQuiz(
        selectedChapter
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Failed to save quiz'
      );
    } finally {
      setSavingQuiz(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <FullPageSpinner
        label="Loading quiz management..."
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={loadInitialData}
      />
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="animate-fade-in">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between mb-6">

        <div>

          <div className="flex items-center gap-2">

            <HelpCircle
              size={24}
              style={{
                color:
                  'var(--primary)',
              }}
            />

            <h1
              className="text-2xl font-heading font-bold"
              style={{
                color:
                  'var(--text)',
              }}
            >
              Quiz Management
            </h1>

          </div>

          <p className="text-sm text-muted mt-1">
            Create and manage quizzes linked
            to careers, skills and chapters.
          </p>

        </div>

      </div>

      {/* ======================================================
          LEARNING PATH
      ====================================================== */}

      <div className="card p-5 mb-6">

        <div className="flex items-center gap-3 mb-4">

          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background:
                'color-mix(in srgb, var(--primary) 10%, transparent)',
              color:
                'var(--primary)',
            }}
          >
            <GitBranch size={18} />
          </div>

          <div>

            <h2
              className="text-sm font-semibold"
              style={{
                color:
                  'var(--text)',
              }}
            >
              Quiz Learning Path
            </h2>

            <p className="text-xs text-muted">
              Select the exact Career →
              Skill → Chapter this quiz belongs to.
            </p>

          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* CAREER */}

          <div>

            <label className="label flex items-center gap-1.5">
              <Briefcase size={13} />
              Career
            </label>

            <div className="relative">

              <select
                className="input appearance-none pr-9"
                value={selectedCareer}
                onChange={(e) => {
                  setSelectedCareer(
                    e.target.value
                  );
                  setSelectedSkill('');
                  setSelectedChapter('');
                  setQuiz(null);
                }}
              >

                <option value="">
                  Select Career
                </option>

                {careers.map(
                  (career) => (
                    <option
                      key={
                        career._id
                      }
                      value={
                        career._id
                      }
                    >
                      {career.name ||
                        career.title}
                    </option>
                  )
                )}

              </select>

              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              />

            </div>

          </div>

          {/* SKILL */}

          <div>

            <label className="label flex items-center gap-1.5">
              <GraduationCap size={13} />
              Skill
            </label>

            <div className="relative">

              <select
                className="input appearance-none pr-9"
                value={selectedSkill}
                disabled={!selectedCareer}
                onChange={(e) => {
                  setSelectedSkill(
                    e.target.value
                  );
                  setSelectedChapter('');
                  setQuiz(null);
                }}
              >

                <option value="">
                  {!selectedCareer
                    ? 'Select career first'
                    : 'Select Skill'}
                </option>

                {skills.map(
                  (skill) => (
                    <option
                      key={
                        skill._id
                      }
                      value={
                        skill._id
                      }
                    >
                      {skill.name ||
                        skill.title}
                    </option>
                  )
                )}

              </select>

              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              />

            </div>

          </div>

          {/* CHAPTER */}

          <div>

            <label className="label flex items-center gap-1.5">
              <BookOpen size={13} />
              Chapter
            </label>

            <div className="relative">

              <select
                className="input appearance-none pr-9"
                value={selectedChapter}
                disabled={!selectedSkill}
                onChange={(e) => {
                  setSelectedChapter(
                    e.target.value
                  );
                }}
              >

                <option value="">
                  {!selectedSkill
                    ? 'Select skill first'
                    : 'Select Chapter'}
                </option>

                {chapters.map(
                  (chapter) => (
                    <option
                      key={
                        chapter._id
                      }
                      value={
                        chapter._id
                      }
                    >
                      {chapter.title}
                    </option>
                  )
                )}

              </select>

              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              />

            </div>

          </div>

        </div>

        {/* PATH */}

        {(currentCareer ||
          currentSkill ||
          currentChapter) && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-themed">

            <p className="text-xs text-muted mb-1">
              Quiz relationship
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">

              <span className="text-primary">
                {currentCareer?.name ||
                  currentCareer?.title ||
                  'Career'}
              </span>

              <span className="text-muted">
                →
              </span>

              <span className="text-primary">
                {currentSkill?.name ||
                  currentSkill?.title ||
                  'Skill'}
              </span>

              <span className="text-muted">
                →
              </span>

              <span
                style={{
                  color:
                    'var(--text)',
                }}
              >
                {currentChapter?.title ||
                  'Chapter'}
              </span>

            </div>

          </div>
        )}

      </div>

      {/* ======================================================
          NO CHAPTER
      ====================================================== */}

      {!selectedChapter ? (

        <EmptyState
          icon={HelpCircle}
          title="Select a chapter"
          message="Choose a career, skill and chapter above to manage its quiz."
        />

      ) : loadingQuiz ? (

        <div className="card p-10 flex justify-center">
          <ButtonSpinner />
        </div>

      ) : (

        <div className="space-y-6">

          {/* ==================================================
              QUIZ HEADER
          ================================================== */}

          <div className="card p-5">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs text-muted mb-1">
                  Quiz for chapter
                </p>

                <h2
                  className="text-lg font-heading font-bold"
                  style={{
                    color:
                      'var(--text)',
                  }}
                >
                  {currentChapter?.title}
                </h2>

                <p className="text-xs text-muted mt-1">
                  {currentSkill?.name ||
                    currentSkill?.title}
                  {' · '}
                  {currentCareer?.name ||
                    currentCareer?.title}
                </p>

              </div>

              {!quiz && (
                <button
                  onClick={createNewQuiz}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Create Quiz
                </button>
              )}

            </div>

          </div>

          {/* ==================================================
              QUIZ CONFIGURATION
          ================================================== */}

          <div className="card p-5">

            <div className="flex items-center justify-between mb-5">

              <div>

                <h2
                  className="text-base font-semibold"
                  style={{
                    color:
                      'var(--text)',
                  }}
                >
                  Quiz Configuration
                </h2>

                <p className="text-xs text-muted mt-1">
                  Configure how students unlock
                  and complete this chapter quiz.
                </p>

              </div>

              <div className="flex items-center gap-2">

                {quizActive ? (
                  <ToggleRight
                    size={21}
                    className="text-green-600"
                  />
                ) : (
                  <ToggleLeft
                    size={21}
                    className="text-muted"
                  />
                )}

                <span className="text-xs font-medium">
                  {quizActive
                    ? 'Active'
                    : 'Inactive'}
                </span>

              </div>

            </div>

            <div className="space-y-5">

              {/* TITLE */}

              <div>

                <label className="label">
                  Quiz Title
                </label>

                <input
                  className="input"
                  value={quizTitle}
                  onChange={(e) =>
                    setQuizTitle(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Python Fundamentals Quiz"
                />

              </div>

              {/* SETTINGS */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* PASS SCORE */}

                <div className="p-4 rounded-lg border border-themed bg-primary/5">

                  <div className="flex items-start gap-2">

                    <CheckCircle
                      size={18}
                      className="text-primary mt-0.5"
                    />

                    <div>

                      <p className="text-xs font-semibold text-primary">
                        Passing Score
                      </p>

                      <p className="text-xs text-muted mt-1">
                        Minimum score required.
                      </p>

                    </div>

                  </div>

                  <div className="flex items-center gap-1 mt-3">

                    <input
                      type="number"
                      min="70"
                      max="100"
                      className="input w-20 text-center"
                      value={passScore}
                      onChange={(e) =>
                        setPassScore(
                          Number(
                            e.target.value
                          )
                        )
                      }
                    />

                    <span className="text-sm font-bold">
                      %
                    </span>

                  </div>

                </div>

                {/* WATCH */}

                <div className="p-4 rounded-lg border border-themed bg-primary/5">

                  <div className="flex items-start gap-2">

                    <Video
                      size={18}
                      className="text-primary mt-0.5"
                    />

                    <div>

                      <p className="text-xs font-semibold text-primary">
                        Video Watch
                      </p>

                      <p className="text-xs text-muted mt-1">
                        Required before quiz unlocks.
                      </p>

                    </div>

                  </div>

                  <div className="flex items-center gap-1 mt-3">

                    <input
                      type="number"
                      min="98"
                      max="100"
                      className="input w-20 text-center"
                      value={
                        requiredWatchPercentage
                      }
                      onChange={(e) =>
                        setRequiredWatchPercentage(
                          Number(
                            e.target.value
                          )
                        )
                      }
                    />

                    <span className="text-sm font-bold">
                      %
                    </span>

                  </div>

                </div>

                {/* STATUS */}

                <div className="p-4 rounded-lg border border-themed">

                  <p className="text-xs font-semibold">
                    Quiz Status
                  </p>

                  <p className="text-xs text-muted mt-1">
                    Enable or disable attempts.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setQuizActive(
                        (value) =>
                          !value
                      )
                    }
                    className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      quizActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {quizActive
                      ? 'Active'
                      : 'Inactive'}
                  </button>

                </div>

              </div>

            </div>

          </div>

          {/* ==================================================
              QUESTIONS
          ================================================== */}

          <div className="card p-5">

            <div className="flex items-center justify-between mb-5">

              <div>

                <h2
                  className="text-base font-semibold"
                  style={{
                    color:
                      'var(--text)',
                  }}
                >
                  Quiz Questions
                </h2>

                <p className="text-xs text-muted mt-1">
                  {quizQuestions.length}{' '}
                  question
                  {quizQuestions.length !==
                  1
                    ? 's'
                    : ''}{' '}
                  configured
                </p>

              </div>

              <button
                onClick={openAddQuestion}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Plus size={14} />
                Add Question
              </button>

            </div>

            {quizQuestions.length === 0 ? (

              <div className="text-center py-10">

                <HelpCircle
                  size={34}
                  className="mx-auto mb-3 text-muted opacity-50"
                />

                <p className="text-sm font-medium">
                  No questions yet
                </p>

                <p className="text-xs text-muted mt-1">
                  Add questions to build this
                  chapter quiz.
                </p>

              </div>

            ) : (

              <div className="space-y-4">

                {quizQuestions.map(
                  (question, index) => (

                    <div
                      key={
                        question.id ||
                        question._id ||
                        index
                      }
                      className="border border-themed rounded-lg p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex gap-3 min-w-0">

                          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {index + 1}
                          </span>

                          <div className="min-w-0">

                            <p
                              className="text-sm font-medium"
                              style={{
                                color:
                                  'var(--text)',
                              }}
                            >
                              {question.question}
                            </p>

                            <div className="mt-3 space-y-1.5">

                              {(
                                question.options ||
                                []
                              ).map(
                                (
                                  option,
                                  optionIndex
                                ) => {

                                  const correct =
                                    Number(
                                      question.correctOption
                                    ) ===
                                    optionIndex;

                                  return (
                                    <div
                                      key={
                                        optionIndex
                                      }
                                      className={`text-xs px-3 py-2 rounded-md border ${
                                        correct
                                          ? 'border-green-300 bg-green-50 text-green-700'
                                          : 'border-themed text-muted'
                                      }`}
                                    >

                                      <div className="flex items-center gap-2">

                                        <span className="font-semibold">
                                          {String.fromCharCode(
                                            65 +
                                              optionIndex
                                          )}
                                          .
                                        </span>

                                        <span className="break-words">
                                          {option}
                                        </span>

                                        {correct && (
                                          <CheckCircle
                                            size={13}
                                            className="ml-auto shrink-0"
                                          />
                                        )}

                                      </div>

                                    </div>
                                  );
                                }
                              )}

                            </div>

                            {question.explanation && (
                              <p className="text-xs text-muted mt-3">
                                <strong>
                                  Explanation:
                                </strong>{' '}
                                {question.explanation}
                              </p>
                            )}

                          </div>

                        </div>

                        <div className="flex items-center gap-1 shrink-0">

                          <button
                            onClick={() =>
                              openEditQuestion(
                                index
                              )
                            }
                            className="btn-ghost p-1.5"
                            title="Edit question"
                          >
                            <Edit size={15} />
                          </button>

                          <button
                            onClick={() =>
                              deleteQuestion(
                                index
                              )
                            }
                            className="btn-ghost p-1.5 text-red-600"
                            title="Delete question"
                          >
                            <Trash2 size={15} />
                          </button>

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

          {/* ==================================================
              SAVE
          ================================================== */}

          <div className="flex justify-end">

            <button
              onClick={saveQuiz}
              disabled={savingQuiz}
              className="btn-primary flex items-center gap-2"
            >

              {savingQuiz ? (
                <ButtonSpinner />
              ) : (
                <>
                  <Save size={16} />
                  Save Quiz
                </>
              )}

            </button>

          </div>

        </div>
      )}

      {/* ======================================================
          QUESTION MODAL
      ====================================================== */}

      <Modal
        open={showQuestionModal}
        onClose={() => {
          setShowQuestionModal(false);
          resetQuestionForm();
        }}
        title={
          editingQuestionIndex !== null
            ? 'Edit Question'
            : 'Add Question'
        }
        size="lg"
      >

        <div className="space-y-5">

          {/* QUESTION */}

          <div>

            <label className="label">
              Question
            </label>

            <textarea
              className="input resize-none"
              rows={3}
              value={
                questionForm.question
              }
              onChange={(e) =>
                setQuestionForm({
                  ...questionForm,
                  question:
                    e.target.value,
                })
              }
              placeholder="Enter the question..."
            />

          </div>

          {/* OPTIONS */}

          <div>

            <label className="label">
              Options
            </label>

            <p className="text-xs text-muted mb-3">
              Select the radio button beside
              the correct answer.
            </p>

            <div className="space-y-2">

              {questionForm.options.map(
                (
                  option,
                  index
                ) => (

                  <div
                    key={index}
                    className="flex items-center gap-2"
                  >

                    <input
                      type="radio"
                      name="quiz-correct-option"
                      checked={
                        Number(
                          questionForm.correctOption
                        ) === index
                      }
                      onChange={() =>
                        setQuestionForm({
                          ...questionForm,
                          correctOption:
                            index,
                        })
                      }
                      className="cursor-pointer"
                    />

                    <span className="w-6 text-xs font-bold text-muted">
                      {String.fromCharCode(
                        65 + index
                      )}
                    </span>

                    <input
                      type="text"
                      className="input flex-1 text-sm"
                      value={option}
                      onChange={(e) => {

                        const updated = [
                          ...questionForm.options,
                        ];

                        updated[index] =
                          e.target.value;

                        setQuestionForm({
                          ...questionForm,
                          options:
                            updated,
                        });

                      }}
                      placeholder={`Option ${
                        index + 1
                      }`}
                    />

                    {Number(
                      questionForm.correctOption
                    ) === index && (
                      <CheckCircle
                        size={16}
                        className="text-green-600 shrink-0"
                      />
                    )}

                  </div>

                )
              )}

            </div>

          </div>

          {/* EXPLANATION */}

          <div>

            <label className="label">
              Explanation
              <span className="text-muted font-normal ml-1">
                (optional)
              </span>
            </label>

            <textarea
              className="input resize-none"
              rows={3}
              value={
                questionForm.explanation
              }
              onChange={(e) =>
                setQuestionForm({
                  ...questionForm,
                  explanation:
                    e.target.value,
                })
              }
              placeholder="Explain why the correct answer is correct..."
            />

          </div>

          {/* ACTIONS */}

          <div className="flex justify-end gap-2 pt-3 border-t border-themed">

            <button
              type="button"
              onClick={() => {
                setShowQuestionModal(
                  false
                );
                resetQuestionForm();
              }}
              className="btn-secondary flex items-center gap-1.5"
            >
              <X size={15} />
              Cancel
            </button>

            <button
              type="button"
              onClick={saveQuestion}
              className="btn-primary flex items-center gap-1.5"
            >
              <Save size={15} />
              {editingQuestionIndex !== null
                ? 'Update Question'
                : 'Add Question'}
            </button>

          </div>

        </div>

      </Modal>

    </div>
  );
}