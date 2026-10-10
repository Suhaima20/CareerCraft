import { useEffect, useMemo, useState } from 'react';
import {
  Search, Briefcase, Plus, Edit3, Trash2, Save, X, ArrowLeft,
  ArrowRight, Check, BookOpen, Layers, Video, ClipboardList,
  ChevronDown, ChevronUp, Eye, EyeOff, CircleCheck, AlertCircle,
} from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { FullPageSpinner, ButtonSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import { useDebounce } from '@/hooks/useHooks';

const STEPS = [
  { label: 'Career details', icon: Briefcase },
  { label: 'Skills', icon: Layers },
  { label: 'Chapters & videos', icon: Video },
  { label: 'Quizzes', icon: ClipboardList },
  { label: 'Review & publish', icon: Check },
];
const newSkill = () => ({ name: '', description: '' });
const newChapter = () => ({ title: '', description: '', youtubeUrl: '', duration: '' });
const newQuestion = () => ({ question: '', options: ['', '', '', ''], correctOption: 0, explanation: '' });
const idOf = (item) => {
  if (item === null || item === undefined) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (typeof item !== 'object') return '';
  const value = item._id ?? item.id ?? item.skillId ?? item.skill_id ?? item.chapterId ?? item.chapter_id ?? item.$oid;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.$oid ? String(value.$oid) : '';
  return String(value);
};
const errorText = (err, fallback) => err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback;

export default function AdminCareers() {
  const toast = useToast();
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [career, setCareer] = useState(null);
  const [careerForm, setCareerForm] = useState({ name: '', description: '' });
  const [skills, setSkills] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [loadingAvailableSkills, setLoadingAvailableSkills] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [skillForm, setSkillForm] = useState(newSkill());
  const [chapterForm, setChapterForm] = useState(newChapter());
  const [quizForm, setQuizForm] = useState({ title: '', passScore: 70, requiredWatchPercentage: 98, active: true, questions: [] });
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [quizLoading, setQuizLoading] = useState(false);
  const [expandedSkills, setExpandedSkills] = useState({});

  const refreshCareers = async () => {
    setLoading(true); setError('');
    try {
      const res = await adminAPI.listCareers({ q: debouncedSearch });
      setCareers(res.data?.careers || []);
    } catch (err) { setError(errorText(err, 'Failed to load careers.')); }
    finally { setLoading(false); }
  };
  useEffect(() => { refreshCareers(); }, [debouncedSearch]);

  const allChapters = useMemo(() => skills.flatMap((s) => (s.chapters || []).map((c) => ({ ...c, _skillId: s._id, _skillName: s.name }))), [skills]);
  const selectedSkill = skills.find((s) => idOf(s) === String(selectedSkillId));
  const selectedChapter = allChapters.find((c) => idOf(c) === String(selectedChapterId));
  const counts = useMemo(() => ({ skills: skills.length, chapters: allChapters.length, quizzes: allChapters.filter((c) => c.quiz && (c.quiz.questions || []).length).length, questions: allChapters.reduce((n, c) => n + (c.quiz?.questions?.length || 0), 0) }), [skills, allChapters]);

  const loadAvailableSkills = async () => {
    setLoadingAvailableSkills(true);
    try {
      const res = await adminAPI.listSkills({ q: '' });
      const list = Array.isArray(res.data?.skills) ? res.data.skills : Array.isArray(res.data) ? res.data : [];
      setAvailableSkills(list);
      return list;
    } catch (err) {
      console.error('[AdminCareers] Failed to load available skills:', err);
      toast.error(errorText(err, 'Could not load existing skills from MongoDB.'));
      return [];
    } finally {
      setLoadingAvailableSkills(false);
    }
  };

  const resetWizard = () => {
    loadAvailableSkills();
    setStep(0); setCareer(null); setCareerForm({ name: '', description: '' });
    setSkills([]); setSelectedSkillId(''); setSkillForm(newSkill()); setChapterForm(newChapter());
    setSelectedChapterId(''); setQuizForm({ title: '', passScore: 70, requiredWatchPercentage: 98, active: true, questions: [] });
    setExpandedSkills({}); setWizardOpen(true);
  };

  const loadCareerWizard = async (item) => {
    setBusy(true);
    try {
      const careerId = idOf(item);
      if (!careerId) throw new Error('This career does not have a valid ID.');
      const [skillsRes, allSkillsRes, allChaptersRes] = await Promise.all([
        adminAPI.getCareerSkills(careerId),
        adminAPI.listSkills({ q: '' }),
        adminAPI.listChapters({ q: '' }),
      ]);
      const masterSkills = Array.isArray(allSkillsRes.data?.skills) ? allSkillsRes.data.skills : Array.isArray(allSkillsRes.data) ? allSkillsRes.data : [];
      const masterChapters = Array.isArray(allChaptersRes.data?.chapters) ? allChaptersRes.data.chapters : Array.isArray(allChaptersRes.data) ? allChaptersRes.data : [];
      setAvailableSkills(masterSkills);
      const rawSkills = skillsRes.data?.skills || skillsRes.data?.skillIds || [];
      const loadedSkills = [];
      for (const raw of rawSkills) {
        let skill = typeof raw === 'object' ? raw : null;
        if (!skill?._id) {
          skill = masterSkills.find((x) => idOf(x) === String(raw));
        }
        if (!skill?._id) continue;
        const chapterRes = await adminAPI.getSkillChapters(idOf(skill));
        const rawChapters = chapterRes.data?.chapters || chapterRes.data?.chapterIds || [];
        const chapters = [];
        for (const rawChapter of rawChapters) {
          let chapter = typeof rawChapter === 'object' ? rawChapter : null;
          if (!chapter?._id) {
            chapter = masterChapters.find((x) => idOf(x) === String(rawChapter));
          }
          if (!chapter?._id) continue;
          try {
            const quizRes = await adminAPI.getChapterQuiz(idOf(chapter));
            chapter = { ...chapter, quiz: quizRes.data?.quiz || null };
          } catch { chapter = { ...chapter, quiz: null }; }
          chapters.push(chapter);
        }
        loadedSkills.push({ ...skill, chapters });
      }
      setCareer(item); setCareerForm({ name: item.name || '', description: item.description || '' });
      setSkills(loadedSkills); setSelectedSkillId(loadedSkills[0] ? idOf(loadedSkills[0]) : '');
      const firstChapter = loadedSkills.flatMap((s) => s.chapters || [])[0];
      setSelectedChapterId(firstChapter ? idOf(firstChapter) : '');
      if (firstChapter?.quiz) setQuizForm({ title: firstChapter.quiz.title || '', passScore: firstChapter.quiz.passScore ?? 70, requiredWatchPercentage: firstChapter.quiz.requiredWatchPercentage ?? 98, active: firstChapter.quiz.active !== false, questions: firstChapter.quiz.questions || [] });
      setStep(1); setWizardOpen(true);
    } catch (err) { toast.error(errorText(err, 'Could not reopen this career draft.')); }
    finally { setBusy(false); }
  };

  const saveCareerDetails = async () => {
    const name = careerForm.name.trim(); const description = careerForm.description.trim();
    if (!name || !description) { toast.error('Career name and description are required.'); return; }
    setBusy(true);
    try {
      if (!career) {
        const res = await adminAPI.createCareer({ name, description, active: false, status: 'draft' });
        const created = res.data?.career || res.data?.data || res.data;
        if (!created?._id) throw new Error('Career was created but the server did not return its MongoDB ID.');
        setCareer(created); toast.success('Career draft created. Continue adding skills.');
      } else {
        await adminAPI.updateCareer(idOf(career), { name, description, active: false, status: 'draft' });
        setCareer((old) => ({ ...old, name, description, active: false, status: 'draft' }));
        toast.success('Career details saved.');
      }
      setStep(1); await refreshCareers();
    } catch (err) { toast.error(errorText(err, 'Could not save career details.')); }
    finally { setBusy(false); }
  };

  const addExistingSkill = async (skillId) => {
    const careerId = idOf(career);
    const existingSkill = availableSkills.find((item) => idOf(item) === String(skillId));

    if (!careerId) {
      toast.error('Save career details first.');
      return;
    }
    if (!existingSkill || !idOf(existingSkill)) {
      toast.error('Could not find that skill in the skills collection. Refresh and try again.');
      return;
    }
    if (skills.some((item) => idOf(item) === idOf(existingSkill))) {
      toast.info('This skill is already assigned to this career.');
      return;
    }

    setBusy(true);
    try {
      const nextSkills = [...skills, { ...existingSkill, chapters: [] }];
      const skillIds = nextSkills.map(idOf).filter(Boolean);
      const mappingRes = await adminAPI.setCareerSkills(careerId, skillIds);
      const reportedCount = mappingRes?.data?.mapped;
      if (reportedCount !== undefined && Number(reportedCount) !== skillIds.length) {
        throw new Error(`Skill mapping incomplete. Expected ${skillIds.length} skills, but the server reported ${reportedCount}.`);
      }
      setSkills(nextSkills);
      setSelectedSkillId(idOf(existingSkill));
      toast.success(`Existing skill "${existingSkill.name || existingSkill.title || 'Skill'}" assigned to this career.`);
    } catch (err) {
      console.error('[AdminCareers] Failed to assign existing skill:', err);
      toast.error(errorText(err, 'Could not assign the existing skill.'));
    } finally {
      setBusy(false);
    }
  };

  const addSkill = async () => {
    if (!career?._id) { toast.error('Save career details first.'); return; }
    if (!skillForm.name.trim()) { toast.error('Skill name is required.'); return; }
    setBusy(true);
    try {
      const res = await adminAPI.createSkill({ name: skillForm.name.trim(), description: skillForm.description.trim(), active: true });
      const skill = res.data?.skill || res.data?.data || res.data;
      if (!skill?._id) throw new Error('Skill created without a returned ID.');
      const nextSkills = [...skills, { ...skill, chapters: [] }];
      await adminAPI.setCareerSkills(idOf(career), nextSkills.map(idOf));
      setSkills(nextSkills); setSelectedSkillId(idOf(skill)); setSkillForm(newSkill());
      setAvailableSkills((previous) => previous.some((item) => idOf(item) === idOf(skill)) ? previous : [...previous, skill]);
      toast.success('Skill created and linked to this career.');
    } catch (err) { toast.error(errorText(err, 'Could not add skill.')); }
    finally { setBusy(false); }
  };

  const addChapter = async () => {
    if (!selectedSkill) { toast.error('Select a skill first.'); return; }
    if (!chapterForm.title.trim()) { toast.error('Chapter title is required.'); return; }
    if (chapterForm.youtubeUrl.trim() && !/^https?:\/\//i.test(chapterForm.youtubeUrl.trim())) { toast.error('Enter a valid YouTube URL starting with http:// or https://.'); return; }
    setBusy(true);
    try {
      const existing = selectedSkill.chapters || [];
      const res = await adminAPI.createChapter({ title: chapterForm.title.trim(), description: chapterForm.description.trim(), youtubeUrl: chapterForm.youtubeUrl.trim(), duration: chapterForm.duration.trim(), order: existing.length + 1, active: true });
      const chapter = res.data?.chapter || res.data?.data || res.data;
      if (!chapter?._id) throw new Error('Chapter created without a returned ID.');
      const nextChapters = [...existing, { ...chapter, quiz: null }];
      await adminAPI.setSkillChapters(idOf(selectedSkill), nextChapters.map(idOf));
      setSkills((prev) => prev.map((s) => idOf(s) === idOf(selectedSkill) ? { ...s, chapters: nextChapters } : s));
      setSelectedChapterId(idOf(chapter)); setQuizForm({ title: `${chapter.title} Quiz`, passScore: 70, requiredWatchPercentage: 98, active: true, questions: [] });
      setChapterForm(newChapter()); toast.success('Chapter saved and linked to the skill.');
    } catch (err) { toast.error(errorText(err, 'Could not add chapter.')); }
    finally { setBusy(false); }
  };

  const loadQuizForChapter = async (chapterId) => {
    setSelectedChapterId(chapterId); setQuizLoading(true);
    try {
      const res = await adminAPI.getChapterQuiz(chapterId); const quiz = res.data?.quiz || {};
      setQuizForm({ title: quiz.title || '', passScore: quiz.passScore ?? 70, requiredWatchPercentage: quiz.requiredWatchPercentage ?? 98, active: quiz.active !== false, questions: (quiz.questions || []).map((q) => ({ question: q.question || q.text || '', options: Array.isArray(q.options) ? [...q.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''], correctOption: Number(q.correctOption || 0), explanation: q.explanation || '' })) });
    } catch (err) { toast.error(errorText(err, 'Could not load quiz.')); }
    finally { setQuizLoading(false); }
  };

  const saveQuiz = async () => {
    if (!selectedChapter) { toast.error('Select a chapter first.'); return; }
    for (let i = 0; i < quizForm.questions.length; i++) {
      const q = quizForm.questions[i];
      if (!q.question.trim()) { toast.error(`Question ${i + 1} needs question text.`); return; }
      if (q.options.length !== 4 || q.options.some((o) => !String(o).trim())) { toast.error(`Question ${i + 1} must have four non-empty options.`); return; }
    }
    if (quizForm.questions.length === 0) { toast.error('Add at least one question before saving a quiz.'); return; }
    setBusy(true);
    try {
      const payload = { title: quizForm.title.trim() || `${selectedChapter.title} Quiz`, passScore: Number(quizForm.passScore), requiredWatchPercentage: Number(quizForm.requiredWatchPercentage), active: Boolean(quizForm.active), questions: quizForm.questions.map((q) => ({ question: q.question.trim(), options: q.options.map((o) => String(o).trim()), correctOption: Number(q.correctOption), explanation: q.explanation.trim() })) };
      await adminAPI.updateChapterQuiz(idOf(selectedChapter), payload);
      setSkills((prev) => prev.map((s) => ({ ...s, chapters: (s.chapters || []).map((c) => idOf(c) === idOf(selectedChapter) ? { ...c, quiz: payload } : c) })));
      toast.success('Quiz saved. Correct answers are evaluated by the backend after submission.');
    } catch (err) { toast.error(errorText(err, 'Could not save quiz.')); }
    finally { setBusy(false); }
  };

  const publishCareer = async (publish) => {
    if (!career?._id) return;
    if (publish && skills.length === 0) { toast.error('Add at least one skill before publishing.'); return; }
    if (publish && skills.some((s) => !(s.chapters || []).length)) { toast.error('Every skill needs at least one chapter before publishing.'); return; }
    setBusy(true);
    try {
      await adminAPI.updateCareer(idOf(career), { name: careerForm.name.trim(), description: careerForm.description.trim(), active: publish, status: publish ? 'published' : 'draft' });
      setCareer((old) => ({ ...old, active: publish, status: publish ? 'published' : 'draft' }));
      toast.success(publish ? 'Career published.' : 'Career saved as draft.');
      setWizardOpen(false); await refreshCareers();
    } catch (err) { toast.error(errorText(err, 'Could not update career status.')); }
    finally { setBusy(false); }
  };

  const deleteCareer = async (item) => {
    if (!window.confirm(`Delete career “${item.name}”? This may affect curriculum links. Prefer saving as draft if you are unsure.`)) return;
    try { await adminAPI.deleteCareer(idOf(item)); toast.success('Career deleted.'); await refreshCareers(); }
    catch (err) { toast.error(errorText(err, 'Could not delete career.')); }
  };

  if (loading && careers.length === 0 && !wizardOpen) return <FullPageSpinner label="Loading careers..." />;
  if (error && !wizardOpen) return <ErrorState message={error} onRetry={refreshCareers} />;

  if (wizardOpen) {
    const StepIcon = STEPS[step].icon;
    return <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><button className="btn-ghost mb-2 flex items-center gap-2 text-sm" onClick={() => { setWizardOpen(false); refreshCareers(); }}><ArrowLeft size={16}/> Back to Careers</button><h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text)' }}>{career ? `Curriculum: ${career.name}` : 'Create a Career'}</h1><p className="mt-1 text-sm opacity-70">Build a career, connect skills, add video chapters, and configure chapter quizzes.</p></div>
        {career && <span className={`badge ${career.active ? 'badge-success' : 'badge-warning'}`}>{career.active ? 'Published' : 'Draft'}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">{STEPS.map((s, i) => { const Icon = s.icon; return <button key={s.label} onClick={() => i === 0 || career ? setStep(i) : toast.info('Save career details first.')} className="rounded-xl border p-3 text-left transition" style={{ borderColor: step === i ? 'var(--primary)' : 'var(--border, rgba(128,128,128,.25))', background: step === i ? 'var(--primary-soft, rgba(99,102,241,.1))' : 'var(--card)' }}><div className="flex items-center gap-2"><Icon size={16}/><span className="text-xs font-semibold">Step {i + 1}</span></div><div className="mt-2 text-sm font-medium">{s.label}</div>{i < step && <div className="mt-1 text-xs opacity-70">Completed / saved</div>}</button>; })}</div>
      <section className="card rounded-2xl p-5 md:p-7">
        {step === 0 && <div className="mx-auto max-w-2xl space-y-5"><div><h2 className="text-xl font-semibold">Career details</h2><p className="mt-1 text-sm opacity-70">A draft is created first so you can safely build the curriculum before students see it.</p></div><label className="block text-sm font-medium">Career name <span className="text-red-500">*</span><input className="input mt-2 w-full" value={careerForm.name} onChange={(e) => setCareerForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Data Analyst" required /></label><label className="block text-sm font-medium">Description <span className="text-red-500">*</span><textarea className="input mt-2 min-h-32 w-full" value={careerForm.description} onChange={(e) => setCareerForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe this career path and what learners will build." required /></label><div className="rounded-xl p-4 text-sm" style={{ background: 'var(--primary-soft, rgba(99,102,241,.08))' }}><div className="flex items-start gap-2"><AlertCircle size={17} className="mt-0.5 shrink-0"/><p>MongoDB generates the career ID automatically. Skills, chapters, and quizzes will be linked to the saved records.</p></div></div><div className="flex justify-end"><button className="btn-primary inline-flex items-center gap-2" onClick={saveCareerDetails} disabled={busy}>{busy ? <ButtonSpinner/> : <Save size={16}/>} {career ? 'Save & Continue' : 'Create Draft & Continue'} <ArrowRight size={16}/></button></div></div>}

        {step === 1 && <div className="space-y-6">
          <div><h2 className="text-xl font-semibold">Add skills in learning order</h2><p className="mt-1 text-sm opacity-70">Assign skills already stored in MongoDB or create a new skill. Only skills assigned to this career will appear in its learning path.</p></div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border, rgba(128,128,128,.25))' }}>
              <h3 className="font-semibold">Existing Skills</h3><p className="mb-4 mt-1 text-sm opacity-70">Choose a skill that already exists in MongoDB.</p>
              <select className="input w-full" value="" disabled={busy || loadingAvailableSkills} onChange={(e) => { const value = e.target.value; if (value) addExistingSkill(value); }}>
                <option value="">{loadingAvailableSkills ? 'Loading skills…' : 'Select an existing skill…'}</option>
                {availableSkills.filter((item) => idOf(item) && !skills.some((assigned) => idOf(assigned) === idOf(item))).map((item) => <option key={idOf(item)} value={idOf(item)}>{item.name || item.title || item.skill_name || 'Unnamed skill'}{item.description ? ` — ${item.description}` : ''}</option>)}
              </select>
              {!loadingAvailableSkills && availableSkills.length === 0 && <p className="mt-3 text-sm text-amber-600">No skills were returned by the skills API. Check the admin skills endpoint and browser Network tab.</p>}
              {!loadingAvailableSkills && availableSkills.length > 0 && availableSkills.every((item) => skills.some((assigned) => idOf(assigned) === idOf(item))) && <p className="mt-3 text-sm opacity-60">All available skills are already assigned to this career.</p>}
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border, rgba(128,128,128,.25))' }}>
              <h3 className="mb-4 font-semibold">Create a New Skill</h3>
              <label className="block text-sm font-medium">Skill name <span className="text-red-500">*</span><input className="input mt-2 w-full" value={skillForm.name} onChange={(e) => setSkillForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Python for AI Engineering" /></label>
              <label className="mt-4 block text-sm font-medium">Description (optional)<textarea className="input mt-2 min-h-24 w-full" value={skillForm.description} onChange={(e) => setSkillForm((p) => ({ ...p, description: e.target.value }))} placeholder="What will the learner learn?" /></label>
              <button className="btn-primary mt-4 inline-flex items-center gap-2" onClick={addSkill} disabled={busy}>{busy ? <ButtonSpinner/> : <Plus size={16}/>} Create and Assign Skill</button>
            </div>
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border, rgba(128,128,128,.25))' }}><h3 className="mb-3 font-semibold">Skills assigned to this career ({skills.length})</h3>
            {skills.length === 0 ? <p className="text-sm opacity-60">No skills assigned yet. Select an existing skill or create one.</p> : <ol className="space-y-2">{skills.map((s, i) => <li key={idOf(s)} className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'var(--surface, rgba(128,128,128,.06))' }}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'var(--primary-soft, rgba(99,102,241,.12))' }}>{i + 1}</span><button className="min-w-0 flex-1 text-left" onClick={() => setSelectedSkillId(idOf(s))}><span className="block truncate text-sm font-medium">{s.name || s.title || 'Unnamed skill'}</span><span className="text-xs opacity-60">{(s.chapters || []).length} chapters</span></button>{idOf(s) === String(selectedSkillId) && <Check size={16}/>}</li>)}</ol>}
          </div>
          <div className="flex justify-between"><button className="btn-ghost" onClick={() => setStep(0)}>Back</button><button className="btn-primary inline-flex items-center gap-2" onClick={() => { if (!skills.length) { toast.error('Assign at least one skill to this career.'); return; } setStep(2); setSelectedSkillId((v) => v || idOf(skills[0])); }}>Continue to Chapters <ArrowRight size={16}/></button></div>
        </div>}

        {step === 2 && <div className="space-y-6"><div><h2 className="text-xl font-semibold">Chapters and YouTube videos</h2><p className="mt-1 text-sm opacity-70">Select a skill, then add chapters. Chapters are numbered in the order they are added.</p></div><label className="block max-w-xl text-sm font-medium">Skill<select className="input mt-2 w-full" value={selectedSkillId} onChange={(e) => setSelectedSkillId(e.target.value)}><option value="">Select skill</option>{skills.map((s) => <option key={idOf(s)} value={idOf(s)}>{s.name}</option>)}</select></label>{selectedSkill ? <div className="grid gap-6 lg:grid-cols-2"><div className="space-y-4 rounded-xl border p-4" style={{ borderColor: 'var(--border, rgba(128,128,128,.25))' }}><h3 className="font-semibold">Add chapter to {selectedSkill.name}</h3><label className="block text-sm font-medium">Chapter title <span className="text-red-500">*</span><input className="input mt-2 w-full" value={chapterForm.title} onChange={(e) => setChapterForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Introduction to Python" /></label><label className="block text-sm font-medium">Description<textarea className="input mt-2 min-h-20 w-full" value={chapterForm.description} onChange={(e) => setChapterForm((p) => ({ ...p, description: e.target.value }))} placeholder="Topics covered in this chapter" /></label><label className="block text-sm font-medium">YouTube URL<input className="input mt-2 w-full" value={chapterForm.youtubeUrl} onChange={(e) => setChapterForm((p) => ({ ...p, youtubeUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." /></label><label className="block text-sm font-medium">Duration (optional)<input className="input mt-2 w-full" value={chapterForm.duration} onChange={(e) => setChapterForm((p) => ({ ...p, duration: e.target.value }))} placeholder="e.g. 18:45" /></label><button className="btn-primary inline-flex items-center gap-2" onClick={addChapter} disabled={busy}>{busy ? <ButtonSpinner/> : <Plus size={16}/>} Add Chapter</button></div><div><h3 className="mb-3 font-semibold">{selectedSkill.name} chapters ({(selectedSkill.chapters || []).length})</h3>{!(selectedSkill.chapters || []).length ? <div className="rounded-xl border border-dashed p-6 text-sm opacity-60">No chapters added yet.</div> : <ol className="space-y-2">{selectedSkill.chapters.map((c, i) => <li key={idOf(c)}><button onClick={() => { setSelectedChapterId(idOf(c)); setStep(3); loadQuizForChapter(idOf(c)); }} className="flex w-full items-center gap-3 rounded-xl border p-3 text-left" style={{ borderColor: 'var(--border, rgba(128,128,128,.25))' }}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--primary-soft, rgba(99,102,241,.1))' }}>{i + 1}</span><span className="min-w-0 flex-1"><span className="block font-medium">{c.title}</span><span className="block truncate text-xs opacity-60">{c.youtubeUrl || 'No video URL added'}</span></span>{c.quiz?.questions?.length ? <CircleCheck size={16}/> : <ChevronDown size={16}/>}</button></li>)}</ol>}</div></div> : <p className="text-sm opacity-60">Add a skill in the previous step first.</p>}<div className="flex justify-between"><button className="btn-ghost" onClick={() => setStep(1)}>Back</button><button className="btn-primary inline-flex items-center gap-2" onClick={() => { if (!allChapters.length) { toast.error('Add at least one chapter.'); return; } setSelectedChapterId((v) => v || idOf(allChapters[0])); setStep(3); if (!selectedChapterId && allChapters[0]) loadQuizForChapter(idOf(allChapters[0])); }}>Continue to Quizzes <ArrowRight size={16}/></button></div></div>}

        {step === 3 && <div className="space-y-5"><div><h2 className="text-xl font-semibold">Chapter quiz builder</h2><p className="mt-1 text-sm opacity-70">Create one quiz per chapter. Each question must have exactly four options and one correct option.</p></div>{allChapters.length ? <><label className="block max-w-2xl text-sm font-medium">Choose chapter<select className="input mt-2 w-full" value={selectedChapterId} onChange={(e) => loadQuizForChapter(e.target.value)}><option value="">Select chapter</option>{skills.map((s) => <optgroup key={idOf(s)} label={s.name}>{(s.chapters || []).map((c) => <option key={idOf(c)} value={idOf(c)}>{c.title}</option>)}</optgroup>)}</select></label>{selectedChapter && <div className="rounded-xl p-4" style={{ background: 'var(--primary-soft, rgba(99,102,241,.08))' }}><div className="font-semibold">{selectedChapter.title}</div><p className="mt-1 text-sm opacity-75">{selectedChapter.description || 'No chapter description.'}</p>{selectedChapter.youtubeUrl && <a className="mt-2 inline-flex items-center gap-2 text-sm underline" href={selectedChapter.youtubeUrl} target="_blank" rel="noreferrer"><Video size={15}/> Open chapter video</a>}</div>}{quizLoading ? <p className="text-sm opacity-60">Loading saved quiz…</p> : selectedChapter && <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-medium">Quiz title<input className="input mt-2 w-full" value={quizForm.title} onChange={(e) => setQuizForm((p) => ({ ...p, title: e.target.value }))} placeholder={`${selectedChapter.title} Quiz`} /></label><label className="text-sm font-medium">Pass score (%)<input className="input mt-2 w-full" type="number" min="70" max="100" value={quizForm.passScore} onChange={(e) => setQuizForm((p) => ({ ...p, passScore: e.target.value }))} /></label><label className="text-sm font-medium">Required video watched (%)<input className="input mt-2 w-full" type="number" min="98" max="100" value={quizForm.requiredWatchPercentage} onChange={(e) => setQuizForm((p) => ({ ...p, requiredWatchPercentage: e.target.value }))} /></label></div><div className="flex items-center gap-2"><input id="quiz-active" type="checkbox" checked={quizForm.active} onChange={(e) => setQuizForm((p) => ({ ...p, active: e.target.checked }))}/><label htmlFor="quiz-active" className="text-sm">Quiz active</label></div><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Questions ({quizForm.questions.length})</h3><button className="btn-secondary inline-flex items-center gap-2" onClick={() => setQuizForm((p) => ({ ...p, questions: [...p.questions, newQuestion()] }))}><Plus size={15}/> Add question</button></div>{quizForm.questions.map((q, qi) => <div key={qi} className="space-y-4 rounded-xl border p-4" style={{ borderColor: 'var(--border, rgba(128,128,128,.25))' }}><div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Question {qi + 1}</h4><button className="btn-ghost text-red-500" onClick={() => setQuizForm((p) => ({ ...p, questions: p.questions.filter((_, i) => i !== qi) }))}><Trash2 size={15}/> Remove</button></div><label className="block text-sm font-medium">Question text<input className="input mt-2 w-full" value={q.question} onChange={(e) => setQuizForm((p) => ({ ...p, questions: p.questions.map((x, i) => i === qi ? { ...x, question: e.target.value } : x) }))} placeholder="Enter your question" /></label><div className="grid gap-3 md:grid-cols-2">{q.options.map((option, oi) => <label key={oi} className="flex items-start gap-2 text-sm"><input className="mt-3" type="radio" name={`correct-${qi}`} checked={Number(q.correctOption) === oi} onChange={() => setQuizForm((p) => ({ ...p, questions: p.questions.map((x, i) => i === qi ? { ...x, correctOption: oi } : x) }))}/><span className="flex-1"><span className="mb-1 block text-xs opacity-60">Option {String.fromCharCode(65 + oi)} {Number(q.correctOption) === oi ? '• Correct answer' : ''}</span><input className="input w-full" value={option} onChange={(e) => setQuizForm((p) => ({ ...p, questions: p.questions.map((x, i) => i === qi ? { ...x, options: x.options.map((o, j) => j === oi ? e.target.value : o) } : x) }))} placeholder={`Option ${String.fromCharCode(65 + oi)}`} /></span></label>)}</div><label className="block text-sm font-medium">Explanation shown after submission (optional)<textarea className="input mt-2 min-h-20 w-full" value={q.explanation} onChange={(e) => setQuizForm((p) => ({ ...p, questions: p.questions.map((x, i) => i === qi ? { ...x, explanation: e.target.value } : x) }))} placeholder="Explain why the correct answer is right." /></label></div>)}<button className="btn-primary inline-flex items-center gap-2" onClick={saveQuiz} disabled={busy}>{busy ? <ButtonSpinner/> : <Save size={16}/>} Save Quiz for This Chapter</button></div>}</> : <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-medium">No chapters yet</p><p className="mt-1 text-sm opacity-60">Go back and add chapters before configuring quizzes.</p></div>}<div className="flex justify-between"><button className="btn-ghost" onClick={() => setStep(2)}>Back</button><button className="btn-primary inline-flex items-center gap-2" onClick={() => setStep(4)}>Review curriculum <ArrowRight size={16}/></button></div></div>}

        {step === 4 && <div className="space-y-6"><div><h2 className="text-xl font-semibold">Review curriculum</h2><p className="mt-1 text-sm opacity-70">Check the curriculum before publishing. Publishing makes the career active for student-facing features that filter active careers.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: 'Skills', value: counts.skills, icon: Layers }, { label: 'Chapters', value: counts.chapters, icon: BookOpen }, { label: 'Quizzes', value: counts.quizzes, icon: ClipboardList }, { label: 'Questions', value: counts.questions, icon: Check }].map((x) => { const Icon = x.icon; return <div key={x.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--border, rgba(128,128,128,.25))' }}><Icon size={18}/><div className="mt-3 text-2xl font-bold">{x.value}</div><div className="text-sm opacity-60">{x.label}</div></div>; })}</div><div className="space-y-3">{skills.map((s, si) => <div key={idOf(s)} className="rounded-xl border p-4" style={{ borderColor: 'var(--border, rgba(128,128,128,.25))' }}><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">{si + 1}. {s.name}</div><p className="text-sm opacity-60">{s.description || 'No description'}</p></div><button className="btn-ghost" onClick={() => { setSelectedSkillId(idOf(s)); setStep(2); }}><Edit3 size={15}/> Edit</button></div>{(s.chapters || []).length ? <ol className="mt-3 space-y-2 pl-4">{s.chapters.map((c, ci) => <li key={idOf(c)} className="flex items-start gap-2 text-sm"><span className="opacity-60">{si + 1}.{ci + 1}</span><div className="min-w-0 flex-1"><span className="font-medium">{c.title}</span><span className="ml-2 text-xs opacity-60">{c.quiz?.questions?.length ? `${c.quiz.questions.length} quiz questions` : 'Quiz not configured'}</span>{c.youtubeUrl && <a className="ml-2 text-xs underline" href={c.youtubeUrl} target="_blank" rel="noreferrer">Video</a>}</div><button className="btn-ghost text-xs" onClick={() => { setSelectedChapterId(idOf(c)); setStep(3); loadQuizForChapter(idOf(c)); }}>Quiz</button></li>)}</ol> : <p className="mt-3 text-sm text-amber-600">No chapters yet.</p>}</div>)}</div><div className="rounded-xl p-4 text-sm" style={{ background: 'var(--primary-soft, rgba(99,102,241,.08))' }}><p className="font-semibold">Before publishing</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>Career details, skills, chapters, and quiz settings have been saved to MongoDB as you added them.</li><li>Save as Draft keeps the career inactive; Publish sets it active.</li><li>Student quiz responses should only receive correctness feedback after submission, never the answer key in the initial quiz payload.</li></ul></div><div className="flex flex-wrap justify-between gap-3"><button className="btn-ghost" onClick={() => setStep(3)}>Back</button><div className="flex flex-wrap gap-3"><button className="btn-secondary inline-flex items-center gap-2" onClick={() => publishCareer(false)} disabled={busy}>{busy ? <ButtonSpinner/> : <Save size={16}/>} Save as Draft</button><button className="btn-primary inline-flex items-center gap-2" onClick={() => publishCareer(true)} disabled={busy}>{busy ? <ButtonSpinner/> : <Check size={16}/>} Publish Career</button></div></div></div>}
      </section>
    </div>;
  }

  return <div className="animate-fade-in space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text)' }}>Career Management</h1><p className="mt-1 text-sm opacity-70">Create career paths and build their skills, chapters, videos, and quizzes in one wizard.</p></div><button className="btn-primary inline-flex items-center gap-2" onClick={resetWizard}><Plus size={17}/> Add Career</button></div>
    <div className="relative max-w-lg"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"/><input className="input w-full pl-10" placeholder="Search careers…" value={search} onChange={(e) => setSearch(e.target.value)}/></div>
    {loading ? <FullPageSpinner label="Loading careers…"/> : careers.length === 0 ? <EmptyState title="No careers found" message={search ? 'Try a different search.' : 'Start by creating your first career and curriculum.'} action={!search ? <button className="btn-primary" onClick={resetWizard}>Create first career</button> : null}/> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{careers.map((item) => <article key={idOf(item)} className="card rounded-2xl p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--primary-soft, rgba(99,102,241,.1))', color: 'var(--primary)' }}><Briefcase size={21}/></div><span className={`badge ${item.active !== false ? 'badge-success' : 'badge-warning'}`}>{item.active !== false ? 'Published / Active' : 'Draft / Inactive'}</span></div><h2 className="mt-4 text-lg font-semibold">{item.name || 'Untitled career'}</h2><p className="mt-2 line-clamp-3 min-h-12 text-sm opacity-70">{item.description || 'No description added.'}</p><div className="mt-5 flex flex-wrap gap-2"><button className="btn-primary inline-flex items-center gap-2" onClick={() => loadCareerWizard(item)} disabled={busy}><Edit3 size={15}/>{item.active === false ? 'Continue Setup' : 'Manage Curriculum'}</button><button className="btn-ghost text-red-500" onClick={() => deleteCareer(item)} aria-label={`Delete ${item.name}`}><Trash2 size={16}/></button></div></article>)}</div>}
  </div>;
}