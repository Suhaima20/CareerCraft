export default function Privacy() {
  const sections = [
    { title: 'Information We Collect', body: 'CareerCraft collects the following personal information: your name, age, phone number, email address, profession, resume content (for skill extraction), skill selections, career choices, learning progress, and feedback. We also collect usage data such as login times and feature interactions.' },
    { title: 'Why We Collect Your Data', body: 'Your data is used to: create and manage your account, process your resume for skill extraction, generate skill gap analyses, create personalized learning roadmaps, track your learning progress, recommend careers, display relevant job opportunities, and improve the platform.' },
    { title: 'Names', body: 'Your name is used for personalization and account identification. It is visible to you and to administrators. It is not shared with third parties.' },
    { title: 'Phone Numbers', body: 'Your phone number is collected for account verification purposes. It is stored securely and is not displayed publicly or shared with third parties.' },
    { title: 'Email', body: 'Your email address is used for account login, communication, and account recovery. It is not displayed to other users and is not sold to third parties.' },
    { title: 'Resumes', body: 'Uploaded resumes are processed for skill extraction using spaCy NLP. The extracted text and identified skills are stored for analysis. Resume files are stored securely and are not publicly accessible. Only you and authorized administrators can access your resume metadata.' },
    { title: 'Skills', body: 'Your skill data — both extracted from resumes and manually selected — is stored to generate analyses and roadmaps. This data persists across sessions and is used to track your progress.' },
    { title: 'Career Selections', body: 'Your selected and active career choices are stored to personalize your dashboard, roadmap, and recommendations. Career switching history is maintained to preserve progress across careers.' },
    { title: 'Progress', body: 'Your learning progress, including chapter completions, streaks, and achievements, is stored per career. This data persists across logins, refreshes, and career switches.' },
    { title: 'Feedback', body: 'Feedback you submit is stored with your account information (if authenticated) and timestamp. It is visible to administrators for review and improvement purposes.' },
    { title: 'Data Security', body: 'Passwords are hashed using bcrypt. Authentication uses JWT tokens. Resume files are stored with restricted access. The backend enforces role-based authorization. However, no system is perfectly secure, and we cannot guarantee absolute security.' },
    { title: 'Data Retention', body: 'Your data is retained for as long as your account is active. You may request deletion of your account and associated data by contacting the administrator.' },
    { title: 'Contact', body: 'For privacy questions, contact: [Organization Email]' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <h1 className="text-4xl font-heading font-bold mb-4" style={{ color: 'var(--text)' }}>Privacy Policy</h1>
      <p className="text-muted mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <div className="space-y-6">
        {sections.map((s, i) => (
          <div key={i} className="card p-6">
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>{i + 1}. {s.title}</h2>
            <p className="text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted mt-8">Note: This privacy policy describes our actual practices. We do not claim certifications or compliance standards that have not been implemented. Organization details marked with [brackets] are configurable placeholders.</p>
    </div>
  );
}
