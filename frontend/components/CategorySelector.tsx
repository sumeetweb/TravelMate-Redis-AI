import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

interface CategorySelectorProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
}

const defaultCategories: Category[] = [
  {
    id: 'attractions',
    name: 'Attractions',
    subcategories: ['Museums', 'Landmarks', 'Parks', 'Historical Sites']
  },
  {
    id: 'dining',
    name: 'Dining',
    subcategories: ['Restaurants', 'Cafes', 'Street Food', 'Bars', 'Local Cuisine']
  },
  {
    id: 'activities',
    name: 'Activities',
    subcategories: ['Tours', 'Shopping', 'Nightlife', 'Sports', 'Entertainment']
  },
  {
    id: 'accommodation',
    name: 'Accommodation',
    subcategories: ['Hotels', 'Hostels', 'Unique Stays']
  },
  {
    id: 'transportation',
    name: 'Transportation',
    subcategories: ['Public Transit', 'Car Rentals', 'Walking Routes']
  }
];

export default function CategorySelector({ selectedCategories, onChange, disabled = false }: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/travel/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // Keep default categories on error
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryToggle = (categoryId: string) => {
    if (disabled) return;

    const newSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    onChange(newSelection);
  };

  const getCategoryIcon = (categoryId: string) => {
    const icons = {
      attractions: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      dining: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      activities: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9 5a9 9 0 1118 0H3z" />
        </svg>
      ),
      accommodation: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      transportation: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      )
    };
    return icons[categoryId as keyof typeof icons] || icons.attractions;
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        What are you interested in? (Select multiple)
      </label>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category.id);
          
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategoryToggle(category.id)}
              disabled={disabled}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 text-left
                ${isSelected
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center space-x-3">
                <div className={`
                  ${isSelected ? 'text-primary-500' : 'text-gray-400'}
                `}>
                  {getCategoryIcon(category.id)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {category.subcategories.slice(0, 2).join(', ')}
                    {category.subcategories.length > 2 && '...'}
                  </div>
                </div>
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center
                  ${isSelected
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300'
                  }
                `}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      {selectedCategories.length > 0 && (
        <div className="text-sm text-gray-600">
          Selected: {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'}
        </div>
      )}
    </div>
  );
}