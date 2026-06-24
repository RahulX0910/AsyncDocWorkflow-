import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">

      {/* Navbar */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">
            Async Document Workflow
          </h1>

          <span className="text-sm text-gray-500">
            Real-time Processing
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Dashboard />
      </main>

    </div>
  );
}