import { motion } from 'framer-motion';
import { Loader2, Globe, MapPin, Calendar, DollarSign, CheckCircle } from 'lucide-react';

interface GenerationProgress {
    stage: 'understanding' | 'planning' | 'generating' | 'finalizing';
    percentage: number;
    message: string;
    estimatedTimeRemaining?: number;
}

interface EnhancedThinkingPanelProps {
    progress: GenerationProgress;
}

export function EnhancedThinkingPanel({ progress }: EnhancedThinkingPanelProps) {
  const stages = [
    { 
      id: 'understanding', 
      icon: Globe, 
      label: "Understanding request",
      description: "Analyzing your travel requirements"
    },
    { 
      id: 'planning', 
      icon: Calendar, 
      label: "Planning trip",
      description: "Researching destinations and dates"
    },
    { 
      id: 'generating', 
      icon: MapPin, 
      label: "Generating itinerary",
      description: "Creating day-by-day activities"
    },
    { 
      id: 'finalizing', 
      icon: DollarSign, 
      label: "Finalizing",
      description: "Adding final touches"
    }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === progress.stage);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="text-center max-w-md w-full">
          {/* Main loading animation */}
          <motion.div
            className="mb-6 md:mb-8 relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
              <motion.div
                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-600/30 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-white animate-spin" />
              </motion.div>
            </div>
          </motion.div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Progress</span>
              <span className="text-sm text-slate-400">{progress.percentage}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Current status */}
          <motion.h2
            className="text-lg md:text-xl font-medium text-white mb-2"
            key={progress.message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {progress.message}
          </motion.h2>

          {/* Time remaining */}
          {progress.estimatedTimeRemaining !== undefined && progress.estimatedTimeRemaining > 0 && (
            <motion.p
              className="text-slate-400 text-sm mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              About {Math.ceil(progress.estimatedTimeRemaining)} seconds remaining
            </motion.p>
          )}

          {/* Processing stages */}
          <div className="space-y-3 mt-6">
            {stages.map((stage, index) => {
              const isComplete = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;

              return (
                <motion.div
                  key={stage.id}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                    isCurrent 
                      ? 'bg-blue-600/20 border border-blue-500/30' 
                      : isComplete 
                      ? 'bg-green-600/10 border border-green-500/20'
                      : 'bg-slate-800/30 border border-slate-700/30'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="relative">
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : isCurrent ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <stage.icon className="w-5 h-5 text-blue-400" />
                      </motion.div>
                    ) : (
                      <stage.icon className={`w-5 h-5 ${isPending ? 'text-slate-500' : 'text-slate-400'}`} />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className={`text-sm font-medium ${
                      isComplete ? 'text-green-400' : 
                      isCurrent ? 'text-white' : 
                      'text-slate-400'
                    }`}>
                      {stage.label}
                    </div>
                    {isCurrent && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {stage.description}
                      </div>
                    )}
                  </div>

                  {isCurrent && (
                    <motion.div
                      className="ml-auto"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Fun facts */}
          <motion.div
            className="mt-6 p-3 md:p-4 bg-slate-800/30 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="text-slate-400 text-xs md:text-sm">
              💡 Our AI checks real-time data from multiple sources to ensure your itinerary is accurate and up-to-date
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}