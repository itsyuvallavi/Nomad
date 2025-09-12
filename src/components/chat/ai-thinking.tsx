'use client';

import { motion } from 'framer-motion';

export function AIThinking() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="text-center">
        <motion.div
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <h3 className="text-lg font-medium text-gray-900 mb-2">AI is thinking...</h3>
        <p className="text-gray-600">Generating your personalized itinerary</p>
      </div>
    </div>
  );
}