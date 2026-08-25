import { useState } from 'react';
import { FileDown, Users, MessageSquare, Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { ButtonSpinner } from '@/components/Spinner';

export default function AdminExports() {
  const toast = useToast();
  const [exporting, setExporting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importFile, setImportFile] = useState(null);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      let res;
      let filename;
      if (type === 'users') {
        res = await adminAPI.exportUsers();
        filename = 'careercraft-users.csv';
      } else {
        res = await adminAPI.exportFeedback();
        filename = 'careercraft-feedback.csv';
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${type === 'users' ? 'Users' : 'Feedback'} exported successfully`);
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to export ${type}`);
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select an Excel file');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await adminAPI.importExcel(importFile);
      setImportResult(res.data);
      toast.success('Dataset imported successfully');
      setImportFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to import dataset. Make sure the file matches the expected format.');
    } finally {
      setImporting(false);
    }
  };

  const downloadBlob = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // Generate a simple printable HTML report and trigger print-to-PDF
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }
    reportWindow.document.write(`
      <html><head><title>CareerCraft Admin Report</title>
      <style>body{font-family:Arial;padding:40px;color:#1F150C}h1{color:#403D88}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#403D88;color:white}</style>
      </head><body>
      <h1>CareerCraft Admin Report</h1>
      <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
      <p>This report contains a summary of platform data. For detailed data, use the CSV export.</p>
      <table><tr><th>Metric</th><th>Source</th></tr>
      <tr><td>Users</td><td>Export via CSV for full data</td></tr>
      <tr><td>Feedback</td><td>Export via CSV for full data</td></tr>
      </table>
      </body></html>
    `);
    reportWindow.document.close();
    setTimeout(() => reportWindow.print(), 500);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <FileDown size={24} style={{ color: 'var(--primary)' }} /> Data Exports & Imports
        </h1>
        <p className="text-muted">Export platform data and import datasets</p>
      </div>

      {/* Exports */}
      <div className="card p-5 mb-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Export Data</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => handleExport('users')} disabled={exporting === 'users'} className="card p-4 text-left hover:shadow-soft transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(64,61,136,0.1)' }}>
                <Users size={20} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text)' }}>Export Users (CSV)</p>
                <p className="text-xs text-muted">Download all user data as CSV</p>
              </div>
            </div>
            {exporting === 'users' && <div className="flex items-center gap-2 text-xs text-muted"><ButtonSpinner /> Exporting...</div>}
          </button>

          <button onClick={() => handleExport('feedback')} disabled={exporting === 'feedback'} className="card p-4 text-left hover:shadow-soft transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(64,61,136,0.1)' }}>
                <MessageSquare size={20} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text)' }}>Export Feedback (CSV)</p>
                <p className="text-xs text-muted">Download all feedback as CSV</p>
              </div>
            </div>
            {exporting === 'feedback' && <div className="flex items-center gap-2 text-xs text-muted"><ButtonSpinner /> Exporting...</div>}
          </button>
        </div>
        <button onClick={downloadBlob} className="hidden">hidden</button>
        <div className="mt-4">
          <button onClick={exportPDF} className="btn-secondary"><FileDown size={16} /> Export Summary Report (PDF)</button>
        </div>
        <p className="text-xs text-muted mt-3">Exports exclude passwords, password hashes, and other confidential data.</p>
      </div>

      {/* Import */}
      <div className="card p-5">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <FileSpreadsheet size={20} style={{ color: 'var(--primary)' }} /> Import Dataset (Excel)
        </h3>
        <p className="text-sm text-muted mb-4">
          Upload an Excel file (.xlsx) containing careers, skills, chapters, and their mappings. Repeated imports avoid duplicates using stable identifiers (upsert). See the README for the expected Excel structure.
        </p>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex-1">
            <label className="label">Excel File</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="input"
              onChange={(e) => setImportFile(e.target.files[0])}
            />
          </div>
          <button onClick={handleImport} disabled={importing || !importFile} className="btn-primary mt-6">
            {importing ? <ButtonSpinner /> : <><Upload size={16} /> Import</>}
          </button>
        </div>

        {importResult && (
          <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg)' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="text-green-600" />
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Import Complete</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {importResult.careers !== undefined && <Stat label="Careers" value={importResult.careers} />}
              {importResult.skills !== undefined && <Stat label="Skills" value={importResult.skills} />}
              {importResult.chapters !== undefined && <Stat label="Chapters" value={importResult.chapters} />}
              {importResult.mappings !== undefined && <Stat label="Mappings" value={importResult.mappings} />}
            </div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-red-600 flex items-center gap-1 mb-1"><XCircle size={14} /> Errors ({importResult.errors.length})</p>
                <ul className="text-xs text-muted list-disc list-inside max-h-32 overflow-y-auto scrollbar-thin">
                  {importResult.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  );
}
