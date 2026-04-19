'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

export default function SubmitDataPage() {
  const router = useRouter();
  const [month, setMonth] = useState(new Date().getMonth() || 12);
  const [year, setYear] = useState(month === 12 ? YEARS[1] : YEARS[0]);
  const [mwh, setMwh] = useState('');
  const [sourceData, setSourceData] = useState('manual');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    
    try {
      const res = await fetch('/api/client/generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          month, year, 
          mwh_generated: parseFloat(mwh),
          source_type: sourceData 
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Submission failed');
      } else {
        setSuccess('Generation data submitted successfully. Proceeding to dashboard...');
        setTimeout(() => router.push('/dashboard/generation'), 2000);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fadeUp max-w-2xl mx-auto">
      <div className="mb-8">
         <h1 className="text-3xl font-bold text-[#0B3D2E] tracking-tight">Submit Generation Data</h1>
         <p className="text-gray-500 font-medium mt-1">Upload monthly MWh data for carbon crediting</p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error mb-6"><span>⚠</span> {error}</div>}
        {success && <div className="alert alert-success mb-6"><span>✅</span> {success}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">Month</label>
              <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">Year</label>
              <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-semibold mb-1 text-gray-700">Net Generation (MWh) <span className="text-red-500">*</span></label>
             <div className="relative">
               <input 
                 required type="number" step="0.001" min="0" 
                 className="input pl-4 pr-16 text-lg font-mono" 
                 placeholder="0.000" 
                 value={mwh} onChange={(e) => setMwh(e.target.value)} 
               />
               <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">MWh</div>
             </div>
             <p className="text-[11px] text-gray-500 mt-2">Enter the exact value from your DISCOM JMR (Joint Meter Reading).</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Data Source</label>
            <div className="grid grid-cols-3 gap-3">
               {[
                 { id: 'manual', label: 'Manual Entry', icon: '⌨️' },
                 { id: 'bill_upload', label: 'JMR / Bill', icon: '📄' },
                 { id: 'api', label: 'SCADA API', icon: '🔌' }
               ].map(s => (
                 <div 
                   key={s.id}
                   onClick={() => setSourceData(s.id)}
                   className={`border-2 rounded-xl p-3 text-center cursor-pointer transition-all ${sourceData === s.id ? 'border-[#3FAE5A] bg-[#f0fdf4] text-[#0B3D2E]' : 'border-gray-200 hover:border-gray-300'}`}
                 >
                   <div className="text-xl mb-1">{s.icon}</div>
                   <div className="text-xs font-bold">{s.label}</div>
                 </div>
               ))}
            </div>
          </div>

          {sourceData === 'bill_upload' && (
             <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
                <div className="text-2xl mb-2">☁️</div>
                <div className="text-sm font-semibold text-gray-700">Upload JMR Document (PDF/Image)</div>
                <div className="text-xs text-gray-500 mt-1 mb-4">Must be signed by DISCOM official</div>
                <button type="button" className="btn-secondary text-xs">Choose File...</button>
             </div>
          )}

          <hr className="border-gray-100" />
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800 leading-relaxed">
            <strong>Audit Warning:</strong> Under the Verra AMS-I.D methodology, submitting false generation data is grounds for project termination. All submissions are logged chronologically and checked for capacity limits (MW × CUF).
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-4 text-lg">
            {loading ? 'Submitting...' : 'Submit to Admin for Verification →'}
          </button>
        </form>
      </div>
    </div>
  );
}
