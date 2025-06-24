
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Product, GroundingChunk, GeminiServiceResponse, BrandWebsite, GeminiBrandSearchResponse } from '../types';

let ai: GoogleGenAI | null = null;

if (!process.env.API_KEY) {
  console.error(
    "Gemini API Key is not configured. " +
    "Please set the API_KEY environment variable. " +
    "Gemini features will be unavailable."
  );
} else {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client:", error);
    // ai remains null
  }
}

const textModel = "gemini-2.5-flash-preview-04-17";
// const imageModel = "imagen-3.0-generate-002"; // No longer needed for AI image generation

const parseProductResponse = (responseText: string): Partial<Product>[] => {
  const products: Partial<Product>[] = [];
  if (!responseText || responseText.trim().toLowerCase() === "no products found on the specified websites." || responseText.trim().toLowerCase() === "no products found.") {
    return products;
  }

  const productBlocks = responseText.split(/-{3,}/).map(block => block.trim()).filter(block => block.length > 0);

  productBlocks.forEach(block => {
    const lines = block.split('\n').map(line => line.trim());
    const product: Partial<Product> = {};
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      if (key && value) {
        if (key.toUpperCase().includes("PRODUCT_NAME")) {
          product.name = value;
        } else if (key.toUpperCase().includes("PRODUCT_PRICE")) {
          product.price = value;
        } else if (key.toUpperCase().includes("PRODUCT_URL")) {
          product.url = value;
        } else if (key.toUpperCase().includes("PRODUCT_IMAGE_URL")) {
          product.imageUrl = (value.toLowerCase() === 'n/a' || value.toLowerCase() === 'not found') ? undefined : value;
        }
      }
    });

    if (product.name && product.url) { // Price is optional, imageUrl is optional
      products.push({
        name: product.name,
        price: product.price || "N/A",
        url: product.url,
        imageUrl: product.imageUrl,
      });
    }
  });
  return products;
};

// Removed generateProductImageInternal as we are fetching actual image URLs

const parseBrandWebsiteResponse = (responseText: string): BrandWebsite[] => {
  const brandWebsites: BrandWebsite[] = [];
   if (!responseText || responseText.trim().toLowerCase().startsWith("no official website found for")) {
    return brandWebsites;
  }
  
  const websiteBlocks = responseText.split(/-{3,}/).map(block => block.trim()).filter(block => block.length > 0);

  websiteBlocks.forEach(block => {
    const lines = block.split('\n').map(line => line.trim());
    const brandSite: Partial<BrandWebsite> = {};
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      if (key && value) {
        if (key.toUpperCase().includes("BRAND_NAME")) {
          brandSite.name = value;
        } else if (key.toUpperCase().includes("BRAND_URL")) {
          brandSite.url = value;
        }
      }
    });
    if (brandSite.name && brandSite.url) {
      brandWebsites.push(brandSite as BrandWebsite);
    }
  });
  return brandWebsites;
}

export const findProductsOnWebsites = async (
  productDescription: string,
  websites: string[] // If empty, will search general internet
): Promise<GeminiServiceResponse> => {
  if (!ai) {
    throw new Error(
        "Gemini API client is not initialized. " +
        "Please ensure the API_KEY environment variable is correctly configured."
    );
  }

  let prompt = `You are an expert e-commerce product finder. Your task is to find actual product listings for "${productDescription}"`;

  if (websites.length > 0) {
    prompt += ` only on the following websites: ${websites.join(', ')}.`;
    prompt += `\nOnly include products found on the specified websites. Ensure PRODUCT_URL is a direct link to the product page on one of the given websites.`;
  } else {
    prompt += ` from across the internet. Prioritize official brand websites or major retailers.`;
  }

  prompt += `
For each product found, present the information strictly in this format, with each field on a new line and products separated by "---":
PRODUCT_NAME: [Name of the product]
PRODUCT_PRICE: [Price, e.g., $XX.XX or N/A if not found]
PRODUCT_URL: [Full product page URL]
PRODUCT_IMAGE_URL: [Direct URL to the main product image on the product page, or N/A if not found or not applicable]
---
If no products are found, respond with "No products found."
`;

  try {
    const textSearchResponse: GenerateContentResponse = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const parsedProductsInfo = parseProductResponse(textSearchResponse.text);
    // Directly use parsed products as they now include the actual imageUrl
    const products: Product[] = parsedProductsInfo.filter(p => p.name && p.url).map(p => p as Product); 
    
    const attributions: GroundingChunk[] = textSearchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { products, attributions };

  } catch (error) {
    console.error("Error calling Gemini API for products:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to fetch products from Gemini API: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching products.");
  }
};

export const findBrandOfficialWebsite = async (
  brandName: string
): Promise<GeminiBrandSearchResponse> => {
  if (!ai) {
    throw new Error(
      "Gemini API client is not initialized. " +
      "Please ensure the API_KEY environment variable is correctly configured."
    );
  }

  const prompt = `You are an expert brand information retriever. Your task is to find the official website URL for the brand: "${brandName}".
Return only the most relevant and official website link(s). If multiple official regional sites exist (e.g., brand.com, brand.co.uk), you can list a few main ones.
For each website found, present the information strictly in this format, with each field on a new line and entries separated by "---":
BRAND_NAME: [Official Brand Name Found, e.g., Nike Global]
BRAND_URL: [Full Official Website URL]
---
If no definitive official website is found for "${brandName}", respond with "No official website found for ${brandName}."
Ensure the BRAND_URL is a direct link to an official brand page.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const brandWebsites = parseBrandWebsiteResponse(response.text);
    const attributions: GroundingChunk[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { brandWebsites, attributions };

  } catch (error) {
    console.error("Error calling Gemini API for brand website:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch brand website from Gemini API: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching brand website.");
  }
};