import { Link } from 'react-router-dom';
import { Compass, Github, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-themed mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg mb-3" style={{ color: 'var(--primary)' }}>
              <Compass size={22} />
              <span>CareerCraft</span>
            </Link>
            <p className="text-sm text-muted">Smart Skill Gap Analysis and Career Recommendation System.</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Platform</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link to="/" className="hover:text-primary">Home</Link></li>
              <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
              <li><Link to="/resume-builder" className="hover:text-primary">Resume Builder</Link></li>
              <li><Link to="/feedback" className="hover:text-primary">Feedback</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Legal</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link to="/terms" className="hover:text-primary">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Connect</h4>
            <div className="flex gap-3">
              <a href="#" className="btn-ghost p-2 rounded-lg" aria-label="GitHub"><Github size={18} /></a>
              <a href="#" className="btn-ghost p-2 rounded-lg" aria-label="LinkedIn"><Linkedin size={18} /></a>
              <a href="#" className="btn-ghost p-2 rounded-lg" aria-label="Email"><Mail size={18} /></a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-themed text-center text-sm text-muted">
          <p>&copy; {new Date().getFullYear()} CareerCraft. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
