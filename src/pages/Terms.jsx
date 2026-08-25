export default function Terms() {
  const sections = [
    { title: 'Service Description', body: 'CareerCraft is a career intelligence platform that provides skill gap analysis, career recommendations, personalized learning roadmaps, and an ATS-friendly resume builder. The platform uses NLP-based resume processing and deterministic matching algorithms.' },
    { title: 'User Responsibilities', body: "Users are responsible for providing accurate information during registration and skill input. Users must not upload malicious files, attempt to access other users' data, or misuse the platform's features." },
    { title: 'Account Responsibility', body: 'Users are responsible for maintaining the confidentiality of their login credentials. All activity under an account is the responsibility of the account holder.' },
    { title: 'Resume Information', body: 'Users retain ownership of the content in their uploaded resumes. CareerCraft processes resumes solely for skill extraction and analysis. Resume files are stored securely and are not publicly accessible.' },
    { title: 'External Links', body: 'CareerCraft may display external job opportunities and learning resources. The platform is not responsible for the content, accuracy, or availability of external websites.' },
    { title: 'Job Disclaimer', body: 'CareerCraft is not a job portal. Job listings displayed are external opportunities sourced from third-party providers. We do not guarantee the availability, accuracy, or legitimacy of external job postings.' },
    { title: 'Market Data Disclaimer', body: 'Market intelligence data, including trending careers and skills, may be curated by administrators or sourced from external providers. When live data is unavailable, the platform clearly indicates this. We do not fabricate market statistics.' },
    { title: 'Educational Disclaimer', body: 'Learning resources and roadmaps are provided for educational guidance. CareerCraft does not guarantee career outcomes. Users should independently verify the quality and relevance of learning resources.' },
    { title: 'Platform Limitations', body: "CareerCraft's skill matching is based on NLP and deterministic algorithms. The accuracy of skill extraction depends on resume quality and the skill dataset. The platform does not use LLMs for skill extraction or matching." },
    { title: 'Intellectual Property', body: 'The CareerCraft platform, including its design, algorithms, and code, is the intellectual property of [Organization Name]. User-generated content remains the property of the user.' },
    { title: 'Account Termination', body: 'CareerCraft reserves the right to suspend or terminate accounts that violate these terms. Users may request account deletion at any time.' },
    { title: 'Contact Information', body: 'For questions about these terms, contact: [Organization Email] | [Organization Address]' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <h1 className="text-4xl font-heading font-bold mb-4" style={{ color: 'var(--text)' }}>Terms & Conditions</h1>
      <p className="text-muted mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <div className="space-y-6">
        {sections.map((s, i) => (
          <div key={i} className="card p-6">
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>{i + 1}. {s.title}</h2>
            <p className="text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted mt-8">Note: Organization details marked with [brackets] are configurable placeholders. Replace them with your organization's information before deployment.</p>
    </div>
  );
}
