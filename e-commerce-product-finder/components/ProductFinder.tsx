
import React, { useState, useCallback } from 'react';
import { findProductsOnWebsites } from '../services/geminiService';
import type { Product, GroundingChunk, GeminiServiceResponse } from '../types';
import ProductCard from './ProductCard';
import LoadingSpinner from './LoadingSpinner';

interface ProductFinderProps {
  websites: string[];
}

const ProductFinder: React.FC<ProductFinderProps> = ({ websites }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInternet, setSearchInternet] = useState<boolean>(false); // New state for general search
  const [products, setProducts] = useState<Product[]>([]);
  const [attributions, setAttributions] = useState<GroundingChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a product description to search.');
      return;
    }
    if (!searchInternet && websites.length === 0) {
      setError('Please add at least one website to search on, or select "Search entire internet".');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProducts([]);
    setAttributions([]);

    const targetWebsites = searchInternet ? [] : websites;

    try {
      const result: GeminiServiceResponse = await findProductsOnWebsites(searchQuery, targetWebsites);
      setProducts(result.products);
      setAttributions(result.attributions);
      if (result.products.length === 0) { // Removed attributions check here for simplicity in error message
        setError(`No products found for your query${targetWebsites.length > 0 ? ' on the specified websites' : ''}. Gemini couldn't find relevant information or products.`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, websites, searchInternet]);

  return (
    <div className="bg-[#FFFEF9] p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-[#372D2D] mb-4">Find Products</h2>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter product description (e.g., green couch)"
          className="flex-grow p-3 bg-white border border-[#6A8899] rounded-lg focus:ring-2 focus:ring-[#6A8899] focus:border-transparent outline-none transition-shadow text-[#372D2D] placeholder:text-[#6A8899] placeholder-opacity-75"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading || (!searchInternet && websites.length === 0)}
          className="bg-[#91A980] hover:bg-[#7D9A70] text-[#372D2D] font-semibold py-3 px-6 rounded-lg transition-colors shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching...' : 'Search Products'}
        </button>
      </div>
      
      <div className="mb-4">
        <label className="flex items-center text-[#372D2D]">
          <input
            type="checkbox"
            checked={searchInternet}
            onChange={(e) => setSearchInternet(e.target.checked)}
            className="form-checkbox h-5 w-5 text-[#6A8899] rounded border-[#6A8899] focus:ring-[#6A8899] focus:ring-offset-0 mr-2"
          />
          Search entire internet (may take longer and use more resources)
        </label>
      </div>
      
      {isLoading && <LoadingSpinner />}
      
      {error && <p className="text-red-600 bg-red-100 border border-red-300 p-3 rounded-md my-4 text-sm">{error}</p>}

      {!isLoading && !error && products.length === 0 && attributions.length === 0 && searchQuery && !searchInternet && !websites.length && (
         <p className="text-[#372D2D] mt-4">Please add websites in the section above to search on them, or check "Search entire internet".</p>
      )}
       {!isLoading && !error && products.length === 0 && attributions.length === 0 && searchQuery && (searchInternet || websites.length > 0) && (
        <p className="text-[#372D2D] mt-4">No results to display. Try refining your search or broadening the search scope.</p>
      )}


      {products.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-[#372D2D] mb-3">Found Products:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <ProductCard key={`${product.url}-${index}`} product={product} />
            ))}
          </div>
        </div>
      )}

      {attributions.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[#6A8899]">
          <h4 className="text-lg font-semibold text-[#372D2D] mb-3">Information Sources (from Google Search via Gemini):</h4>
          <ul className="space-y-2 list-disc list-inside">
            {attributions.map((attr, index) => {
              const uri = attr.web?.uri || attr.retrievedContext?.uri;
              const title = attr.web?.title || attr.retrievedContext?.title || uri;
              if (uri) {
                return (
                  <li key={index} className="text-sm">
                    <a href={uri} target="_blank" rel="noopener noreferrer" className="text-[#6A8899] hover:text-[#506A7A] hover:underline transition-colors">
                      {title || uri}
                    </a>
                  </li>
                );
              }
              return null;
            })}
          </ul>
           <p className="text-xs text-[#372D2D] opacity-80 mt-2">These sources were used by Gemini to help find information. Product listings above are extracted from Gemini's response.</p>
        </div>
      )}
    </div>
  );
};

export default ProductFinder;