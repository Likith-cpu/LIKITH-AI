import React, { useState } from 'react';
import { PhotoEditor } from './components/PhotoEditor';
import { VideoEditor } from './components/VideoEditor';
import { PhotoIcon, VideoCameraIcon } from './components/Icons';

type Tab = 'photo' | 'video';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('photo');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'photo':
        return <PhotoEditor />;
      case 'video':
        return <VideoEditor />;
      default:
        return null;
    }
  };

  // Fix: Changed icon type from JSX.Element to React.ReactNode to resolve namespace error.
  const TabButton = ({ tabName, label, icon }: { tabName: Tab, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center justify-center w-full px-4 py-3 font-bold text-lg rounded-t-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        activeTab === tabName
          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 pb-2">
            Likith.S
          </h1>
          <p className="text-gray-400 text-lg md:text-xl tracking-widest uppercase">AI Media Studio</p>
        </header>

        <main>
          <div className="flex">
            <TabButton tabName="photo" label="Photo Wizard" icon={<PhotoIcon />} />
            <TabButton tabName="video" label="Video Crafter" icon={<VideoCameraIcon />} />
          </div>
          <div className="bg-gray-800 p-6 md:p-8 rounded-b-lg rounded-tr-lg shadow-2xl border border-gray-700">
            {renderTabContent()}
          </div>
        </main>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;