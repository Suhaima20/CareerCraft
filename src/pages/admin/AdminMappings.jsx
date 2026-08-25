import { useState, useEffect, useCallback } from 'react';
import { GitBranch, Briefcase, GraduationCap, BookOpen, Save, Search, Check, X } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { FullPageSpinner, ButtonSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import { useDebounce } from '@/hooks/useHooks';

export default function AdminMappings() {
  const toast = useToast();
  const [mode, setMode] = useState('career-skills'); // or 'skill-chapters'
  const [careers, setCareers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [mappedIds, setMappedIds] = useState(new Set());
  const [availableItems, setAvailableItems] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [loadingMapped, setLoadingMapped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Fetch all careers, skills, chapters on mount
  const fetchEntities = useCallback(async () => {
    setLoadingEntities(true);
    setError(null);
    try {
      const [careersRes, skillsRes, chaptersRes] = await Promise.all([
        adminAPI.listCareers({}),
        adminAPI.listSkills({}),
        adminAPI.listChapters({}),
      ]);
      setCareers(careersRes.data.careers || []);
      setSkills(skillsRes.data.skills || []);
      setChapters(chaptersRes.data.chapters || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoadingEntities(false);
    }
  }, []);

  useEffect(() => { fetchEntities(); }, [fetchEntities]);

  // Fetch mapped items when an entity is selected
  const fetchMapped = useCallback(async () => {
    if (!selectedEntity) return;
    setLoadingMapped(true);
    try {
      if (mode === 'career-skills') {
        const res = await adminAPI.getCareerSkills(selectedEntity._id);
        const skillIds = (res.data.skills || []).map((s) => s._id);
        setMappedIds(new Set(skillIds));
      } else {
        const res = await adminAPI.getSkillChapters(selectedEntity._id);
        const chapterIds = (res.data.chapters || []).map((c) => c._id);
        setMappedIds(new Set(chapterIds));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load mappings');
      setMappedIds(new Set());
    } finally {
      setLoadingMapped(false);
    }
  }, [selectedEntity, mode, toast]);

  useEffect(() => {
    if (selectedEntity) fetchMapped();
    else setMappedIds(new Set());
  }, [selectedEntity, fetchMapped]);

  // Set available items based on mode
  useEffect(() => {
    if (mode === 'career-skills') setAvailableItems(skills);
    else setAvailableItems(chapters);
    setSelectedEntity(null);
    setMappedIds(new Set());
  }, [mode, skills, chapters]);

  const toggleMapped = (id) => {
    setMappedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedEntity) return;
    setSaving(true);
    try {
      const ids = [...mappedIds];
      if (mode === 'career-skills') {
        await adminAPI.setCareerSkills(selectedEntity._id, ids);
        toast.success('Career-Skill mapping saved');
      } else {
        await adminAPI.setSkillChapters(selectedEntity._id, ids);
        toast.success('Skill-Chapter mapping saved');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save mappings');
    } finally {
      setSaving(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setSearch('');
  };

  const entityList = mode === 'career-skills' ? careers : skills;
  const filteredEntities = entityList.filter((e) =>
    e.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );
  const filteredAvailable = availableItems.filter((a) =>
    (a.name || a.title)?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  if (loadingEntities) return <FullPageSpinner label="Loading mappings data..." />;
  if (error) return <ErrorState message={error} onRetry={fetchEntities} />;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <GitBranch size={24} style={{ color: 'var(--primary)' }} /> Mappings Management
        </h1>
        <p className="text-muted">Manage Career ↔ Skills and Skill ↔ Chapters relationships</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => switchMode('career-skills')}
          className={mode === 'career-skills' ? 'btn-primary' : 'btn-secondary'}
        >
          <Briefcase size={16} /> Career ↔ Skills
        </button>
        <button
          onClick={() => switchMode('skill-chapters')}
          className={mode === 'skill-chapters' ? 'btn-primary' : 'btn-secondary'}
        >
          <GraduationCap size={16} /> Skill ↔ Chapters
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Entity selector */}
        <div className="card p-5">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            {mode === 'career-skills' ? <Briefcase size={20} style={{ color: 'var(--primary)' }} /> : <GraduationCap size={20} style={{ color: 'var(--primary)' }} />}
            Select {mode === 'career-skills' ? 'Career' : 'Skill'}
          </h3>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              className="input pl-9"
              placeholder={`Search ${mode === 'career-skills' ? 'careers' : 'skills'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {filteredEntities.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">No items found</p>
            ) : (
              filteredEntities.map((entity) => (
                <button
                  key={entity._id}
                  onClick={() => setSelectedEntity(entity)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${selectedEntity?._id === entity._id ? 'text-white' : 'hover:bg-bg'}`}
                  style={selectedEntity?._id === entity._id ? { background: 'var(--primary)' } : {}}
                >
                  <span className="text-sm font-medium" style={{ color: selectedEntity?._id === entity._id ? 'white' : 'var(--text)' }}>
                    {entity.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Mapped items */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <BookOpen size={20} style={{ color: 'var(--primary)' }} />
              {mode === 'career-skills' ? 'Required Skills' : 'Chapters'}
            </h3>
            {selectedEntity && (
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                {saving ? <ButtonSpinner /> : <><Save size={14} /> Save</>}
              </button>
            )}
          </div>

          {!selectedEntity ? (
            <EmptyState
              icon={mode === 'career-skills' ? Briefcase : GraduationCap}
              title={`Select a ${mode === 'career-skills' ? 'career' : 'skill'}`}
              message={`Choose a ${mode === 'career-skills' ? 'career' : 'skill'} from the left to manage its ${mode === 'career-skills' ? 'required skills' : 'chapters'}.`}
            />
          ) : loadingMapped ? (
            <div className="flex justify-center py-8"><ButtonSpinner /></div>
          ) : filteredAvailable.length === 0 ? (
            <EmptyState
              icon={mode === 'career-skills' ? GraduationCap : BookOpen}
              title={`No ${mode === 'career-skills' ? 'skills' : 'chapters'} available`}
              message={`Add ${mode === 'career-skills' ? 'skills' : 'chapters'} first to create mappings.`}
            />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {filteredAvailable.map((item) => {
                const id = item._id;
                const isMapped = mappedIds.has(id);
                const label = item.name || item.title;
                return (
                  <div
                    key={id}
                    onClick={() => toggleMapped(id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${isMapped ? '' : 'hover:bg-bg'}`}
                    style={isMapped ? { background: 'rgba(64,61,136,0.1)', border: '1px solid var(--primary)' } : { border: '1px solid var(--border)' }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center"
                      style={{ background: isMapped ? 'var(--primary)' : 'transparent', border: isMapped ? 'none' : '1px solid var(--border)' }}
                    >
                      {isMapped && <Check size={14} className="text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {selectedEntity && (
        <div className="card p-4 mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">
              {mode === 'career-skills' ? 'Career' : 'Skill'}: <span className="font-medium" style={{ color: 'var(--text)' }}>{selectedEntity.name}</span>
            </p>
            <p className="text-xs text-muted mt-0.5">
              {mappedIds.size} {mode === 'career-skills' ? 'skills' : 'chapters'} mapped
            </p>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <ButtonSpinner /> : <><Save size={16} /> Save Mappings</>}
          </button>
        </div>
      )}
    </div>
  );
}
