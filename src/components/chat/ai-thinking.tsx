import { motion } from 'framer-motion';
import { Loader2, Globe, MapPin, Calendar, DollarSign } from 'lucide-react';

export function ThinkingPanel() {
  const processingSteps = [
    { icon: Globe, label: "Analyzing destination", delay: 0 },
    { icon: Calendar, label: "Checking dates & weather", delay: 0.2 },
    { icon: MapPin, label: "Finding real places", delay: 0.4 },
    { icon: DollarSign, label: "Optimizing budget", delay: 0.6 }
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {/* Main loading animation */}
          <motion.div
            className="mb-8 relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
              <motion.div
                className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-600/30 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </motion.div>
            </div>
          </motion.div>

          <motion.h2
            className="text-2xl font-medium text-white mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Creating your perfect itinerary
          </motion.h2>

          <motion.p
            className="text-slate-400 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Our AI is crafting a personalized travel plan just for you
          </motion.p>

          {/* Processing steps */}
          <div className="space-y-3">
            {processingSteps.map((step, index) => (
              <motion.div
                key={step.label}
                className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: step.delay }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    delay: index * 0.5
                  }}
                >
                  <step.icon className="w-5 h-5 text-blue-400" />
                </motion.div>
                <span className="text-slate-300 text-sm">{step.label}</span>
                <motion.div
                  className="ml-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    delay: step.delay + 0.5
                  }}
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Fun facts or tips */}
          <motion.div
            className="mt-8 p-4 bg-slate-800/30 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="text-slate-400 text-sm">
              💡 Did you know? Our AI analyzes over 100 factors to create your perfect itinerary
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}