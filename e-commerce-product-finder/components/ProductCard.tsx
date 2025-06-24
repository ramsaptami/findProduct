
import React from 'react';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  // Download image button removed as fetching actual images and making them downloadable
  // can be complex due to CORS and is not the primary goal here.
  // Displaying the image is prioritized.

  return (
    <div className="bg-[#FFFEF9] p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col">
      <h3 className="text-xl font-semibold text-[#372D2D] mb-2">{product.name}</h3>
      <p className="text-[#372D2D] mb-1">
        <span className="font-medium">Price:</span> {product.price}
      </p>
      
      {product.imageUrl && (
        <div className="my-4">
          <img 
            src={product.imageUrl} 
            alt={`Product image of ${product.name}`} 
            className="w-full h-auto object-contain rounded-md max-h-60" 
            // crossOrigin="anonymous" // May or may not be needed depending on image source, can cause issues if not configured correctly on server.
          />
          {/* Download button removed */}
        </div>
      )}
      
      <div className="mt-auto"> {/* Pushes View Product link to the bottom if image exists and takes space */}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-[#6A8899] hover:text-[#506A7A] hover:underline font-medium transition-colors"
        >
          View Product
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default ProductCard;