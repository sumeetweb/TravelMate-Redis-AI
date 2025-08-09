import { useState, useEffect } from 'react';
import Head from 'next/head';
import LocationInput from '../components/LocationInput';
import CategorySelector from '../components/CategorySelector';
import StreamingDisplay from '../components/StreamingDisplay';
import MetricsDisplay from '../components/MetricsDisplay';
import Footer from '../components/Footer';
import RedisAIInfoCard from '../components/RedisAIInfoCard';
import TravelMap from '../components/TravelMap';
import { useStreamingQuery } from '../hooks/useStreamingQuery';

// Import Font Awesome CSS
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Home() {
  const [location, setLocation] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [duration, setDuration] = useState(3);
  const [preferences, setPreferences] = useState({
    budget: '',
    dietary: [] as string[],
    accessibility: false,
  });

  const streamingQuery = useStreamingQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location || categories.length === 0) {
      alert('Please enter a location and select at least one category');
      return;
    }

    const queryData = {
      location,
      categories,
      duration,
      preferences: {
        ...preferences,
        budget: preferences.budget || undefined,
        dietary: preferences.dietary.length > 0 ? preferences.dietary : undefined,
      },
    };

    await streamingQuery.startStreaming(queryData);
  };

  const handleClearResults = () => {
    streamingQuery.clearResults();
  };

  const budgetOptions = [
    { value: '', label: 'Any Budget' },
    { value: 'budget', label: 'Budget-friendly' },
    { value: 'mid-range', label: 'Mid-range' },
    { value: 'luxury', label: 'Luxury' },
  ];

  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-free',
    'Halal',
    'Kosher',
  ];

  return (
    <>
      <Head>
        <title>TravelMate AI - Intelligent Travel Planning</title>
        <meta name="description" content="AI-powered travel planning with Redis semantic caching" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-[#FF2D00] shadow-sm border-b border-[#FF2D00]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <img src="/img/logo.png" alt="TravelMate AI Logo" className="h-16 w-28 object-contain" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-white text-[#FF2D00] border border-[#FF2D00]">
                  Redis Vector Search
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-white text-[#FF2D00] border border-[#FF2D00]">
                  OpenAI GPT-4
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Query Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Plan Your Trip</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Location Input with Map */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination
                    </label>
                    <div className="mb-4">
                      <LocationInput
                        value={location}
                        onChange={setLocation}
                        disabled={streamingQuery.isLoading}
                      />
                    </div>
                  </div>

                  {/* Category Selection */}
                  <CategorySelector
                    selectedCategories={categories}
                    onChange={setCategories}
                    disabled={streamingQuery.isLoading}
                  />

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trip Duration
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      disabled={streamingQuery.isLoading}
                      className="input-field"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(day => (
                        <option key={day} value={day}>
                          {day} {day === 1 ? 'day' : 'days'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preferences */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Budget
                      </label>
                      <select
                        value={preferences.budget}
                        onChange={(e) => setPreferences(prev => ({ ...prev, budget: e.target.value }))}
                        disabled={streamingQuery.isLoading}
                        className="input-field"
                      >
                        {budgetOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dietary Requirements
                      </label>
                      <select
                        multiple
                        value={preferences.dietary}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions, option => option.value);
                          setPreferences(prev => ({ ...prev, dietary: values }));
                        }}
                        disabled={streamingQuery.isLoading}
                        className="input-field h-20"
                      >
                        {dietaryOptions.map(option => (
                          <option key={option} value={option.toLowerCase()}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="accessibility"
                      checked={preferences.accessibility}
                      onChange={(e) => setPreferences(prev => ({ ...prev, accessibility: e.target.checked }))}
                      disabled={streamingQuery.isLoading}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="accessibility" className="ml-2 block text-sm text-gray-700">
                      Accessibility requirements needed
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={streamingQuery.isLoading || !location || categories.length === 0}
                  className="flex-1 bg-[#FF2D00] text-white font-bold py-2 px-4 rounded shadow hover:bg-red-700 transition"
                >
                      {streamingQuery.isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Planning Trip...
                        </>
                      ) : (
                        '✈️ Plan My Trip'
                      )}
                    </button>
                    
                    {(streamingQuery.finalResponse || streamingQuery.error) && (
                      <button
                        type="button"
                        onClick={handleClearResults}
                        className="bg-white text-[#FF2D00] font-bold py-2 px-4 rounded shadow border border-[#FF2D00] hover:bg-[#FF2D00] hover:text-white transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Streaming Results */}
              <StreamingDisplay state={streamingQuery} />
            </div>

            {/* Metrics Sidebar */}
            <div className="lg:col-span-1">
              <MetricsDisplay />
              <RedisAIInfoCard />
              <TravelMap itineraryData={streamingQuery.finalResponse} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}