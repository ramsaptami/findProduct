
import React, { useState, useCallback } from 'react';
import WebsiteManager from './components/WebsiteManager';
import ProductFinder from './components/ProductFinder';
// import BrandFinder from './components/BrandFinder'; // Removed: Functionality merged into WebsiteManager
import { supabase } from './services/supabaseClient'; // Import supabase to check configuration

const App: React.FC = () => {
  const [websites, setWebsites] = useState<string[]>([]);
  const isSupabaseConfigured = !!supabase; // Check if supabase client is initialized

  const handleWebsitesUpdate = useCallback((updatedWebsites: string[]) => {
    setWebsites(updatedWebsites);
  }, []);
  
  return (
    <div className="min-h-screen bg-[#9BAFAB] py-8 px-4 sm:px-6 lg:px-8 flex flex-col">
      <header className="text-center mb-10">
        <h1 className="text-5xl font-extrabold text-[#FFFEF9]">
          E-Commerce Product Finder
        </h1>
      </header>
      
      <main className="max-w-4xl mx-auto space-y-8 flex-grow w-full">
        <div className="animate-fadeInUp" style={{animationDelay: '0.1s'}}>
          <WebsiteManager onWebsitesUpdate={handleWebsitesUpdate} />
        </div>
        <div className="animate-fadeInUp" style={{animationDelay: '0.3s'}}>
          <ProductFinder websites={websites} />
        </div>
      </main>

      <footer className="text-center mt-12 py-6 border-t border-[#FFFEF9]">
        <p className="text-sm text-[#FFFEF9]">
          Powered by React, Tailwind CSS, Google Gemini API, and Supabase.
        </p>
      </footer>

      {!isSupabaseConfigured && (
        <div className="max-w-4xl mx-auto mt-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md shadow-md text-sm animate-fadeInUp" style={{animationDelay: '0.5s'}}>
          <p className="font-semibold">Supabase Configuration Issue:</p>
          <p>Supabase is not configured correctly. Please check your environment variables (VITE_SUPABASE_PROJECT_URL, VITE_SUPABASE_ANON_KEY). Website management features will be unavailable.</p>
        </div>
      )}
    </div>
  );
};

export default App;