import React from 'react';

const RedisAIInfoCard: React.FC = () => (
  <div className="mt-8">
    <div className="bg-white rounded-2xl border px-6 py-5 flex flex-col items-center w-full">
      <p className="text-base font-semibold text-[#FF2D00] mb-1 text-center">
        <a href="https://dev.to/devteam/join-the-redis-ai-challenge-3000-in-prizes-3oj2?bb=239625" target="_blank" rel="noopener noreferrer" className="hover:underline">Built for the Redis AI Challenge</a>
      </p>
      <p className="text-xs text-gray-700 mb-2 text-center">Showcasing Redis Stack: Vector Search, JSON, Streams, TimeSeries, Pub/Sub</p>
      <div className="flex space-x-2 mt-2">
        <a href="https://redis.io/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#FF2D00] text-white hover:underline">
          <i className="fa-solid fa-database mr-1"></i>Redis
        </a>
        <a href="https://openai.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#FF2D00] text-white hover:underline">
          <i className="fas fa-brain mr-1"></i>OpenAI
        </a>
        <a href="https://redis.io/docs/stack/ai/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#FF2D00] text-white hover:underline">
          <i className="fas fa-robot mr-1"></i>AI
        </a>
        <a href="https://dev.to/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#FF2D00] text-white hover:underline">
          <i className="fas fa-code mr-1"></i>Dev
        </a>
      </div>
    </div>
  </div>
);

export default RedisAIInfoCard;
