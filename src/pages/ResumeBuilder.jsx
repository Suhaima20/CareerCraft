import { useState, useEffect } from 'react';
import { FileText, Download, Plus, Trash2, Save, User, GraduationCap, Briefcase, Award, Wrench, Eye } from 'lucide-react';
import { resumeBuilderAPI, skillAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { ButtonSpinner } from '@/components/Spinner';
import Modal from '@/components/Modal';

const emptyResume = {
  personalDetails: { name: '', email: '', phone: '', address: '', linkedin: '', github: '' },
  summary: '',
  education: [{ school: '', degree: '', year: '' }],
  experience: [{ company: '', role: '', duration: '', description: '' }],
  projects: [{ title: '', description: '', link: '' }],
  certifications: [{ name: '', issuer: '', year: '' }],
  achievements: [''],
  skills: [],
};

export default function ResumeBuilder() {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const [resume, setResume] = useState(emptyResume);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillResults, setSkillResults] = useState([]);
  const [showSkills, setShowSkills] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadSaved();
    } else {
      setResume((prev) => ({ ...prev, personalDetails: { ...prev.personalDetails, name: '', email: '' } }));
    }
  }, [isAuthenticated]);

  const loadSaved = async () => {
    try {
      const res = await resumeBuilderAPI.load();
      if (res.data.resume) {
        setResume({ ...emptyResume, ...res.data.resume });
      } else if (user) {
        setResume((prev) => ({ ...prev, personalDetails: { ...prev.personalDetails, name: user.name || '', email: user.email || '' } }));
      }
    } catch { /* no saved resume yet */ }
  };

  const updateField = (path, value) => {
    setResume((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const updateArrayItem = (field, index, key, value) => {
    setResume((prev) => {
      const arr = [...prev[field]];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
  };

  const addArrayItem = (field, template) => {
    setResume((prev) => ({ ...prev, [field]: [...prev[field], template] }));
  };

  const removeArrayItem = (field, index) => {
    setResume((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const searchSkills = async (q) => {
    setSkillSearch(q);
    if (!q.trim()) { setSkillResults([]); return; }
    try {
      const res = await skillAPI.search(q);
      setSkillResults(res.data.skills || []);
    } catch { setSkillResults([]); }
  };

  const addSkill = (skill) => {
    if (!resume.skills.find((s) => s._id === skill._id || s === skill.name)) {
      setResume((prev) => ({ ...prev, skills: [...prev.skills, skill.name] }));
    }
  };

  const removeSkill = (skillName) => {
    setResume((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skillName) }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await resumeBuilderAPI.save(resume);
      toast.success('Resume saved!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save resume');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const res = await resumeBuilderAPI.generate(resume);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resume.personalDetails.name || 'resume'}-ATS-Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Resume downloaded!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate PDF. Make sure the backend is running.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={24} style={{ color: 'var(--primary)' }} />
            <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text)' }}>ATS Resume Builder</h1>
          </div>
          <p className="text-muted">{isAuthenticated ? 'Build an ATS-friendly resume with your CareerCraft skills.' : 'Build a clean, ATS-friendly resume. No account needed.'}</p>
        </div>
        <div className="flex gap-2">
          {isAuthenticated && (
            <button onClick={handleSave} disabled={loading} className="btn-secondary">
              {loading ? <ButtonSpinner /> : <><Save size={16} /> Save</>}
            </button>
          )}
          <button onClick={handleDownload} disabled={generating} className="btn-primary">
            {generating ? <ButtonSpinner /> : <><Download size={16} /> Download PDF</>}
          </button>
        </div>
      </div>

      {/* Personal Details */}
      <Section icon={User} title="Personal Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" value={resume.personalDetails.name} onChange={(v) => updateField('personalDetails.name', v)} />
          <Input label="Email" value={resume.personalDetails.email} onChange={(v) => updateField('personalDetails.email', v)} />
          <Input label="Phone" value={resume.personalDetails.phone} onChange={(v) => updateField('personalDetails.phone', v)} />
          <Input label="Address" value={resume.personalDetails.address} onChange={(v) => updateField('personalDetails.address', v)} />
          <Input label="LinkedIn" value={resume.personalDetails.linkedin} onChange={(v) => updateField('personalDetails.linkedin', v)} />
          <Input label="GitHub" value={resume.personalDetails.github} onChange={(v) => updateField('personalDetails.github', v)} />
        </div>
        <div className="mt-4">
          <label className="label">Professional Summary</label>
          <textarea className="input resize-none" rows={3} value={resume.summary} onChange={(e) => updateField('summary', e.target.value)} placeholder="A brief summary of your professional background..." />
        </div>
      </Section>

      {/* Education */}
      <Section icon={GraduationCap} title="Education" onAdd={() => addArrayItem('education', { school: '', degree: '', year: '' })}>
        {resume.education.map((edu, i) => (
          <ArrayItem key={i} onRemove={() => removeArrayItem('education', i)}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="School/College" value={edu.school} onChange={(v) => updateArrayItem('education', i, 'school', v)} />
              <Input label="Degree" value={edu.degree} onChange={(v) => updateArrayItem('education', i, 'degree', v)} />
              <Input label="Year" value={edu.year} onChange={(v) => updateArrayItem('education', i, 'year', v)} />
            </div>
          </ArrayItem>
        ))}
      </Section>

      {/* Experience */}
      <Section icon={Briefcase} title="Experience" onAdd={() => addArrayItem('experience', { company: '', role: '', duration: '', description: '' })}>
        {resume.experience.map((exp, i) => (
          <ArrayItem key={i} onRemove={() => removeArrayItem('experience', i)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Input label="Company" value={exp.company} onChange={(v) => updateArrayItem('experience', i, 'company', v)} />
              <Input label="Role" value={exp.role} onChange={(v) => updateArrayItem('experience', i, 'role', v)} />
            </div>
            <Input label="Duration" value={exp.duration} onChange={(v) => updateArrayItem('experience', i, 'duration', v)} placeholder="Jan 2023 - Present" />
            <div className="mt-3">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} value={exp.description} onChange={(e) => updateArrayItem('experience', i, 'description', e.target.value)} />
            </div>
          </ArrayItem>
        ))}
      </Section>

      {/* Projects */}
      <Section icon={FileText} title="Projects" onAdd={() => addArrayItem('projects', { title: '', description: '', link: '' })}>
        {resume.projects.map((proj, i) => (
          <ArrayItem key={i} onRemove={() => removeArrayItem('projects', i)}>
            <Input label="Title" value={proj.title} onChange={(v) => updateArrayItem('projects', i, 'title', v)} />
            <div className="mt-3">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} value={proj.description} onChange={(e) => updateArrayItem('projects', i, 'description', e.target.value)} />
            </div>
            <div className="mt-3"><Input label="Link" value={proj.link} onChange={(v) => updateArrayItem('projects', i, 'link', v)} /></div>
          </ArrayItem>
        ))}
      </Section>

      {/* Certifications */}
      <Section icon={Award} title="Certifications" onAdd={() => addArrayItem('certifications', { name: '', issuer: '', year: '' })}>
        {resume.certifications.map((cert, i) => (
          <ArrayItem key={i} onRemove={() => removeArrayItem('certifications', i)}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Name" value={cert.name} onChange={(v) => updateArrayItem('certifications', i, 'name', v)} />
              <Input label="Issuer" value={cert.issuer} onChange={(v) => updateArrayItem('certifications', i, 'issuer', v)} />
              <Input label="Year" value={cert.year} onChange={(v) => updateArrayItem('certifications', i, 'year', v)} />
            </div>
          </ArrayItem>
        ))}
      </Section>

      {/* Skills */}
      <Section icon={Wrench} title="Skills">
        <div className="mb-3">
          <input
            type="text"
            className="input"
            placeholder="Search skills to add..."
            value={skillSearch}
            onChange={(e) => searchSkills(e.target.value)}
            onFocus={() => setShowSkills(true)}
            onBlur={() => setTimeout(() => setShowSkills(false), 200)}
          />
          {showSkills && skillResults.length > 0 && (
            <div className="mt-1 card p-2 max-h-40 overflow-y-auto scrollbar-thin">
              {skillResults.slice(0, 8).map((s) => (
                <button key={s._id} onClick={() => { addSkill(s); setSkillSearch(''); setSkillResults([]); }} className="block w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-bg" style={{ color: 'var(--text)' }}>
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {resume.skills.map((skill, i) => (
            <span key={i} className="badge-primary flex items-center gap-1">
              {skill}
              <button onClick={() => removeSkill(skill)} className="hover:opacity-70"><Trash2 size={12} /></button>
            </span>
          ))}
          {resume.skills.length === 0 && <p className="text-sm text-muted">No skills added yet. Search above to add skills from our database.</p>}
        </div>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children, onAdd }) {
  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Icon size={20} style={{ color: 'var(--primary)' }} /> {title}
        </h3>
        {onAdd && <button onClick={onAdd} className="btn-ghost text-sm"><Plus size={16} /> Add</button>}
      </div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="text" className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ArrayItem({ children, onRemove }) {
  return (
    <div className="p-3 rounded-lg mb-3 relative" style={{ background: 'var(--bg)' }}>
      {children}
      <button onClick={onRemove} className="absolute top-3 right-3 btn-ghost p-1 text-red-600"><Trash2 size={16} /></button>
    </div>
  );
}
