'use client';

import { motion, AnimatePresence } from 'framer-motion';
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

export function ModernLoadingPanel({ progress }: ModernLoadingPanelProps) {
  const stages = [
    { 
      id: 'understanding', 
      label: 'Analyzing',
      description: 'Processing your request'
    },
    { 
      id: 'planning', 
      label: 'Planning',
      description: 'Structuring itinerary'
    },
    { 
      id: 'generating', 
      label: 'Creating',
      description: 'Building your journey'
    },
    { 
      id: 'finalizing', 
      label: 'Finalizing',
      description: 'Final optimizations'
    }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === progress.stage);

  return (
    <div className="h-full w-full bg-white flex items-center justify-center p-8 relative overflow-hidden">
      {/* Subtle geometric background pattern */}
      <div className="absolute inset-0 overflow-hidden opacity-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute border border-gray-900"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: i % 2 === 0 ? '0%' : '50%',
            }}
            animate={{
              rotate: i % 2 === 0 ? 360 : -360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 20 + i * 5, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <motion.div 
        className="relative z-10 max-w-xl w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h2 
            className="text-2xl font-light text-gray-900 mb-2 tracking-wide"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Crafting your journey
          </motion.h2>
          
          <p className="text-gray-500 text-sm">
            {progress.message}
          </p>
        </div>

        {/* Progress stages - minimal dots */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-8">
            {stages.map((stage, index) => (
              <div key={stage.id} className="relative">
                <motion.div
                  className={`w-2 h-2 rounded-full ${
                    index <= currentStageIndex 
                      ? 'bg-gray-900' 
                      : 'bg-gray-300'
                  }`}
                  animate={{ 
                    scale: index === currentStageIndex ? [1, 1.5, 1] : 1,
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: index === currentStageIndex ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                />
                
                {/* Connection line */}
                {index < stages.length - 1 && (
                  <div className="absolute top-1/2 left-full w-8 h-px -translate-y-1/2">
                    <motion.div 
                      className="h-full bg-gray-900"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: index < currentStageIndex ? '100%' : '0%'
                      }}
                      transition={{ duration: 0.5 }}
                    />
                    <div className="h-full bg-gray-300 -mt-px" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Current stage label */}
          <div className="text-center mt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={progress.stage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-sm font-medium text-gray-900">
                  {stages[currentStageIndex].label}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stages[currentStageIndex].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Main progress bar - thin and minimal */}
        <div className="mb-8">
          <div className="h-px bg-gray-200 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full bg-gray-900"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-400">Progress</span>
            <span className="text-xs font-medium text-gray-600">{Math.round(progress.percentage)}%</span>
          </div>
        </div>

        {/* Animated text placeholder - skeleton-like */}
        <div className="space-y-3 mb-8">
          {[1, 2, 3].map((line) => (
            <motion.div
              key={line}
              className="h-2 bg-gray-100 rounded"
              style={{ width: `${100 - line * 15}%` }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: line * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Time remaining - subtle */}
        {progress.estimatedTimeRemaining !== undefined && progress.estimatedTimeRemaining > 0 && (
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs text-gray-400">
              {Math.ceil(progress.estimatedTimeRemaining)}s remaining
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}