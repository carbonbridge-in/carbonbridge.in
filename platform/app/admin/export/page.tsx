'use client';

export default function AdminExportPage() {
  return (
    <div className="animate-fadeUp max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0B3D2E] tracking-tight">Data Export</h1>
        <p className="text-gray-500 font-medium mt-1">Download complete registry data for external auditors</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card border-l-4 border-l-[#3FAE5A]">
          <div className="text-2xl mb-4">📊</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">CSV Export</h2>
          <p className="text-sm text-gray-500 mb-6 line-clamp-2">Complete spreadsheet of all projects and verified generation data. Best for Excel analysis.</p>
          <a href="/api/admin/export?format=csv" className="btn-secondary w-full justify-center">Download CSV</a>
        </div>

        <div className="card border-l-4 border-l-[#0B3D2E]">
          <div className="text-2xl mb-4">🤖</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">JSON Export</h2>
          <p className="text-sm text-gray-500 mb-6 line-clamp-2">Structured JSON payload with AMS-I.D schemas. Best for Verra/Gold Standard APIs or AI ingestion.</p>
          <a href="/api/admin/export?format=json" className="btn-primary w-full justify-center">Download JSON</a>
        </div>
      </div>
    </div>
  );
}
