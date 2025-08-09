import Head from 'next/head';

export default function Test() {
  return (
    <>
      <Head>
        <title>TravelMate AI - Style Test</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Style Test Page</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Test */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Card Component</h2>
              <p className="text-gray-600 mb-4">This is a test card to verify styling is working correctly.</p>
              
              <div className="space-y-3">
                <button className="btn-primary w-full">Primary Button</button>
                <button className="btn-secondary w-full">Secondary Button</button>
              </div>
            </div>

            {/* Input Test */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Input Components</h2>
              
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Test input field" 
                  className="input-field"
                />
                
                <select className="input-field">
                  <option>Test select option</option>
                  <option>Another option</option>
                </select>
              </div>
            </div>

            {/* Badge Test */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Badges & Indicators</h2>
              
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <span className="cache-hit-badge">Cache Hit</span>
                  <span className="cache-miss-badge">Cache Miss</span>
                </div>
                
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <span className="ml-2 text-gray-600">Loading...</span>
                </div>
                
                <p className="similarity-score">Similarity: 0.856</p>
              </div>
            </div>

            {/* Metrics Test */}
            <div className="metric-card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Metric Card</h2>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">150ms</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              If you can see this page with proper styling, the CSS is working correctly!
            </p>
            <a href="/" className="btn-primary inline-block mt-4">
              ← Back to Main App
            </a>
          </div>
        </div>
      </div>
    </>
  );
}