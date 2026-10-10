import { useState, useEffect } from 'react';

import {
  Search,
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Layers,
  Link as LinkIcon,
  CheckCircle,
  CircleHelp,
  Youtube,
  Clock,
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

import { useDebounce } from '@/hooks/useHooks';


// ============================================================
// ADMIN CAREERS
// ============================================================

export default function AdminCareers() {
  const toast = useToast();

  // ==========================================================
  // CAREERS
  // ==========================================================

  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // ==========================================================
  // SELECTED CAREER
  // ==========================================================

  const [selectedCareer, setSelectedCareer] = useState(null);
  const [careerLoading, setCareerLoading] = useState(false);

  const [careerSkills, setCareerSkills] = useState([]);
  const [expandedSkills, setExpandedSkills] = useState({});

  const [skillChapters, setSkillChapters] = useState({});
  const [chapterLoading, setChapterLoading] = useState({});

  // ==========================================================
  // MASTER DATA
  // ==========================================================

  const [allSkills, setAllSkills] = useState([]);
  const [allChapters, setAllChapters] = useState([]);

  const [availableSkillsLoading, setAvailableSkillsLoading] =
    useState(false);

  const [availableChaptersLoading, setAvailableChaptersLoading] =
    useState({});

  const [skillSearch, setSkillSearch] = useState('');
  const [chapterSearch, setChapterSearch] = useState({});

  // ==========================================================
  // ADD EXISTING SKILL
  // ==========================================================

  const [showAddSkill, setShowAddSkill] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);

  // ==========================================================
  // CREATE SKILL
  // ==========================================================

  const [showCreateSkill, setShowCreateSkill] = useState(false);
  const [creatingSkill, setCreatingSkill] = useState(false);

  const [skillForm, setSkillForm] = useState({
    name: '',
    description: '',
    active: true,
  });

  // ==========================================================
  // CREATE CAREER
  // ==========================================================

  const [showCreateCareer, setShowCreateCareer] =
    useState(false);

  const [creatingCareer, setCreatingCareer] =
    useState(false);

  const [careerForm, setCareerForm] = useState({
    name: '',
    description: '',
    active: true,
  });

  // ==========================================================
  // EDIT CAREER
  // ==========================================================

  const [showEditCareer, setShowEditCareer] =
    useState(false);

  const [editingCareer, setEditingCareer] =
    useState(false);

  // ==========================================================
  // CREATE CHAPTER
  // ==========================================================

  const [showCreateChapter, setShowCreateChapter] =
    useState({});

  const [creatingChapter, setCreatingChapter] =
    useState({});

  const [chapterForm, setChapterForm] = useState({});

  // ==========================================================
  // ADD EXISTING CHAPTER
  // ==========================================================

  const [showAddChapter, setShowAddChapter] =
    useState({});

  // ==========================================================
  // QUIZ QUESTION
  // ==========================================================

  const emptyQuizQuestion = () => ({
    id: Date.now().toString(),
    question: '',
    options: ['', '', '', ''],
    correctOption: 0,
    explanation: '',
  });

  // ==========================================================
  // EMPTY CHAPTER FORM
  // ==========================================================

  const createEmptyChapterForm = () => ({
    title: '',
    description: '',
    youtubeUrl: '',
    duration: '',
    order: 0,
    active: true,

    quiz: {
      title: '',
      passScore: 70,
      requiredWatchPercentage: 98,
      active: true,
      questions: [
        emptyQuizQuestion(),
      ],
    },
  });

  // ==========================================================
  // FETCH CAREERS
  // ==========================================================

  const fetchCareers = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await adminAPI.listCareers({
        q: debouncedSearch,
      });

      setCareers(
        res.data?.careers || []
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Failed to load careers'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCareers();
  }, [debouncedSearch]);

  // ==========================================================
  // FETCH ALL SKILLS
  // ==========================================================

  const fetchAllSkills = async () => {
    setAvailableSkillsLoading(true);

    try {
      const res = await adminAPI.listSkills({
        q: '',
      });

      const skills =
        res.data?.skills || [];

      setAllSkills(skills);

      return skills;
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Failed to load skills'
      );

      return [];
    } finally {
      setAvailableSkillsLoading(false);
    }
  };

  // ==========================================================
  // FETCH ALL CHAPTERS
  // ==========================================================

  const fetchAllChapters = async () => {
    try {
      const res = await adminAPI.listChapters({
        q: '',
      });

      const chapters =
        res.data?.chapters || [];

      setAllChapters(chapters);

      return chapters;
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Failed to load chapters'
      );

      return [];
    }
  };

  // ==========================================================
  // ID HELPERS
  // ==========================================================

  const getCareerId = (career) => {
    if (!career) return null;

    if (typeof career === 'string') {
      return career;
    }

    return (
      career._id ||
      career.id ||
      career.career_id ||
      career.careerId ||
      career.code
    );
  };

  const getSkillId = (skill) => {
    if (!skill) return null;

    if (typeof skill === 'string') {
      return skill;
    }

    return (
      skill._id ||
      skill.id ||
      skill.skill_id ||
      skill.skillId
    );
  };

  const getChapterId = (chapter) => {
    if (!chapter) return null;

    if (typeof chapter === 'string') {
      return chapter;
    }

    return (
      chapter._id ||
      chapter.id ||
      chapter.chapter_id ||
      chapter.chapterId
    );
  };

  const getCareerName = (career) => {
    if (!career) return 'Unnamed Career';

    return (
      career.name ||
      career.title ||
      career.career_name ||
      career.careerName ||
      career.code ||
      'Unnamed Career'
    );
  };

  const getSkillName = (skill) => {
    if (!skill) return 'Unnamed Skill';

    return (
      skill.name ||
      skill.title ||
      skill.skill_name ||
      skill.skillName ||
      'Unnamed Skill'
    );
  };

  const getChapterName = (chapter) => {
    if (!chapter) return 'Unnamed Chapter';

    return (
      chapter.title ||
      chapter.name ||
      chapter.chapter_name ||
      chapter.chapterName ||
      'Unnamed Chapter'
    );
  };

  // ==========================================================
  // RESOLVE SKILLS
  // ==========================================================

  const resolveSkills = (
    skillsResponse,
    skillsList = allSkills
  ) => {
    if (!Array.isArray(skillsResponse)) {
      return [];
    }

    return skillsResponse
      .map((item) => {
        if (
          typeof item === 'object' &&
          item !== null
        ) {
          return item;
        }

        return (
          skillsList.find(
            (skill) =>
              String(
                getSkillId(skill)
              ) === String(item)
          ) || null
        );
      })
      .filter(Boolean);
  };

  // ==========================================================
  // RESOLVE CHAPTERS
  // ==========================================================

  const resolveChapters = (
    chaptersResponse,
    chaptersList = allChapters
  ) => {
    if (!Array.isArray(chaptersResponse)) {
      return [];
    }

    return chaptersResponse
      .map((item) => {
        if (
          typeof item === 'object' &&
          item !== null
        ) {
          return item;
        }

        return (
          chaptersList.find(
            (chapter) =>
              String(
                getChapterId(chapter)
              ) === String(item)
          ) || null
        );
      })
      .filter(Boolean);
  };

  // ==========================================================
  // OPEN CAREER
  // ==========================================================

  const openCareerOverview = async (
    career
  ) => {
    setSelectedCareer(career);
    setCareerLoading(true);

    setCareerSkills([]);
    setSkillChapters({});
    setExpandedSkills({});
    setShowAddSkill(false);
    setShowAddChapter({});
    setShowCreateSkill(false);
    setShowCreateChapter({});
    setSkillSearch('');
    setChapterSearch({});

    try {
      const [
        skillsList,
        chaptersList,
        mappingResponse,
      ] = await Promise.all([
        fetchAllSkills(),
        fetchAllChapters(),
        adminAPI.getCareerSkills(
          career
        ),
      ]);

      const rawSkills =
        mappingResponse?.data?.skills ||
        mappingResponse?.data?.skillIds ||
        [];

      const resolvedSkills =
        resolveSkills(
          rawSkills,
          skillsList
        );

      setCareerSkills(
        resolvedSkills
      );

      setAllChapters(
        chaptersList
      );
    } catch (err) {
      console.error(
        '[AdminCareers] Failed to open career:',
        err
      );

      toast.error(
        err.response?.data?.error ||
          'Failed to load career details'
      );
    } finally {
      setCareerLoading(false);
    }
  };

  // ==========================================================
  // LOAD SKILL CHAPTERS
  // ==========================================================

  const loadSkillChapters = async (
    skill
  ) => {
    const skillId =
      getSkillId(skill);

    if (!skillId) return;

    if (
      Object.prototype.hasOwnProperty.call(
        skillChapters,
        skillId
      )
    ) {
      return;
    }

    setChapterLoading(
      (previous) => ({
        ...previous,
        [skillId]: true,
      })
    );

    try {
      let chaptersList =
        allChapters;

      if (
        !chaptersList ||
        chaptersList.length === 0
      ) {
        chaptersList =
          await fetchAllChapters();
      }

      const res =
        await adminAPI.getSkillChapters(
          skillId
        );

      const rawChapters =
        res.data?.chapters ||
        res.data?.chapterIds ||
        [];

      const resolved =
        resolveChapters(
          rawChapters,
          chaptersList
        );

      setSkillChapters(
        (previous) => ({
          ...previous,
          [skillId]: resolved,
        })
      );
    } catch (err) {
      console.error(
        '[AdminCareers] Failed to load chapters:',
        err
      );

      toast.error(
        err.response?.data?.error ||
          'Failed to load chapters'
      );

      setSkillChapters(
        (previous) => ({
          ...previous,
          [skillId]: [],
        })
      );
    } finally {
      setChapterLoading(
        (previous) => ({
          ...previous,
          [skillId]: false,
        })
      );
    }
  };

  // ==========================================================
  // TOGGLE SKILL
  // ==========================================================

  const toggleSkill = async (
    skill
  ) => {
    const skillId =
      getSkillId(skill);

    if (!skillId) return;

    const currentlyExpanded =
      expandedSkills[skillId];

    setExpandedSkills(
      (previous) => ({
        ...previous,
        [skillId]:
          !currentlyExpanded,
      })
    );

    if (!currentlyExpanded) {
      await loadSkillChapters(
        skill
      );
    }
  };

  // ==========================================================
  // CREATE CAREER
  // ==========================================================

  const resetCareerForm = () => {
    setCareerForm({
      name: '',
      description: '',
      active: true,
    });
  };

  const createCareer = async () => {
    if (!careerForm.name.trim()) {
      toast.error(
        'Career name is required.'
      );
      return;
    }

    setCreatingCareer(true);

    try {
      const res =
        await adminAPI.createCareer({
          name: careerForm.name.trim(),
          description:
            careerForm.description.trim(),
          active:
            careerForm.active,
        });

      const createdCareer =
        res.data?.career ||
        res.data?.data ||
        res.data;

      if (!createdCareer) {
        throw new Error(
          'Career was created but no career data was returned.'
        );
      }

      setCareers(
        (previous) => [
          createdCareer,
          ...previous,
        ]
      );

      resetCareerForm();
      setShowCreateCareer(false);

      toast.success(
        `${getCareerName(createdCareer)} created successfully.`
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.message ||
          'Failed to create career'
      );
    } finally {
      setCreatingCareer(false);
    }
  };

  // ==========================================================
  // OPEN EDIT CAREER
  // ==========================================================

  const openEditCareer = () => {
    if (!selectedCareer) return;

    setCareerForm({
      name:
        selectedCareer.name ||
        selectedCareer.title ||
        '',
      description:
        selectedCareer.description ||
        '',
      active:
        selectedCareer.active !== false,
    });

    setShowEditCareer(true);
  };

  // ==========================================================
  // UPDATE CAREER
  // ==========================================================

  const updateCareer = async () => {
    if (!selectedCareer) {
      return;
    }

    if (!careerForm.name.trim()) {
      toast.error(
        'Career name is required.'
      );
      return;
    }

    const careerId =
      getCareerId(
        selectedCareer
      );

    if (!careerId) {
      toast.error(
        'Career ID is missing.'
      );
      return;
    }

    setEditingCareer(true);

    try {
      const res =
        await adminAPI.updateCareer(
          careerId,
          {
            name:
              careerForm.name.trim(),
            description:
              careerForm.description.trim(),
            active:
              careerForm.active,
          }
        );

      const updatedCareer =
        res.data?.career ||
        res.data?.data ||
        {
          ...selectedCareer,
          ...careerForm,
        };

      setSelectedCareer(
        updatedCareer
      );

      setCareers(
        (previous) =>
          previous.map(
            (career) =>
              String(
                getCareerId(career)
              ) ===
              String(careerId)
                ? {
                    ...career,
                    ...updatedCareer,
                  }
                : career
          )
      );

      setShowEditCareer(false);

      toast.success(
        'Career updated successfully.'
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Failed to update career'
      );
    } finally {
      setEditingCareer(false);
    }
  };

  // ==========================================================
  // DELETE CAREER
  // ==========================================================

  const deleteCareer = async (
    career
  ) => {
    const careerId =
      getCareerId(career);

    if (!careerId) return;

    const careerName =
      getCareerName(career);

    if (
      !confirm(
        `Delete "${careerName}"? This will delete the career record.`
      )
    ) {
      return;
    }

    try {
      await adminAPI.deleteCareer(
        careerId
      );

      setCareers(
        (previous) =>
          previous.filter(
            (item) =>
              String(
                getCareerId(item)
              ) !==
              String(careerId)
          )
      );

      if (
        selectedCareer &&
        String(
          getCareerId(
            selectedCareer
          )
        ) === String(careerId)
      ) {
        setSelectedCareer(null);
      }

      toast.success(
        'Career deleted successfully.'
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Failed to delete career'
      );
    }
  };

  // ==========================================================
  // RESET SKILL FORM
  // ==========================================================

  const resetSkillForm = () => {
    setSkillForm({
      name: '',
      description: '',
      active: true,
    });
  };

  // ==========================================================
  // CREATE SKILL
  // ==========================================================

  const createSkill = async () => {
    if (!selectedCareer) {
      toast.error(
        'Please select a career first.'
      );
      return;
    }

    if (!skillForm.name.trim()) {
      toast.error(
        'Skill name is required.'
      );
      return;
    }

    setCreatingSkill(true);

    try {
      const res =
        await adminAPI.createSkill({
          name:
            skillForm.name.trim(),
          description:
            skillForm.description.trim(),
          active:
            skillForm.active,
        });

      const createdSkill =
        res.data?.skill ||
        res.data?.data ||
        res.data;

      if (!createdSkill) {
        throw new Error(
          'Skill was created but no skill data was returned.'
        );
      }

      const updatedSkills = [
        ...careerSkills,
        createdSkill,
      ];

      await adminAPI.setCareerSkills(
        selectedCareer,
        updatedSkills
          .map((item) =>
            getSkillId(item)
          )
          .filter(Boolean)
      );

      setCareerSkills(
        updatedSkills
      );

      setAllSkills(
        (previous) => {
          const exists =
            previous.some(
              (item) =>
                String(
                  getSkillId(item)
                ) ===
                String(
                  getSkillId(
                    createdSkill
                  )
                )
            );

          if (exists) {
            return previous;
          }

          return [
            ...previous,
            createdSkill,
          ];
        }
      );

      resetSkillForm();
      setShowCreateSkill(false);

      toast.success(
        `${getSkillName(createdSkill)} created and added to ${getCareerName(selectedCareer)}.`
      );
    } catch (err) {
      console.error(
        '[AdminCareers] Failed to create skill:',
        err
      );

      toast.error(
        err.response?.data?.error ||
          err.message ||
          'Failed to create skill'
      );
    } finally {
      setCreatingSkill(false);
    }
  };

  // ==========================================================
  // ADD EXISTING SKILL
  // ==========================================================

  const addSkillToCareer = async (
    skill
  ) => {
    if (!selectedCareer) {
      return;
    }

    const skillId =
      getSkillId(skill);

    if (!skillId) return;

    const alreadyExists =
      careerSkills.some(
        (item) =>
          String(
            getSkillId(item)
          ) ===
          String(skillId)
      );

    if (alreadyExists) {
      toast.info(
        'This skill is already part of the career.'
      );
      return;
    }

    const updatedSkills = [
      ...careerSkills,
      skill,
    ];

    setSavingSkills(true);

    try {
      await adminAPI.setCareerSkills(
        selectedCareer,
        updatedSkills
          .map((item) =>
            getSkillId(item)
          )
          .filter(Boolean)
      );

      setCareerSkills(
        updatedSkills
      );

      toast.success(
        `${getSkillName(skill)} added to ${getCareerName(selectedCareer)}.`
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Failed to add skill'
      );
    } finally {
      setSavingSkills(false);
    }
  };

  // ==========================================================
  // REMOVE SKILL
  // ==========================================================

  const removeSkillFromCareer = async (
    skill
  ) => {
    if (!selectedCareer) {
      return;
    }

    const skillName =
      getSkillName(skill);

    const skillId =
      getSkillId(skill);

    if (!skillId) return;

    if (
      !confirm(
        `Remove "${skillName}" from this career?`
      )
    ) {
      return;
    }

    const updatedSkills =
      careerSkills.filter(
        (item) =>
          String(
            getSkillId(item)
          ) !==
          String(skillId)
      );

    setSavingSkills(true);

    try {
      await adminAPI.setCareerSkills(
        selectedCareer,
        updatedSkills
          .map((item) =>
            getSkillId(item)
          )
          .filter(Boolean)
      );

      setCareerSkills(
        updatedSkills
      );

      setSkillChapters(
        (previous) => {
          const next = {
            ...previous,
          };

          delete next[skillId];

          return next;
        }
      );

      setExpandedSkills(
        (previous) => {
          const next = {
            ...previous,
          };

          delete next[skillId];

          return next;
        }
      );

      toast.success(
        `${skillName} removed from the career.`
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Failed to remove skill'
      );
    } finally {
      setSavingSkills(false);
    }
  };

  // ==========================================================
  // RESET CHAPTER FORM
  // ==========================================================

  const resetChapterForm = (
    skillId
  ) => {
    setChapterForm(
      (previous) => ({
        ...previous,
        [skillId]:
          createEmptyChapterForm(),
      })
    );
  };

  // ==========================================================
  // OPEN CREATE CHAPTER
  // ==========================================================

  const openCreateChapter = (
    skill
  ) => {
    const skillId =
      getSkillId(skill);

    if (!skillId) return;

    setChapterForm(
      (previous) => ({
        ...previous,
        [skillId]:
          createEmptyChapterForm(),
      })
    );

    setShowCreateChapter(
      (previous) => ({
        ...previous,
        [skillId]: true,
      })
    );

    setShowAddChapter(
      (previous) => ({
        ...previous,
        [skillId]: false,
      })
    );

    setExpandedSkills(
      (previous) => ({
        ...previous,
        [skillId]: true,
      })
    );
  };

  // ==========================================================
  // CLOSE CREATE CHAPTER
  // ==========================================================

  const closeCreateChapter = (
    skillId
  ) => {
    setShowCreateChapter(
      (previous) => ({
        ...previous,
        [skillId]: false,
      })
    );

    setChapterForm(
      (previous) => {
        const next = {
          ...previous,
        };

        delete next[skillId];

        return next;
      }
    );
  };

  // ==========================================================
  // UPDATE CHAPTER FORM
  // ==========================================================

  const updateChapterForm = (
    skillId,
    field,
    value
  ) => {
    setChapterForm(
      (previous) => ({
        ...previous,
        [skillId]: {
          ...(previous[skillId] ||
            createEmptyChapterForm()),
          [field]: value,
        },
      })
    );
  };

  // ==========================================================
  // UPDATE QUIZ FORM
  // ==========================================================

  const updateQuizForm = (
    skillId,
    field,
    value
  ) => {
    setChapterForm(
      (previous) => {
        const current =
          previous[skillId] ||
          createEmptyChapterForm();

        return {
          ...previous,
          [skillId]: {
            ...current,
            quiz: {
              ...current.quiz,
              [field]: value,
            },
          },
        };
      }
    );
  };

  // ==========================================================
  // UPDATE QUIZ QUESTION
  // ==========================================================

  const updateQuizQuestion = (
    skillId,
    questionIndex,
    field,
    value
  ) => {
    setChapterForm(
      (previous) => {
        const current =
          previous[skillId] ||
          createEmptyChapterForm();

        const questions = [
          ...(current.quiz?.questions ||
            []),
        ];

        questions[questionIndex] = {
          ...questions[
            questionIndex
          ],
          [field]: value,
        };

        return {
          ...previous,
          [skillId]: {
            ...current,
            quiz: {
              ...current.quiz,
              questions,
            },
          },
        };
      }
    );
  };

  // ==========================================================
  // UPDATE QUIZ OPTION
  // ==========================================================

  const updateQuizOption = (
    skillId,
    questionIndex,
    optionIndex,
    value
  ) => {
    setChapterForm(
      (previous) => {
        const current =
          previous[skillId] ||
          createEmptyChapterForm();

        const questions = [
          ...(current.quiz?.questions ||
            []),
        ];

        const question = {
          ...(questions[
            questionIndex
          ] || {}),
        };

        const options = [
          ...(question.options || [
            '',
            '',
            '',
            '',
          ]),
        ];

        options[optionIndex] =
          value;

        question.options =
          options;

        questions[
          questionIndex
        ] = question;

        return {
          ...previous,
          [skillId]: {
            ...current,
            quiz: {
              ...current.quiz,
              questions,
            },
          },
        };
      }
    );
  };

  // ==========================================================
  // ADD QUIZ QUESTION
  // ==========================================================

  const addQuizQuestion = (
    skillId
  ) => {
    setChapterForm(
      (previous) => {
        const current =
          previous[skillId] ||
          createEmptyChapterForm();

        const questions = [
          ...(current.quiz?.questions ||
            []),
        ];

        questions.push(
          emptyQuizQuestion()
        );

        return {
          ...previous,
          [skillId]: {
            ...current,
            quiz: {
              ...current.quiz,
              questions,
            },
          },
        };
      }
    );
  };

  // ==========================================================
  // REMOVE QUIZ QUESTION
  // ==========================================================

  const removeQuizQuestion = (
    skillId,
    questionIndex
  ) => {
    setChapterForm(
      (previous) => {
        const current =
          previous[skillId] ||
          createEmptyChapterForm();

        const questions = [
          ...(current.quiz?.questions ||
            []),
        ];

        if (
          questions.length <= 1
        ) {
          return previous;
        }

        questions.splice(
          questionIndex,
          1
        );

        return {
          ...previous,
          [skillId]: {
            ...current,
            quiz: {
              ...current.quiz,
              questions,
            },
          },
        };
      }
    );
  };
    // ==========================================================
  // VALIDATE CHAPTER FORM
  // ==========================================================

  const validateChapterForm = (
    form
  ) => {
    if (!form.title?.trim()) {
      return 'Chapter title is required.';
    }

    if (!form.description?.trim()) {
      return 'Chapter description is required.';
    }

    if (!form.youtubeUrl?.trim()) {
      return 'YouTube/video URL is required.';
    }

    const passScore =
      Number(
        form.quiz?.passScore
      );

    if (
      Number.isNaN(passScore) ||
      passScore < 70 ||
      passScore > 100
    ) {
      return 'Quiz pass score must be between 70 and 100.';
    }

    const watchPercentage =
      Number(
        form.quiz
          ?.requiredWatchPercentage
      );

    if (
      Number.isNaN(
        watchPercentage
      ) ||
      watchPercentage < 98 ||
      watchPercentage > 100
    ) {
      return 'Required watch percentage must be between 98 and 100.';
    }

    const quiz =
      form.quiz;

    if (!quiz?.active) {
      return null;
    }

    if (!quiz.title?.trim()) {
      return 'Quiz title is required when the quiz is active.';
    }

    if (
      !Array.isArray(
        quiz.questions
      ) ||
      quiz.questions.length === 0
    ) {
      return 'Add at least one quiz question.';
    }

    for (
      let i = 0;
      i < quiz.questions.length;
      i++
    ) {
      const question =
        quiz.questions[i];

      if (
        !question.question?.trim()
      ) {
        return `Question ${i + 1} text is required.`;
      }

      if (
        !Array.isArray(
          question.options
        ) ||
        question.options.length !== 4
      ) {
        return `Question ${i + 1} must have exactly 4 options.`;
      }

      if (
        question.options.some(
          (option) =>
            !option?.trim()
        )
      ) {
        return `All 4 options are required for Question ${i + 1}.`;
      }

      const correctOption =
        Number(
          question.correctOption
        );

      if (
        Number.isNaN(
          correctOption
        ) ||
        correctOption < 0 ||
        correctOption > 3
      ) {
        return `Select the correct option for Question ${i + 1}.`;
      }
    }

    return null;
  };

  // ==========================================================
  // CREATE CHAPTER + QUIZ
  // ==========================================================

  const createChapter = async (
    skill
  ) => {
    const skillId =
      getSkillId(skill);

    if (!skillId) {
      return;
    }

    const form =
      chapterForm[skillId];

    if (!form) {
      toast.error(
        'Chapter form is not ready.'
      );
      return;
    }

    const validationError =
      validateChapterForm(form);

    if (validationError) {
      toast.error(
        validationError
      );
      return;
    }

    setCreatingChapter(
      (previous) => ({
        ...previous,
        [skillId]: true,
      })
    );

    try {
      // --------------------------------------------------------
      // STEP 1: CREATE CHAPTER
      // --------------------------------------------------------

      const chapterPayload = {
        title:
          form.title.trim(),

        description:
          form.description.trim(),

        youtubeUrl:
          form.youtubeUrl.trim(),

        duration:
          form.duration.trim(),

        order:
          Number(form.order) || 0,

        active:
          form.active !== false,
      };

      const chapterResponse =
        await adminAPI.createChapter(
          chapterPayload
        );

      const createdChapter =
        chapterResponse.data?.chapter ||
        chapterResponse.data?.data ||
        chapterResponse.data;

      if (!createdChapter) {
        throw new Error(
          'Chapter was created but no chapter data was returned.'
        );
      }

      const chapterId =
        getChapterId(
          createdChapter
        );

      if (!chapterId) {
        throw new Error(
          'Chapter was created but no chapter ID was returned.'
        );
      }

      // --------------------------------------------------------
      // STEP 2: SAVE QUIZ THROUGH THE EXISTING QUIZ ENDPOINT
      // --------------------------------------------------------

      const quiz =
        form.quiz;

      if (
        quiz?.active !== false
      ) {
        const quizPayload = {
          title:
            quiz.title.trim(),

          questions:
            quiz.questions.map(
              (question) => ({
                id:
                  question.id ||
                  Date.now().toString(),

                question:
                  question.question.trim(),

                options:
                  question.options.map(
                    (option) =>
                      option.trim()
                  ),

                correctOption:
                  Number(
                    question.correctOption
                  ),

                explanation:
                  question.explanation?.trim() ||
                  '',
              })
            ),

          passScore:
            Number(
              quiz.passScore
            ),

          requiredWatchPercentage:
            Number(
              quiz.requiredWatchPercentage
            ),

          active:
            quiz.active !== false,
        };

        await adminAPI.updateChapterQuiz(
          chapterId,
          quizPayload
        );
      }

      // --------------------------------------------------------
      // STEP 3: LOAD CURRENT SKILL → CHAPTER MAPPING
      // --------------------------------------------------------

      let currentChapters =
        skillChapters[skillId];

      if (
        !Array.isArray(
          currentChapters
        )
      ) {
        const mappingResponse =
          await adminAPI.getSkillChapters(
            skillId
          );

        const rawChapters =
          mappingResponse?.data?.chapters ||
          mappingResponse?.data?.chapterIds ||
          [];

        currentChapters =
          resolveChapters(
            rawChapters,
            allChapters
          );
      }

      // --------------------------------------------------------
      // STEP 4: ADD NEW CHAPTER TO SKILL
      // --------------------------------------------------------

      const updatedChapters = [
        ...(currentChapters || []),
        createdChapter,
      ];

      await adminAPI.setSkillChapters(
        skillId,
        updatedChapters
          .map((item) =>
            getChapterId(item)
          )
          .filter(Boolean)
      );

      // --------------------------------------------------------
      // STEP 5: UPDATE LOCAL STATE
      // --------------------------------------------------------

      setSkillChapters(
        (previous) => ({
          ...previous,
          [skillId]:
            updatedChapters,
        })
      );

      setAllChapters(
        (previous) => {
          const exists =
            previous.some(
              (item) =>
                String(
                  getChapterId(item)
                ) ===
                String(chapterId)
            );

          if (exists) {
            return previous;
          }

          return [
            ...previous,
            createdChapter,
          ];
        }
      );

      setExpandedSkills(
        (previous) => ({
          ...previous,
          [skillId]: true,
        })
      );

      closeCreateChapter(
        skillId
      );

      toast.success(
        `${getChapterName(createdChapter)} created and added to ${getSkillName(skill)}.`
      );
    } catch (err) {
      console.error(
        '[AdminCareers] Failed to create chapter:',
        err
      );

      toast.error(
        err.response?.data?.error ||
          err.message ||
          'Failed to create chapter'
      );
    } finally {
      setCreatingChapter(
        (previous) => ({
          ...previous,
          [skillId]: false,
        })
      );
    }
  };

  // ==========================================================
  // ADD EXISTING CHAPTER
  // ==========================================================

  const addChapterToSkill = async (
    skill,
    chapter
  ) => {
    const skillId =
      getSkillId(skill);

    const chapterId =
      getChapterId(chapter);

    if (
      !skillId ||
      !chapterId
    ) {
      return;
    }

    const current =
      skillChapters[skillId] ||
      [];

    const exists =
      current.some(
        (item) =>
          String(
            getChapterId(item)
          ) ===
          String(chapterId)
      );

    if (exists) {
      toast.info(
        'This chapter is already linked to this skill.'
      );
      return;
    }

    const updated = [
      ...current,
      chapter,
    ];

    setAvailableChaptersLoading(
      (previous) => ({
        ...previous,
        [skillId]: true,
      })
    );

    try {
      await adminAPI.setSkillChapters(
        skillId,
        updated
          .map((item) =>
            getChapterId(item)
          )
          .filter(Boolean)
      );

      setSkillChapters(
        (previous) => ({
          ...previous,
          [skillId]: updated,
        })
      );

      toast.success(
        `${getChapterName(chapter)} added to ${getSkillName(skill)}.`
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Failed to add chapter'
      );
    } finally {
      setAvailableChaptersLoading(
        (previous) => ({
          ...previous,
          [skillId]: false,
        })
      );
    }
  };

  // ==========================================================
  // REMOVE CHAPTER
  // ==========================================================

  const removeChapterFromSkill = async (
    skill,
    chapter
  ) => {
    const skillId =
      getSkillId(skill);

    const chapterId =
      getChapterId(chapter);

    if (
      !skillId ||
      !chapterId
    ) {
      return;
    }

    if (
      !confirm(
        `Remove "${getChapterName(chapter)}" from ${getSkillName(skill)}?`
      )
    ) {
      return;
    }

    const current =
      skillChapters[skillId] ||
      [];

    const updated =
      current.filter(
        (item) =>
          String(
            getChapterId(item)
          ) !==
          String(chapterId)
      );

    setAvailableChaptersLoading(
      (previous) => ({
        ...previous,
        [skillId]: true,
      })
    );

    try {
      await adminAPI.setSkillChapters(
        skillId,
        updated
          .map((item) =>
            getChapterId(item)
          )
          .filter(Boolean)
      );

      setSkillChapters(
        (previous) => ({
          ...previous,
          [skillId]: updated,
        })
      );

      toast.success(
        'Chapter removed from the skill.'
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Failed to remove chapter'
      );
    } finally {
      setAvailableChaptersLoading(
        (previous) => ({
          ...previous,
          [skillId]: false,
        })
      );
    }
  };

  // ==========================================================
  // LOADING / ERROR
  // ==========================================================

  if (
    loading &&
    careers.length === 0
  ) {
    return (
      <FullPageSpinner
        label="Loading careers..."
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchCareers}
      />
    );
  }

  // ==========================================================
  // CAREER OVERVIEW
  // ==========================================================

  if (selectedCareer) {
    return (
      <div className="animate-fade-in">

        {/* ====================================================
            CAREER HEADER
        ==================================================== */}

        <div className="flex items-center justify-between mb-6">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setSelectedCareer(null)
              }
              className="btn-ghost p-2"
              title="Back to careers"
            >
              <ArrowLeft size={18} />
            </button>

            <div>

              <div className="flex items-center gap-2">

                <Briefcase
                  size={22}
                  className="text-primary"
                />

                <h1
                  className="text-2xl font-heading font-bold"
                  style={{
                    color: 'var(--text)',
                  }}
                >
                  {getCareerName(
                    selectedCareer
                  )}
                </h1>

              </div>

              {selectedCareer.description && (
                <p className="text-sm text-muted mt-1">
                  {selectedCareer.description}
                </p>
              )}

            </div>

          </div>

          <button
            type="button"
            onClick={
              openEditCareer
            }
            className="btn-secondary"
          >
            <Edit size={15} />
            Edit Career
          </button>

        </div>

        {/* ====================================================
            EDIT CAREER PANEL
        ==================================================== */}

        {showEditCareer && (
          <div className="card p-5 mb-5">

            <div className="flex items-center justify-between mb-5">

              <div>

                <h2
                  className="font-semibold"
                  style={{
                    color: 'var(--text)',
                  }}
                >
                  Edit Career
                </h2>

                <p className="text-xs text-muted mt-1">
                  Update the selected career.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowEditCareer(
                    false
                  )
                }
                className="btn-ghost p-1"
              >
                <X size={16} />
              </button>

            </div>

            <div className="space-y-4">

              <div>

                <label className="label">
                  Career Name
                </label>

                <input
                  type="text"
                  className="input"
                  value={
                    careerForm.name
                  }
                  onChange={(e) =>
                    setCareerForm(
                      (previous) => ({
                        ...previous,
                        name:
                          e.target.value,
                      })
                    )
                  }
                />

              </div>

              <div>

                <label className="label">
                  Description
                </label>

                <textarea
                  rows={3}
                  className="input resize-none"
                  value={
                    careerForm.description
                  }
                  onChange={(e) =>
                    setCareerForm(
                      (previous) => ({
                        ...previous,
                        description:
                          e.target.value,
                      })
                    )
                  }
                />

              </div>

              <label className="flex items-center gap-2">

                <input
                  type="checkbox"
                  checked={
                    careerForm.active
                  }
                  onChange={(e) =>
                    setCareerForm(
                      (previous) => ({
                        ...previous,
                        active:
                          e.target.checked,
                      })
                    )
                  }
                />

                <span
                  className="text-sm"
                  style={{
                    color: 'var(--text)',
                  }}
                >
                  Active
                </span>

              </label>

            </div>

            <div className="flex justify-end gap-2 mt-5">

              <button
                type="button"
                onClick={() =>
                  setShowEditCareer(
                    false
                  )
                }
                className="btn-secondary"
              >
                <X size={15} />
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  updateCareer
                }
                disabled={
                  editingCareer
                }
                className="btn-primary"
              >
                {editingCareer ? (
                  <ButtonSpinner />
                ) : (
                  <>
                    <Save size={15} />
                    Save Changes
                  </>
                )}
              </button>

            </div>

          </div>
        )}

        {/* ====================================================
            CAREER LOADING
        ==================================================== */}

        {careerLoading ? (

          <div className="card p-8 flex justify-center">

            <ButtonSpinner />

          </div>

        ) : (

          <>
            {/* ==================================================
                SKILLS HEADER
            ================================================== */}

            <div className="card p-5">

              <div className="flex items-center justify-between mb-5">

                <div>

                  <div className="flex items-center gap-2">

                    <Layers
                      size={20}
                      className="text-primary"
                    />

                    <h2
                      className="text-lg font-semibold"
                      style={{
                        color: 'var(--text)',
                      }}
                    >
                      Career Skills
                    </h2>

                  </div>

                  <p className="text-xs text-muted mt-1">
                    Manage skills and create their chapters directly here.
                  </p>

                </div>

                <span className="badge">
                  {careerSkills.length}{' '}
                  skills
                </span>

              </div>

              {/* =================================================
                  SEARCH SKILLS
              ================================================= */}

              {careerSkills.length > 0 && (
                <div className="relative mb-4">

                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />

                  <input
                    type="text"
                    className="input pl-9"
                    placeholder="Search skills in this career..."
                    value={
                      skillSearch
                    }
                    onChange={(e) =>
                      setSkillSearch(
                        e.target.value
                      )
                    }
                  />

                </div>
              )}

              {/* =================================================
                  SKILL LIST
              ================================================= */}

              {careerSkills.length === 0 ? (

                <EmptyState
                  icon={Layers}
                  title="No skills added"
                  message="Create a new skill or add an existing skill to this career."
                />

              ) : (

                <div className="space-y-3">

                  {careerSkills
                    .filter((skill) =>
                      getSkillName(
                        skill
                      )
                        .toLowerCase()
                        .includes(
                          skillSearch
                            .toLowerCase()
                        )
                    )
                    .map((skill) => {

                      const skillId =
                        getSkillId(
                          skill
                        );

                      const expanded =
                        !!expandedSkills[
                          skillId
                        ];

                      const chapters =
                        skillChapters[
                          skillId
                        ] || [];

                      return (
                        <div
                          key={
                            skillId
                          }
                          className="border border-themed rounded-xl overflow-hidden"
                        >

                          {/* =====================================
                              SKILL HEADER
                          ===================================== */}

                          <div className="p-4 flex items-center justify-between gap-3">

                            <button
                              type="button"
                              onClick={() =>
                                toggleSkill(
                                  skill
                                )
                              }
                              className="flex-1 flex items-center gap-3 text-left"
                            >

                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">

                                <Layers
                                  size={18}
                                  className="text-primary"
                                />

                              </div>

                              <div>

                                <h3
                                  className="font-semibold text-sm"
                                  style={{
                                    color:
                                      'var(--text)',
                                  }}
                                >
                                  {getSkillName(
                                    skill
                                  )}
                                </h3>

                                {skill.description && (
                                  <p className="text-xs text-muted mt-0.5">
                                    {skill.description}
                                  </p>
                                )}

                              </div>

                              {expanded ? (
                                <ChevronUp
                                  size={17}
                                  className="text-muted"
                                />
                              ) : (
                                <ChevronDown
                                  size={17}
                                  className="text-muted"
                                />
                              )}

                            </button>

                            <div className="flex items-center gap-1">

                              <button
                                type="button"
                                onClick={() =>
                                  openCreateChapter(
                                    skill
                                  )
                                }
                                className="btn-primary text-xs px-2.5 py-1.5"
                              >
                                <Plus size={14} />
                                Create Chapter
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  removeSkillFromCareer(
                                    skill
                                  )
                                }
                                disabled={
                                  savingSkills
                                }
                                className="btn-ghost p-1.5 text-red-600"
                                title="Remove skill"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>

                            </div>

                          </div>

                          {/* =====================================
                              CHAPTER AREA
                          ===================================== */}

                          {expanded && (

                            <div className="border-t border-themed bg-themed-subtle p-4">

                              {chapterLoading[
                                skillId
                              ] ? (

                                <div className="py-5 flex justify-center">

                                  <ButtonSpinner />

                                </div>

                              ) : (

                                <>
                                  <div className="flex items-center justify-between mb-3">

                                    <div className="flex items-center gap-2">

                                      <BookOpen
                                        size={16}
                                        className="text-primary"
                                      />

                                      <h4
                                        className="text-sm font-semibold"
                                        style={{
                                          color:
                                            'var(--text)',
                                        }}
                                      >
                                        Chapters
                                      </h4>

                                      <span className="text-xs text-muted">
                                        ({chapters.length})
                                      </span>

                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openCreateChapter(
                                          skill
                                        )
                                      }
                                      className="btn-secondary text-xs"
                                    >
                                      <Plus size={14} />
                                      Add Chapter
                                    </button>

                                  </div>

                                  {chapters.length === 0 ? (

                                    <div className="p-5 text-center border border-dashed border-themed rounded-lg">

                                      <BookOpen
                                        size={24}
                                        className="mx-auto mb-2 text-muted"
                                      />

                                      <p className="text-xs text-muted">
                                        No chapters linked to this skill yet.
                                      </p>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openCreateChapter(
                                            skill
                                          )
                                        }
                                        className="btn-primary text-xs mt-3"
                                      >
                                        <Plus size={14} />
                                        Create First Chapter
                                      </button>

                                    </div>

                                  ) : (

                                    <div className="space-y-2">

                                      {chapters
                                        .filter(
                                          (chapter) =>
                                            getChapterName(
                                              chapter
                                            )
                                              .toLowerCase()
                                              .includes(
                                                (
                                                  chapterSearch[
                                                    skillId
                                                  ] ||
                                                  ''
                                                ).toLowerCase()
                                              )
                                        )
                                        .map(
                                          (
                                            chapter,
                                            chapterIndex
                                          ) => (

                                            <div
                                              key={
                                                getChapterId(
                                                  chapter
                                                ) ||
                                                chapterIndex
                                              }
                                              className="p-3 rounded-lg border border-themed bg-[var(--surface)] flex items-center justify-between gap-3"
                                            >

                                              <div className="flex items-center gap-3 min-w-0">

                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">

                                                  <BookOpen
                                                    size={15}
                                                    className="text-primary"
                                                  />

                                                </div>

                                                <div className="min-w-0">

                                                  <p
                                                    className="text-sm font-medium truncate"
                                                    style={{
                                                      color:
                                                        'var(--text)',
                                                    }}
                                                  >
                                                    {getChapterName(
                                                      chapter
                                                    )}
                                                  </p>

                                                  <div className="flex items-center gap-3 mt-1">

                                                    {chapter.youtubeUrl && (
                                                      <a
                                                        href={
                                                          chapter.youtubeUrl
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs link flex items-center gap-1"
                                                      >
                                                        <Youtube
                                                          size={
                                                            12
                                                          }
                                                        />
                                                        Video
                                                      </a>
                                                    )}

                                                    {chapter.duration && (
                                                      <span className="text-xs text-muted flex items-center gap-1">
                                                        <Clock
                                                          size={
                                                            12
                                                          }
                                                        />
                                                        {
                                                          chapter.duration
                                                        }
                                                      </span>
                                                    )}

                                                  </div>

                                                </div>

                                              </div>

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  removeChapterFromSkill(
                                                    skill,
                                                    chapter
                                                  )
                                                }
                                                disabled={
                                                  availableChaptersLoading[
                                                    skillId
                                                  ]
                                                }
                                                className="btn-ghost p-1.5 text-red-600 shrink-0"
                                                title="Remove chapter"
                                              >
                                                <Trash2
                                                  size={15}
                                                />
                                              </button>

                                            </div>

                                          )
                                        )}

                                    </div>

                                  )}

                                </>
                              )}

                            </div>
                          )}

                        </div>
                      );
                    })}

                </div>
              )}

              {/* =================================================
                  CREATE SKILL PANEL
              ================================================= */}

              {showCreateSkill && (
                <div className="mt-5 p-5 rounded-xl border border-themed bg-themed-subtle">

                  <div className="flex items-center justify-between mb-5">

                    <div>

                      <h3
                        className="font-semibold"
                        style={{
                          color:
                            'var(--text)',
                        }}
                      >
                        Create New Skill
                      </h3>

                      <p className="text-xs text-muted mt-1">
                        The skill will be created and automatically added to this career.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateSkill(
                          false
                        );
                        resetSkillForm();
                      }}
                      className="btn-ghost p-1"
                    >
                      <X size={16} />
                    </button>

                  </div>

                  <div className="space-y-4">

                    <div>

                      <label className="label">
                        Skill Name
                      </label>

                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Python"
                        value={
                          skillForm.name
                        }
                        onChange={(e) =>
                          setSkillForm(
                            (previous) => ({
                              ...previous,
                              name:
                                e.target.value,
                            })
                          )
                        }
                      />

                    </div>

                    <div>

                      <label className="label">
                        Description
                      </label>

                      <textarea
                        rows={3}
                        className="input resize-none"
                        placeholder="Describe this skill..."
                        value={
                          skillForm.description
                        }
                        onChange={(e) =>
                          setSkillForm(
                            (previous) => ({
                              ...previous,
                              description:
                                e.target.value,
                            })
                          )
                        }
                      />

                    </div>

                    <label className="flex items-center gap-2">

                      <input
                        type="checkbox"
                        checked={
                          skillForm.active
                        }
                        onChange={(e) =>
                          setSkillForm(
                            (previous) => ({
                              ...previous,
                              active:
                                e.target.checked,
                            })
                          )
                        }
                      />

                      <span
                        className="text-sm"
                        style={{
                          color:
                            'var(--text)',
                        }}
                      >
                        Active
                      </span>

                    </label>

                  </div>

                  <div className="flex justify-end gap-2 mt-5">

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateSkill(
                          false
                        );
                        resetSkillForm();
                      }}
                      className="btn-secondary"
                    >
                      <X size={15} />
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={
                        createSkill
                      }
                      disabled={
                        creatingSkill
                      }
                      className="btn-primary"
                    >
                      {creatingSkill ? (
                        <ButtonSpinner />
                      ) : (
                        <>
                          <Plus size={15} />
                          Create & Add Skill
                        </>
                      )}
                    </button>

                  </div>

                </div>
              )}
                            {/* =================================================
                  ADD EXISTING SKILL / CREATE SKILL
              ================================================= */}

              <div className="mt-5 pt-5 border-t border-themed">

                <div className="flex flex-wrap items-center gap-2">

                  <button
                    type="button"
                    onClick={() => {

                      setShowAddSkill(
                        (previous) =>
                          !previous
                      );

                      setShowCreateSkill(
                        false
                      );

                      if (
                        allSkills.length ===
                        0
                      ) {
                        fetchAllSkills();
                      }

                    }}
                    className="btn-secondary"
                  >
                    <Plus size={15} />
                    Add Existing Skill
                  </button>

                  <button
                    type="button"
                    onClick={() => {

                      setShowCreateSkill(
                        (previous) =>
                          !previous
                      );

                      setShowAddSkill(
                        false
                      );

                      resetSkillForm();

                    }}
                    className="btn-primary"
                  >
                    <Plus size={15} />
                    Create New Skill
                  </button>

                </div>

              </div>

              {/* =================================================
                  EXISTING SKILL PICKER
              ================================================= */}

              {showAddSkill && (
                <div className="mt-4 p-4 rounded-xl border border-themed bg-themed-subtle">

                  <div className="flex items-center justify-between mb-4">

                    <div>

                      <h3
                        className="font-semibold text-sm"
                        style={{
                          color:
                            'var(--text)',
                        }}
                      >
                        Add Existing Skill
                      </h3>

                      <p className="text-xs text-muted mt-1">
                        Select a skill that already exists in the database.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowAddSkill(
                          false
                        )
                      }
                      className="btn-ghost p-1"
                    >
                      <X size={16} />
                    </button>

                  </div>

                  <div className="relative mb-3">

                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />

                    <input
                      type="text"
                      className="input pl-9"
                      placeholder="Search existing skills..."
                      value={
                        skillSearch
                      }
                      onChange={(e) =>
                        setSkillSearch(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  {availableSkillsLoading ? (

                    <div className="py-5 flex justify-center">

                      <ButtonSpinner />

                    </div>

                  ) : (

                    <div className="max-h-64 overflow-y-auto space-y-2">

                      {allSkills
                        .filter((skill) =>
                          getSkillName(
                            skill
                          )
                            .toLowerCase()
                            .includes(
                              skillSearch
                                .toLowerCase()
                            )
                        )
                        .map((skill) => {

                          const alreadyAdded =
                            careerSkills.some(
                              (item) =>
                                String(
                                  getSkillId(
                                    item
                                  )
                                ) ===
                                String(
                                  getSkillId(
                                    skill
                                  )
                                )
                            );

                          return (
                            <div
                              key={
                                getSkillId(
                                  skill
                                )
                              }
                              className="p-3 rounded-lg border border-themed flex items-center justify-between gap-3"
                            >

                              <div>

                                <p
                                  className="text-sm font-medium"
                                  style={{
                                    color:
                                      'var(--text)',
                                  }}
                                >
                                  {getSkillName(
                                    skill
                                  )}
                                </p>

                                {skill.description && (
                                  <p className="text-xs text-muted mt-0.5">
                                    {skill.description}
                                  </p>
                                )}

                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  addSkillToCareer(
                                    skill
                                  )
                                }
                                disabled={
                                  alreadyAdded ||
                                  savingSkills
                                }
                                className={
                                  alreadyAdded
                                    ? 'btn-secondary text-xs'
                                    : 'btn-primary text-xs'
                                }
                              >
                                {alreadyAdded
                                  ? 'Added'
                                  : 'Add'}
                              </button>

                            </div>
                          );
                        })}

                    </div>
                  )}

                </div>
              )}

            </div>

            {/* ==================================================
                CREATE CHAPTER PANELS
            ================================================== */}

            {careerSkills.map(
              (skill) => {

                const skillId =
                  getSkillId(skill);

                if (
                  !showCreateChapter[
                    skillId
                  ]
                ) {
                  return null;
                }

                const form =
                  chapterForm[
                    skillId
                  ] ||
                  createEmptyChapterForm();

                const quiz =
                  form.quiz ||
                  createEmptyChapterForm()
                    .quiz;

                return (
                  <div
                    key={`create-chapter-${skillId}`}
                    className="card p-5 mt-5"
                  >

                    {/* ========================================
                        HEADER
                    ======================================== */}

                    <div className="flex items-start justify-between mb-6">

                      <div>

                        <div className="flex items-center gap-2">

                          <BookOpen
                            size={19}
                            className="text-primary"
                          />

                          <h3
                            className="font-semibold"
                            style={{
                              color:
                                'var(--text)',
                            }}
                          >
                            Create Chapter
                          </h3>

                        </div>

                        <p className="text-xs text-muted mt-1">
                          Create a chapter for{' '}
                          <strong>
                            {getSkillName(
                              skill
                            )}
                          </strong>
                          {' '}with its quiz in the same flow.
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          closeCreateChapter(
                            skillId
                          )
                        }
                        className="btn-ghost p-1"
                      >
                        <X size={16} />
                      </button>

                    </div>

                    {/* ========================================
                        CHAPTER DETAILS
                    ======================================== */}

                    <div className="space-y-4">

                      <div>

                        <label className="label">
                          Chapter Title
                        </label>

                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Introduction to Python"
                          value={
                            form.title ||
                            ''
                          }
                          onChange={(e) =>
                            updateChapterForm(
                              skillId,
                              'title',
                              e.target.value
                            )
                          }
                        />

                      </div>

                      <div>

                        <label className="label">
                          Description
                        </label>

                        <textarea
                          rows={3}
                          className="input resize-none"
                          placeholder="Describe what the learner will learn..."
                          value={
                            form.description ||
                            ''
                          }
                          onChange={(e) =>
                            updateChapterForm(
                              skillId,
                              'description',
                              e.target.value
                            )
                          }
                        />

                      </div>

                      <div>

                        <label className="label">
                          YouTube / Video URL
                        </label>

                        <input
                          type="url"
                          className="input"
                          placeholder="https://youtube.com/watch?v=..."
                          value={
                            form.youtubeUrl ||
                            ''
                          }
                          onChange={(e) =>
                            updateChapterForm(
                              skillId,
                              'youtubeUrl',
                              e.target.value
                            )
                          }
                        />

                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div>

                          <label className="label">
                            Duration
                          </label>

                          <input
                            type="text"
                            className="input"
                            placeholder="e.g. 30 min"
                            value={
                              form.duration ||
                              ''
                            }
                            onChange={(e) =>
                              updateChapterForm(
                                skillId,
                                'duration',
                                e.target.value
                              )
                            }
                          />

                        </div>

                        <div>

                          <label className="label">
                            Order
                          </label>

                          <input
                            type="number"
                            min="0"
                            className="input"
                            value={
                              form.order ??
                              0
                            }
                            onChange={(e) =>
                              updateChapterForm(
                                skillId,
                                'order',
                                Number(
                                  e.target.value
                                )
                              )
                            }
                          />

                        </div>

                      </div>

                      <label className="flex items-center gap-2">

                        <input
                          type="checkbox"
                          checked={
                            form.active !==
                            false
                          }
                          onChange={(e) =>
                            updateChapterForm(
                              skillId,
                              'active',
                              e.target.checked
                            )
                          }
                        />

                        <span
                          className="text-sm"
                          style={{
                            color:
                              'var(--text)',
                          }}
                        >
                          Chapter Active
                        </span>

                      </label>

                    </div>

                    {/* ========================================
                        QUIZ SECTION
                    ======================================== */}

                    <div className="mt-7 pt-6 border-t border-themed">

                      <div className="flex items-start justify-between gap-4 mb-5">

                        <div>

                          <div className="flex items-center gap-2">

                            <CircleHelp
                              size={19}
                              className="text-primary"
                            />

                            <h4
                              className="font-semibold"
                              style={{
                                color:
                                  'var(--text)',
                              }}
                            >
                              Chapter Quiz
                            </h4>

                          </div>

                          <p className="text-xs text-muted mt-1">
                            Configure the quiz that unlocks after the required video watch percentage.
                          </p>

                        </div>

                        <label className="flex items-center gap-2 shrink-0">

                          <input
                            type="checkbox"
                            checked={
                              quiz.active !==
                              false
                            }
                            onChange={(e) =>
                              updateQuizForm(
                                skillId,
                                'active',
                                e.target.checked
                              )
                            }
                          />

                          <span className="text-xs">
                            Enable Quiz
                          </span>

                        </label>

                      </div>

                      {quiz.active !==
                        false && (

                        <>

                          {/* ==================================
                              QUIZ SETTINGS
                          ================================== */}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                            <div className="md:col-span-3">

                              <label className="label">
                                Quiz Title
                              </label>

                              <input
                                type="text"
                                className="input"
                                placeholder="e.g. Python Basics Quiz"
                                value={
                                  quiz.title ||
                                  ''
                                }
                                onChange={(e) =>
                                  updateQuizForm(
                                    skillId,
                                    'title',
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                            <div>

                              <label className="label">
                                Pass Score (%)
                              </label>

                              <input
                                type="number"
                                min="70"
                                max="100"
                                className="input"
                                value={
                                  quiz.passScore ??
                                  70
                                }
                                onChange={(e) =>
                                  updateQuizForm(
                                    skillId,
                                    'passScore',
                                    Number(
                                      e.target.value
                                    )
                                  )
                                }
                              />

                              <p className="text-xs text-muted mt-1">
                                Allowed: 70–100%
                              </p>

                            </div>

                            <div>

                              <label className="label">
                                Required Video Watch (%)
                              </label>

                              <input
                                type="number"
                                min="98"
                                max="100"
                                className="input"
                                value={
                                  quiz.requiredWatchPercentage ??
                                  98
                                }
                                onChange={(e) =>
                                  updateQuizForm(
                                    skillId,
                                    'requiredWatchPercentage',
                                    Number(
                                      e.target.value
                                    )
                                  )
                                }
                              />

                              <p className="text-xs text-muted mt-1">
                                Allowed: 98–100%
                              </p>

                            </div>

                          </div>

                          {/* ==================================
                              QUESTIONS
                          ================================== */}

                          <div className="space-y-4">

                            {(quiz.questions ||
                              []).map(
                                (
                                  question,
                                  questionIndex
                                ) => (

                                  <div
                                    key={
                                      question.id ||
                                      questionIndex
                                    }
                                    className="p-4 rounded-xl border border-themed"
                                  >

                                    <div className="flex items-center justify-between mb-4">

                                      <p
                                        className="text-sm font-semibold"
                                        style={{
                                          color:
                                            'var(--text)',
                                        }}
                                      >
                                        Question{' '}
                                        {questionIndex +
                                          1}
                                      </p>

                                      {(quiz.questions ||
                                        []).length >
                                        1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeQuizQuestion(
                                              skillId,
                                              questionIndex
                                            )
                                          }
                                          className="btn-ghost p-1.5 text-red-600"
                                          title="Remove question"
                                        >
                                          <Trash2
                                            size={
                                              14
                                            }
                                          />
                                        </button>
                                      )}

                                    </div>

                                    <div className="mb-4">

                                      <label className="label">
                                        Question
                                      </label>

                                      <textarea
                                        rows={2}
                                        className="input resize-none"
                                        placeholder="Enter the question..."
                                        value={
                                          question.question ||
                                          ''
                                        }
                                        onChange={(e) =>
                                          updateQuizQuestion(
                                            skillId,
                                            questionIndex,
                                            'question',
                                            e.target.value
                                          )
                                        }
                                      />

                                    </div>

                                    {/* OPTIONS */}

                                    <div className="space-y-2">

                                      <label className="label">
                                        Options
                                      </label>

                                      {(
                                        question.options ||
                                        [
                                          '',
                                          '',
                                          '',
                                          '',
                                        ]
                                      ).map(
                                        (
                                          option,
                                          optionIndex
                                        ) => {

                                          const isCorrect =
                                            Number(
                                              question.correctOption
                                            ) ===
                                            optionIndex;

                                          return (
                                            <div
                                              key={
                                                optionIndex
                                              }
                                              className="flex items-center gap-2"
                                            >

                                              <input
                                                type="radio"
                                                name={`correct-${skillId}-${questionIndex}`}
                                                checked={
                                                  isCorrect
                                                }
                                                onChange={() =>
                                                  updateQuizQuestion(
                                                    skillId,
                                                    questionIndex,
                                                    'correctOption',
                                                    optionIndex
                                                  )
                                                }
                                                className="cursor-pointer"
                                              />

                                              <input
                                                type="text"
                                                className="input flex-1"
                                                placeholder={`Option ${String.fromCharCode(
                                                  65 +
                                                    optionIndex
                                                )}`}
                                                value={
                                                  option ||
                                                  ''
                                                }
                                                onChange={(e) =>
                                                  updateQuizOption(
                                                    skillId,
                                                    questionIndex,
                                                    optionIndex,
                                                    e.target.value
                                                  )
                                                }
                                              />

                                              {isCorrect && (
                                                <span className="text-xs text-green-600 font-semibold flex items-center gap-1 whitespace-nowrap">

                                                  <CheckCircle
                                                    size={
                                                      13
                                                    }
                                                  />

                                                  Correct

                                                </span>
                                              )}

                                            </div>
                                          );
                                        }
                                      )}

                                    </div>

                                    {/* EXPLANATION */}

                                    <div className="mt-4">

                                      <label className="label">

                                        Explanation

                                        <span className="text-muted font-normal ml-1">
                                          (optional)
                                        </span>

                                      </label>

                                      <textarea
                                        rows={2}
                                        className="input resize-none"
                                        placeholder="Explain why the correct answer is right..."
                                        value={
                                          question.explanation ||
                                          ''
                                        }
                                        onChange={(e) =>
                                          updateQuizQuestion(
                                            skillId,
                                            questionIndex,
                                            'explanation',
                                            e.target.value
                                          )
                                        }
                                      />

                                    </div>

                                  </div>

                                )
                              )}

                          </div>

                          {/* ==================================
                              ADD QUESTION
                          ================================== */}

                          <button
                            type="button"
                            onClick={() =>
                              addQuizQuestion(
                                skillId
                              )
                            }
                            className="btn-secondary text-xs mt-4"
                          >
                            <Plus size={14} />
                            Add Question
                          </button>

                        </>
                      )}

                    </div>

                    {/* ========================================
                        CREATE CHAPTER ACTIONS
                    ======================================== */}

                    <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-themed">

                      <button
                        type="button"
                        onClick={() =>
                          closeCreateChapter(
                            skillId
                          )
                        }
                        className="btn-secondary"
                      >
                        <X size={15} />
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          createChapter(
                            skill
                          )
                        }
                        disabled={
                          creatingChapter[
                            skillId
                          ]
                        }
                        className="btn-primary"
                      >
                        {creatingChapter[
                          skillId
                        ] ? (
                          <ButtonSpinner />
                        ) : (
                          <>
                            <Save size={15} />
                            Create Chapter
                          </>
                        )}
                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </>
        )}

      </div>
    );
  }

  // ==========================================================
  // CAREER LIST PAGE
  // ==========================================================

  return (
    <div className="animate-fade-in">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="flex items-center justify-between mb-6">

        <div>

          <div className="flex items-center gap-2">

            <Briefcase
              size={24}
              className="text-primary"
            />

            <h1
              className="text-2xl font-heading font-bold"
              style={{
                color: 'var(--text)',
              }}
            >
              Career Management
            </h1>

          </div>

          <p className="text-sm text-muted mt-1">
            Create careers and manage their complete skill curriculum.
          </p>

        </div>

        <button
          type="button"
          onClick={() => {

            resetCareerForm();

            setShowCreateCareer(
              (previous) =>
                !previous
            );

          }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Career
        </button>

      </div>

      {/* ====================================================
          CREATE CAREER
      ==================================================== */}

      {showCreateCareer && (
        <div className="card p-5 mb-5">

          <div className="flex items-center justify-between mb-5">

            <div>

              <h2
                className="font-semibold"
                style={{
                  color:
                    'var(--text)',
                }}
              >
                Create New Career
              </h2>

              <p className="text-xs text-muted mt-1">
                Add a career that can later contain skills and chapters.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowCreateCareer(
                  false
                )
              }
              className="btn-ghost p-1"
            >
              <X size={16} />
            </button>

          </div>

          <div className="space-y-4">

            <div>

              <label className="label">
                Career Name
              </label>

              <input
                type="text"
                className="input"
                placeholder="e.g. Data Scientist"
                value={
                  careerForm.name
                }
                onChange={(e) =>
                  setCareerForm(
                    (previous) => ({
                      ...previous,
                      name:
                        e.target.value,
                    })
                  )
                }
              />

            </div>

            <div>

              <label className="label">
                Description
              </label>

              <textarea
                rows={3}
                className="input resize-none"
                placeholder="Describe the career..."
                value={
                  careerForm.description
                }
                onChange={(e) =>
                  setCareerForm(
                    (previous) => ({
                      ...previous,
                      description:
                        e.target.value,
                    })
                  )
                }
              />

            </div>

            <label className="flex items-center gap-2">

              <input
                type="checkbox"
                checked={
                  careerForm.active
                }
                onChange={(e) =>
                  setCareerForm(
                    (previous) => ({
                      ...previous,
                      active:
                        e.target.checked,
                    })
                  )
                }
              />

              <span
                className="text-sm"
                style={{
                  color:
                    'var(--text)',
                }}
              >
                Active
              </span>

            </label>

          </div>

          <div className="flex justify-end gap-2 mt-5">

            <button
              type="button"
              onClick={() =>
                setShowCreateCareer(
                  false
                )
              }
              className="btn-secondary"
            >
              <X size={15} />
              Cancel
            </button>

            <button
              type="button"
              onClick={
                createCareer
              }
              disabled={
                creatingCareer
              }
              className="btn-primary"
            >
              {creatingCareer ? (
                <ButtonSpinner />
              ) : (
                <>
                  <Plus size={15} />
                  Create Career
                </>
              )}
            </button>

          </div>

        </div>
      )}

      {/* ====================================================
          SEARCH
      ==================================================== */}

      <div className="relative mb-5">

        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />

        <input
          type="text"
          className="input pl-10"
          placeholder="Search careers..."
          value={
            search
          }
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

      </div>

      {/* ====================================================
          CAREER LIST
      ==================================================== */}

      {careers.length === 0 ? (

        <EmptyState
          icon={Briefcase}
          title="No careers found"
          message="Create your first career to start building its curriculum."
        />

      ) : (

        <div className="space-y-3">

          {careers.map(
            (career) => (

              <div
                key={
                  getCareerId(
                    career
                  )
                }
                className="card p-4 flex items-center justify-between gap-4"
              >

                <div className="flex items-center gap-3 min-w-0">

                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">

                    <Briefcase
                      size={19}
                      className="text-primary"
                    />

                  </div>

                  <div className="min-w-0">

                    <div className="flex items-center gap-2">

                      <h3
                        className="text-sm font-semibold truncate"
                        style={{
                          color:
                            'var(--text)',
                        }}
                      >
                        {getCareerName(
                          career
                        )}
                      </h3>

                      {career.active ===
                        false && (
                        <span className="badge-error">
                          Inactive
                        </span>
                      )}

                    </div>

                    {career.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">
                        {
                          career.description
                        }
                      </p>
                    )}

                  </div>

                </div>

                <div className="flex items-center gap-1 shrink-0">

                  <button
                    type="button"
                    onClick={() =>
                      openCareerOverview(
                        career
                      )
                    }
                    className="btn-primary text-xs"
                  >
                    <Layers
                      size={14}
                    />
                    Manage Curriculum
                  </button>

                  <button
                    type="button"
                    onClick={() => {

                      setSelectedCareer(
                        career
                      );

                      setCareerForm({
                        name:
                          career.name ||
                          career.title ||
                          '',
                        description:
                          career.description ||
                          '',
                        active:
                          career.active !==
                          false,
                      });

                      setShowEditCareer(
                        true
                      );

                      openCareerOverview(
                        career
                      );

                    }}
                    className="btn-ghost p-1.5"
                    title="Edit career"
                  >
                    <Edit
                      size={16}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteCareer(
                        career
                      )
                    }
                    className="btn-ghost p-1.5 text-red-600"
                    title="Delete career"
                  >
                    <Trash2
                      size={16}
                    />
                  </button>

                </div>

              </div>

            )
          )}

        </div>
      )}

    </div>
  );
}