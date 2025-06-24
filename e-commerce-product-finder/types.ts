export interface Product {
  name: string;
  price: string;
  url: string;
  imageUrl?: string; // Will now hold the actual product image URL from the website
}

// For Gemini API's groundingChunks
export interface GroundingChunkWeb {
  uri?: string; // Made optional to match @google/genai type
  title?: string; // Made optional to match @google/genai type and for consistency
}
export interface GroundingChunk {
  web?: GroundingChunkWeb;
  retrievedContext?: { // For non-web sources or alternative structures
    uri?: string; // Made optional for robustness
    title?: string; // Made optional for robustness
  };
  // Add other potential grounding chunk structures if known
}

export interface GeminiServiceResponse {
  products: Product[];
  attributions: GroundingChunk[];
}

export interface SupabaseWebsite {
  id: number;
  url: string;
  created_at: string;
}

// New types for Brand Finder feature
export interface BrandWebsite {
  name: string;
  url: string;
}

export interface GeminiBrandSearchResponse {
  brandWebsites: BrandWebsite[];
  attributions: GroundingChunk[];
}