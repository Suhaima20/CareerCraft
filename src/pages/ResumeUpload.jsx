import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  X,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

import { resumeAPI, onboardingAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { ButtonSpinner, FullPageSpinner } from '@/components/Spinner';

export default function ResumeUpload() {
  const toast = useToast();
  const navigate = useNavigate();

  // ============================================================
  // STATE
  // ============================================================

  const [file, setFile] = useState(null);

  const [existingResume, setExistingResume] = useState(null);
  const [existingSkills, setExistingSkills] = useState([]);

  const [loadingExisting, setLoadingExisting] = useState(true);

  const [replaceMode, setReplaceMode] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [dragOver, setDragOver] = useState(false);


  // ============================================================
  // LOAD EXISTING RESUME
  // ============================================================

  useEffect(() => {
    const loadExistingResume = async () => {
      setLoadingExisting(true);

      try {
        const res = await resumeAPI.getExtracted();

        const resume = res.data?.resume || null;
        const skills = res.data?.skills || [];

        setExistingResume(resume);
        setExistingSkills(skills);

      } catch (err) {
        // ------------------------------------------------------
        // No existing resume should NOT be treated as an error.
        // The user can simply upload a new one.
        // ------------------------------------------------------

        console.log(
          'No existing resume found or failed to load:',
          err
        );

        setExistingResume(null);
        setExistingSkills([]);

      } finally {
        setLoadingExisting(false);
      }
    };

    loadExistingResume();
  }, []);


  // ============================================================
  // VALIDATE FILE
  // ============================================================

  const validateFile = (f) => {
    if (
      f.type !== 'application/pdf' &&
      !f.name.toLowerCase().endsWith('.pdf')
    ) {
      toast.error('Only PDF files are accepted.');
      return false;
    }

    if (f.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB.');
      return false;
    }

    return true;
  };


  // ============================================================
  // HANDLE FILE
  // ============================================================

  const handleFile = (f) => {
    if (validateFile(f)) {
      setFile(f);
    }
  };


  // ============================================================
  // HANDLE DROP
  // ============================================================

  const handleDrop = (e) => {
    e.preventDefault();

    setDragOver(false);

    const f = e.dataTransfer.files[0];

    if (f) {
      handleFile(f);
    }
  };


  // ============================================================
  // USE EXISTING RESUME
  // ============================================================

  const handleUseExistingResume = async () => {
    if (!existingResume) {
      return;
    }

    try {
      await onboardingAPI.updateStep(
        'skill-confirmation'
      );

      toast.success(
        'Your existing resume will be reused.'
      );

      navigate(
        '/onboarding/skill-confirmation'
      );

    } catch (err) {

      toast.error(
        err.response?.data?.error ||
        'Failed to continue with your existing resume.'
      );
    }
  };


  // ============================================================
  // REPLACE RESUME
  // ============================================================

  const handleReplaceResume = () => {
    setReplaceMode(true);
    setFile(null);
  };


  // ============================================================
  // CANCEL REPLACE
  // ============================================================

  const handleCancelReplace = () => {
    setReplaceMode(false);
    setFile(null);
  };


  // ============================================================
  // UPLOAD NEW RESUME
  // ============================================================

  const handleUpload = async () => {

    if (!file) {
      toast.error('Please select a PDF resume first.');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {

      const res = await resumeAPI.upload(
        file,
        (e) => {

          if (e.total) {

            setProgress(
              Math.round(
                (e.loaded / e.total) * 100
              )
            );

          }

        }
      );


      console.log(
        'Resume upload response:',
        res.data
      );


      toast.success(
        'Resume processed! Review your extracted skills.'
      );


      await onboardingAPI.updateStep(
        'skill-confirmation'
      );


      navigate(
        '/onboarding/skill-confirmation'
      );


    } catch (err) {

      console.error(
        'Resume upload error:',
        err
      );

      toast.error(
        err.response?.data?.error ||
        'Failed to process resume. Please try again.'
      );

    } finally {

      setUploading(false);

    }
  };


  // ============================================================
  // LOADING EXISTING RESUME
  // ============================================================

  if (loadingExisting) {

    return (
      <FullPageSpinner
        label="Checking your saved resume..."
      />
    );

  }


  // ============================================================
  // EXISTING RESUME VIEW
  // ============================================================

  if (
    existingResume &&
    !replaceMode &&
    !file
  ) {

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">

        {/* Header */}

        <div className="text-center mb-8">

          <div className="inline-flex items-center gap-2 badge-primary mb-3">
            Step 2 of 4
          </div>

          <h1
            className="text-3xl font-heading font-bold mb-2"
            style={{ color: 'var(--text)' }}
          >
            Your Resume Is Already Saved
          </h1>

          <p className="text-muted">
            You don't need to upload your resume again.
            We'll reuse your saved resume for your new career analysis.
          </p>

        </div>


        {/* Existing Resume Card */}

        <div className="card p-6 mb-6">

          <div className="flex items-center gap-4">

            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background:
                  'rgba(64,61,136,0.1)'
              }}
            >
              <FileText
                size={28}
                style={{
                  color: 'var(--primary)'
                }}
              />
            </div>


            <div className="flex-1 min-w-0">

              <p
                className="font-semibold truncate"
                style={{
                  color: 'var(--text)'
                }}
              >
                {existingResume.fileName ||
                  'Saved Resume'}
              </p>

              <p className="text-sm text-muted mt-1">
                Your saved resume
              </p>

            </div>

            <CheckCircle2
              size={24}
              className="text-green-600"
            />

          </div>


          {/* Skills */}

          <div className="mt-6">

            <div className="flex items-center justify-between mb-3">

              <p
                className="text-sm font-medium"
                style={{
                  color: 'var(--text)'
                }}
              >
                Skills extracted
              </p>

              <span className="text-sm text-muted">
                {existingSkills.length} skills
              </span>

            </div>


            {existingSkills.length > 0 ? (

              <div className="flex flex-wrap gap-2">

                {existingSkills.map(
                  (skill, index) => (

                    <span
                      key={
                        skill._id ||
                        skill.skill_id ||
                        index
                      }
                      className="badge-primary"
                    >
                      {skill.name ||
                        skill['Skill name'] ||
                        skill.skill_name ||
                        'Skill'}
                    </span>

                  )
                )}

              </div>

            ) : (

              <p className="text-sm text-muted">
                No extracted skills found.
              </p>

            )}

          </div>

        </div>


        {/* Explanation */}

        <div
          className="card p-5 mb-6"
          style={{
            background:
              'rgba(64,61,136,0.04)'
          }}
        >

          <div className="flex gap-3">

            <RefreshCw
              size={20}
              style={{
                color: 'var(--primary)',
                flexShrink: 0
              }}
            />

            <div>

              <p
                className="font-medium mb-1"
                style={{
                  color: 'var(--text)'
                }}
              >
                Your resume is reusable
              </p>

              <p className="text-sm text-muted">
                When you switch careers, CareerCraft
                compares the skills from this same resume
                against the requirements of the new career.
                You only need to upload a new resume if
                you want to update your profile.
              </p>

            </div>

          </div>

        </div>


        {/* Buttons */}

        <div className="flex justify-between mt-8">

          <button
            onClick={() =>
              navigate(
                '/onboarding/skill-source'
              )
            }
            className="btn-ghost"
          >
            <ArrowLeft size={18} />
            Back
          </button>


          <div className="flex gap-3">

            <button
              onClick={handleReplaceResume}
              className="btn-outline"
            >
              <RefreshCw size={17} />
              Replace Resume
            </button>


            <button
              onClick={handleUseExistingResume}
              className="btn-primary"
            >
              Use Existing Resume
              <ArrowRight size={18} />
            </button>

          </div>

        </div>

      </div>
    );
  }


  // ============================================================
  // UPLOAD / REPLACE VIEW
  // ============================================================

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">

      {/* Header */}

      <div className="text-center mb-8">

        <div className="inline-flex items-center gap-2 badge-primary mb-3">
          Step 2 of 4
        </div>

        <h1
          className="text-3xl font-heading font-bold mb-2"
          style={{ color: 'var(--text)' }}
        >
          {replaceMode
            ? 'Replace Your Resume'
            : 'Upload Your Resume'}
        </h1>

        <p className="text-muted">

          {replaceMode
            ? 'Upload a new PDF to replace your currently saved resume.'
            : 'Upload a PDF resume. Our NLP engine will extract your skills using spaCy.'}

        </p>

      </div>


      {/* Replace explanation */}

      {replaceMode && existingResume && (

        <div
          className="card p-4 mb-6"
          style={{
            background:
              'rgba(64,61,136,0.04)'
          }}
        >

          <div className="flex items-center gap-3">

            <FileText
              size={20}
              style={{
                color: 'var(--primary)'
              }}
            />

            <div>

              <p
                className="text-sm font-medium"
                style={{
                  color: 'var(--text)'
                }}
              >
                Current resume
              </p>

              <p className="text-xs text-muted">
                {existingResume.fileName}
              </p>

            </div>

          </div>

        </div>

      )}


      {/* File picker */}

      {!file ? (

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}

          onDragLeave={() =>
            setDragOver(false)
          }

          onDrop={handleDrop}

          onClick={() =>
            document
              .getElementById('file-input')
              .click()
          }

          className={`card p-12 text-center cursor-pointer transition-all border-2 border-dashed ${
            dragOver
              ? 'border-primary'
              : ''
          }`}

          style={{
            borderColor:
              dragOver
                ? 'var(--primary)'
                : 'var(--border)'
          }}
        >

          <UploadCloud
            size={48}
            style={{
              color: 'var(--primary)'
            }}
            className="mx-auto mb-4"
          />

          <p
            className="text-lg font-medium mb-1"
            style={{
              color: 'var(--text)'
            }}
          >
            Drop your PDF here
          </p>

          <p className="text-sm text-muted">
            or click to browse. Max 5MB. PDF only.
          </p>

          <input
            id="file-input"
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {

              const selectedFile =
                e.target.files?.[0];

              if (selectedFile) {
                handleFile(selectedFile);
              }

            }}
          />

        </div>

      ) : (

        /* Selected file */

        <div className="card p-6">

          <div className="flex items-center gap-3 mb-4">

            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{
                background:
                  'rgba(64,61,136,0.1)'
              }}
            >

              <FileText
                size={24}
                style={{
                  color: 'var(--primary)'
                }}
              />

            </div>


            <div className="flex-1 min-w-0">

              <p
                className="text-sm font-medium truncate"
                style={{
                  color: 'var(--text)'
                }}
              >
                {file.name}
              </p>

              <p className="text-xs text-muted">
                {(file.size / 1024).toFixed(1)} KB
              </p>

            </div>


            {!uploading && (

              <button
                onClick={() =>
                  setFile(null)
                }
                className="btn-ghost p-2"
              >
                <X size={18} />
              </button>

            )}

          </div>


          {/* Progress */}

          {uploading && (

            <div className="mb-4">

              <div
                className="h-2 rounded-full overflow-hidden"
                style={{
                  background:
                    'var(--border)'
                }}
              >

                <div
                  className="h-full transition-all"
                  style={{
                    width:
                      `${progress}%`,
                    background:
                      'var(--primary)'
                  }}
                />

              </div>

              <p className="text-xs text-muted mt-1">
                {progress}% — Processing with NLP...
              </p>

            </div>

          )}


          {uploading &&
            progress === 100 && (

              <div className="flex items-center gap-2 text-sm text-green-600">

                <CheckCircle2 size={16} />

                Extracting skills...

              </div>

            )}

        </div>

      )}


      {/* Bottom buttons */}

      <div className="flex justify-between mt-8">

        <button
          onClick={() => {

            if (replaceMode) {
              handleCancelReplace();
            } else {
              navigate(
                '/onboarding/skill-source'
              );
            }

          }}
          className="btn-ghost"
        >

          <ArrowLeft size={18} />

          {replaceMode
            ? 'Cancel'
            : 'Back'}

        </button>


        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="btn-primary"
        >

          {uploading ? (

            <ButtonSpinner />

          ) : (

            <>
              {replaceMode
                ? 'Replace & Extract'
                : 'Upload & Extract'}

              <ArrowRight size={18} />
            </>

          )}

        </button>

      </div>

    </div>
  );
}