import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className = '', animate = true }: SkeletonProps) {
  return (
    <div 
      className={`bg-slate-700/50 rounded ${className} ${animate ? 'animate-pulse' : ''}`}
    />
  );
}

export function ItinerarySkeleton() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
      {/* Trip Overview Skeleton */}
      <div className="p-4 md:p-6 border-b border-slate-600/50">
        <Skeleton className="h-8 w-3/4 mb-3" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        
        <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>

      {/* Days Skeleton */}
      <div className="p-4 md:p-6 space-y-6">
        {[1, 2, 3].map((day) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: day * 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-5 w-20 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            
            {/* Activity Skeletons */}
            <div className="space-y-3 ml-3 md:ml-6 border-l-2 border-slate-600 pl-4 md:pl-6">
              {[1, 2, 3].map((activity) => (
                <motion.div
                  key={activity}
                  className="bg-slate-700/30 rounded-xl p-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: day * 0.1 + activity * 0.05 }}
                >
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-5 h-5 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <motion.div
      className="flex justify-start"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-slate-700/80 rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </motion.div>
  );
}

export function ActivityCardSkeleton() {
  return (
    <div className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-5 h-5 rounded" />
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <div className="flex items-center gap-2 mt-3">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}