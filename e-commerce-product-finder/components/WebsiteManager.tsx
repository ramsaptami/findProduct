
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, fetchWebsitesFromSupabase, addWebsiteToSupabase, removeWebsiteFromSupabase } from '../services/supabaseClient';
import { findBrandOfficialWebsite } from '../services/geminiService'; // For brand search
import type { SupabaseWebsite, BrandWebsite, GroundingChunk, GeminiBrandSearchResponse } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface WebsiteManagerProps {
  onWebsitesUpdate: (websites: string[]) => void;
}

const WebsiteManager: React.FC<WebsiteManagerProps> = ({ onWebsitesUpdate }) => {
  // State for Supabase website management
  const [managedWebsites, setManagedWebsites] = useState<SupabaseWebsite[]>([]);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState<string>('');
  const [websiteError, setWebsiteError] = useState<string>('');
  const [isWebsiteLoading, setIsWebsiteLoading] = useState<boolean>(true);

  // State for Brand Finder functionality
  const [brandQuery, setBrandQuery] = useState<string>('');
  const [brandWebsites, setBrandWebsites] = useState<BrandWebsite[]>([]);
  const [brandAttributions, setBrandAttributions] = useState<GroundingChunk[]>([]);
  const [isBrandLoading, setIsBrandLoading] = useState<boolean>(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  const loadWebsites = useCallback(async () => {
    if (!supabase) {
      setIsWebsiteLoading(false);
      onWebsitesUpdate([]);
      return;
    }
    setIsWebsiteLoading(true);
    setWebsiteError('');
    try {
      const websitesFromDb = await fetchWebsitesFromSupabase();
      setManagedWebsites(websitesFromDb);
      onWebsitesUpdate(websitesFromDb.map(w => w.url));
    } catch (e) {
      console.error(e);
      setWebsiteError('Failed to load websites from database.');
      onWebsitesUpdate([]);
    } finally {
      setIsWebsiteLoading(false);
    }
  }, [onWebsitesUpdate]);

  useEffect(() => {
    loadWebsites();
  }, [loadWebsites]);

  const handleAddWebsite = async () => {
    setWebsiteError('');
    if (!newWebsiteUrl.trim()) {
      setWebsiteError('Website URL cannot be empty.');
      return;
    }
    if (!supabase) {
      setWebsiteError("Supabase is not configured. Cannot add website.");
      return;
    }

    let normalizedUrl = newWebsiteUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
      if (managedWebsites.some(site => site.url === normalizedUrl)) {
        setWebsiteError('This website is already in the list.');
        return;
      }
      setIsWebsiteLoading(true); 
      const newSite = await addWebsiteToSupabase(normalizedUrl);
      if (newSite) {
        const updatedWebsites = [...managedWebsites, newSite].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setManagedWebsites(updatedWebsites);
        onWebsitesUpdate(updatedWebsites.map(w => w.url));
        setNewWebsiteUrl('');
      }
    } catch (e: any) {
      setWebsiteError(e.message || 'Failed to add website. Please enter a valid URL (e.g., example.com).');
    } finally {
      setIsWebsiteLoading(false);
    }
  };

  const handleRemoveWebsite = async (id: number) => {
    if (!supabase) {
      setWebsiteError("Supabase is not configured. Cannot remove website.");
      return;
    }
    setIsWebsiteLoading(true); 
    setWebsiteError('');
    try {
      const success = await removeWebsiteFromSupabase(id);
      if (success) {
        const updatedWebsites = managedWebsites.filter(site => site.id !== id);
        setManagedWebsites(updatedWebsites);
        onWebsitesUpdate(updatedWebsites.map(w => w.url));
      } else {
        setWebsiteError('Failed to remove website from database.');
      }
    } catch (e: any) {
       setWebsiteError(e.message || 'Failed to remove website.');
    } finally {
      setIsWebsiteLoading(false);
    }
  };

  const handleBrandSearch = useCallback(async () => {
    if (!brandQuery.trim()) {
      setBrandError('Please enter a brand name to search.');
      return;
    }
    setIsBrandLoading(true);
    setBrandError(null);
    setBrandWebsites([]);
    setBrandAttributions([]);
    try {
      const result: GeminiBrandSearchResponse = await findBrandOfficialWebsite(brandQuery);
      setBrandWebsites(result.brandWebsites);
      setBrandAttributions(result.attributions);
      if (result.brandWebsites.length === 0) {
        setBrandError(`No official website found for "${brandQuery}". Gemini couldn't find relevant information.`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setBrandError(err.message);
      } else {
        setBrandError('An unknown error occurred while searching for the brand website.');
      }
      console.error("Brand search error:", err);
    } finally {
      setIsBrandLoading(false);
    }
  }, [brandQuery]);
  
  return (
    <div className="bg-[#FFFEF9] p-6 rounded-lg shadow-md mb-8">
      {/* Website Management Section */}
      <h2 className="text-2xl font-semibold text-[#372D2D] mb-4">Manage Target Websites</h2>
      {supabase && (
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={newWebsiteUrl}
              onChange={(e) => setNewWebsiteUrl(e.target.value)}
              placeholder="Enter website URL (e.g., example.com)"
              className="flex-grow p-3 bg-white border border-[#6A8899] rounded-lg focus:ring-2 focus:ring-[#6A8899] focus:border-transparent outline-none transition-shadow text-[#372D2D] placeholder:text-[#6A8899] placeholder-opacity-75"
              aria-label="New website URL"
            />
            <button
              onClick={handleAddWebsite}
              disabled={isWebsiteLoading}
              className="bg-[#91A980] hover:bg-[#7D9A70] text-[#372D2D] font-semibold py-3 px-6 rounded-lg transition-colors shadow hover:shadow-md disabled:opacity-50"
            >
              {isWebsiteLoading && managedWebsites.length > 0 ? 'Processing...' : 'Add Website'}
            </button>
          </div>
          {websiteError && <p className="text-red-600 bg-red-100 border-red-300 p-2 rounded-md text-sm mb-3" role="alert">{websiteError}</p>}
          
          {isWebsiteLoading && managedWebsites.length === 0 && <LoadingSpinner />}

          {!isWebsiteLoading && managedWebsites.length === 0 && !websiteError && (
            <p className="text-[#372D2D]">No websites added yet. Add websites to search for products on them.</p>
          )}

          {managedWebsites.length > 0 && (
            <ul className="space-y-2 mb-6">
              {managedWebsites.map((site) => (
                <li
                  key={site.id}
                  className="flex justify-between items-center p-3 bg-white rounded-md border border-[#9BAFAB]"
                >
                  <span className="text-[#372D2D] break-all">{site.url}</span>
                  <button
                    onClick={() => handleRemoveWebsite(site.id)}
                    disabled={isWebsiteLoading}
                    className="text-[#6A8899] hover:text-[#506A7A] font-semibold transition-colors ml-2 disabled:opacity-50"
                    aria-label={`Remove ${site.url}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {!supabase && isWebsiteLoading && <LoadingSpinner />} 
      {!supabase && !isWebsiteLoading && (
         <p className="text-[#372D2D]">Website management is currently unavailable. Please check configuration.</p>
      )}

      {/* Brand Finder Section - Integrated */}
      <div className="mt-8 pt-6 border-t border-[#9BAFAB]">
        <h3 className="text-xl font-semibold text-[#372D2D] mb-4">Find Brand Website</h3>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            value={brandQuery}
            onChange={(e) => setBrandQuery(e.target.value)}
            placeholder="Enter brand name (e.g., Nike, Sony)"
            className="flex-grow p-3 bg-white border border-[#6A8899] rounded-lg focus:ring-2 focus:ring-[#6A8899] focus:border-transparent outline-none transition-shadow text-[#372D2D] placeholder:text-[#6A8899] placeholder-opacity-75"
            aria-label="Brand name"
          />
          <button
            onClick={handleBrandSearch}
            disabled={isBrandLoading}
            className="bg-[#91A980] hover:bg-[#7D9A70] text-[#372D2D] font-semibold py-3 px-6 rounded-lg transition-colors shadow hover:shadow-md disabled:opacity-50"
          >
            {isBrandLoading ? 'Searching...' : 'Find Brand Website'}
          </button>
        </div>
        
        {isBrandLoading && <LoadingSpinner />}
        {brandError && <p className="text-red-600 bg-red-100 border border-red-300 p-3 rounded-md my-4 text-sm">{brandError}</p>}

        {!isBrandLoading && !brandError && brandWebsites.length === 0 && brandQuery && (
          <p className="text-[#372D2D] mt-4">No results to display. Try refining your search.</p>
        )}

        {brandWebsites.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-[#372D2D] mb-3">Official Website(s) Found for "{brandQuery}":</h4>
            <ul className="space-y-2 list-disc list-inside">
              {brandWebsites.map((site, index) => (
                <li key={`${site.url}-${index}`} className="text-sm">
                  <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-[#6A8899] hover:text-[#506A7A] hover:underline transition-colors font-medium">
                    {site.name} - {site.url}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {brandAttributions.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#6A8899]">
            <h4 className="text-lg font-semibold text-[#372D2D] mb-3">Information Sources (from Google Search via Gemini):</h4>
            <ul className="space-y-2 list-disc list-inside">
              {brandAttributions.map((attr, index) => {
                const uri = attr.web?.uri || attr.retrievedContext?.uri;
                const title = attr.web?.title || attr.retrievedContext?.title || uri;
                if (uri) {
                  return (
                    <li key={`brand-attr-${index}`} className="text-sm">
                      <a href={uri} target="_blank" rel="noopener noreferrer" className="text-[#6A8899] hover:text-[#506A7A] hover:underline transition-colors">
                        {title || uri}
                      </a>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteManager;