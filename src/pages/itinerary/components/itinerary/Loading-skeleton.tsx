import { motion } from 'framer-motion';

export function ItineraryLoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <motion.div 
          className="h-8 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg w-3/4"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg w-1/2"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        />
      </div>

      {/* Days Skeleton */}
      {[1, 2, 3].map((day, index) => (
        <motion.div
          key={day}
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          {/* Day Header */}
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl"
              animate={{ 
                opacity: [0.5, 0.8, 0.5],
                scale: [0.95, 1, 0.95]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: index * 0.2 
              }}
            />
            <div className="flex-1 space-y-2">
              <motion.div 
                className="h-5 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg w-24"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              />
              <motion.div 
                className="h-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg w-32"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              />
            </div>
          </div>

          {/* Activities Skeleton */}
          <div className="ml-3 md:ml-6 border-l-2 border-slate-600/30 pl-4 md:pl-6 space-y-3">
            {[1, 2, 3].map((activity) => (
              <motion.div
                key={activity}
                className="bg-gradient-to-r from-slate-800/30 to-slate-700/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/30"
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  borderColor: ["rgba(100, 116, 139, 0.3)", "rgba(100, 116, 139, 0.5)", "rgba(100, 116, 139, 0.3)"]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: activity * 0.15 
                }}
              >
                <div className="flex items-start gap-3">
                  <motion.div 
                    className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg"
                    animate={{ 
                      rotate: [0, 360],
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{ 
                      rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                      opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <motion.div 
                        className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg w-32"
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                      />
                      <motion.div 
                        className="h-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg w-16"
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                      />
                    </div>
                    <motion.div 
                      className="h-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg w-full"
                      animate={{ opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    />
                    <motion.div 
                      className="h-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg w-3/4"
                      animate={{ opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Shimmer Effect Overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        style={{ width: "200%" }}
      />
    </div>
  );
}