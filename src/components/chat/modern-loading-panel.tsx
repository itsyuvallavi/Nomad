'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plane, MapPin, Clock, Globe, Sparkles, Coffee, Camera, Building } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GenerationProgress {
    stage: 'understanding' | 'planning' | 'generating' | 'finalizing';
    percentage: number;
    message: string;
    estimatedTimeRemaining?: number;
}

interface ModernLoadingPanelProps {
    progress: GenerationProgress;
}

const travelTips = [
  "Pack light and bring versatile clothing",
  "Always have a portable charger",
  "Download offline maps before you go",
  "Keep digital copies of important documents",
  "Learn basic phrases in the local language",
  "Check visa requirements early",
  "Book accommodations with free cancellation",
  "Use incognito mode for flight searches",
  "Pack a universal adapter",
  "Bring a reusable water bottle"
];

const destinations = [
  { city: "Tokyo", icon: "🗼", color: "from-pink-400 to-purple-400" },
  { city: "Paris", icon: "🗼", color: "from-blue-400 to-indigo-400" },
  { city: "New York", icon: "🗽", color: "from-yellow-400 to-orange-400" },
  { city: "Bali", icon: "🏝️", color: "from-green-400 to-teal-400" },
  { city: "London", icon: "🎡", color: "from-red-400 to-pink-400" },
  { city: "Dubai", icon: "🏙️", color: "from-purple-400 to-indigo-400" }
];

export function ModernLoadingPanel({ progress }: ModernLoadingPanelProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [floatingIcons, setFloatingIcons] = useState<Array<{ id: number; Icon: any; x: number; y: number }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % travelTips.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const icons = [Plane, MapPin, Camera, Coffee, Building, Globe];
    const newIcons = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      Icon: icons[i],
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10
    }));
    setFloatingIcons(newIcons);
  }, []);

  const stages = [
    { 
      id: 'understanding', 
      label: 'Understanding',
      icon: '🎯',
      description: 'Analyzing your preferences'
    },
    { 
      id: 'planning', 
      label: 'Planning',
      icon: '📍',
      description: 'Mapping out destinations'
    },
    { 
      id: 'generating', 
      label: 'Creating',
      icon: '✨',
      description: 'Building your itinerary'
    },
    { 
      id: 'finalizing', 
      label: 'Finalizing',
      icon: '🎉',
      description: 'Adding final touches'
    }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === progress.stage);

  return (
    <div className="h-full w-full bg-white flex items-center justify-center p-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {floatingIcons.map((item, index) => (
          <motion.div
            key={item.id}
            className="absolute text-gray-100"
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              rotate: [0, 360],
            }}
            transition={{
              duration: 15 + index * 2,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <item.Icon size={30 + index * 5} />
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <motion.div 
        className="relative z-10 max-w-2xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header with animated plane */}
        <div className="text-center mb-12">
          <motion.div 
            className="inline-block relative"
            animate={{ 
              x: [-100, 100, -100],
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Plane className="w-8 h-8 text-gray-800 transform -rotate-45" />
            <motion.div
              className="absolute -right-2 top-0"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </motion.div>
          </motion.div>
          
          <motion.h2 
            className="text-3xl font-bold text-gray-900 mt-6 mb-2"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ✈️ Crafting Your Perfect Journey
          </motion.h2>
          
          <p className="text-gray-600 text-lg">
            {progress.message}
          </p>
        </div>

        {/* Progress stages - horizontal */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <motion.div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-2 ${
                      index <= currentStageIndex 
                        ? 'bg-gray-900 shadow-lg' 
                        : 'bg-gray-100'
                    }`}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ 
                      scale: index === currentStageIndex ? [1, 1.1, 1] : 1,
                      rotate: 0
                    }}
                    transition={{ 
                      scale: { duration: 1, repeat: index === currentStageIndex ? Infinity : 0 },
                      rotate: { type: "spring", duration: 0.6, delay: index * 0.1 }
                    }}
                  >
                    <span className={index <= currentStageIndex ? 'filter grayscale-0' : 'filter grayscale opacity-50'}>
                      {stage.icon}
                    </span>
                  </motion.div>
                  
                  <span className={`text-sm font-medium ${
                    index <= currentStageIndex ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {stage.label}
                  </span>
                </div>
                
                {/* Connection line */}
                {index < stages.length - 1 && (
                  <div className="absolute top-8 left-1/2 w-full h-0.5 -z-10">
                    <motion.div 
                      className="h-full bg-gray-900"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: index < currentStageIndex ? '100%' : '0%'
                      }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                    <div className="h-full bg-gray-200 -mt-0.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main progress bar */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-bold text-gray-900">{progress.percentage}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full bg-gradient-to-r from-gray-800 to-gray-600 relative"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ width: "50%" }}
              />
            </motion.div>
          </div>
        </div>

        {/* Destination cards carousel */}
        <div className="mb-8">
          <motion.div 
            className="flex gap-3 justify-center"
            animate={{ x: [-20, 20, -20] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          >
            {destinations.slice(0, 4).map((dest, index) => (
              <motion.div
                key={dest.city}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{dest.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{dest.city}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Travel tip */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTip}
            className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">💡</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Travel Tip</h4>
                <p className="text-gray-600 text-sm">{travelTips[currentTip]}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Time remaining */}
        {progress.estimatedTimeRemaining !== undefined && progress.estimatedTimeRemaining > 0 && (
          <motion.div 
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>About {Math.ceil(progress.estimatedTimeRemaining)} seconds remaining</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}