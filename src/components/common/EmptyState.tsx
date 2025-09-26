import { motion } from 'framer-motion';
import { MapPin, Sparkles, Calendar, Globe, Plane, Mountain, Coffee } from 'lucide-react';
import { memo } from 'react';

interface EmptyStateProps {
  type: 'no-messages' | 'no-itinerary' | 'no-results' | 'loading';
  title?: string;
  description?: string;
}

function EmptyStateComponent({ type, title, description }: EmptyStateProps) {
  const getIllustration = () => {
    switch (type) {
      case 'no-messages':
        return (
          <motion.div className="relative w-32 h-32 mx-auto">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="relative w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center shadow-2xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <Sparkles className="w-12 h-12 text-blue-400" />
            </motion.div>
            <motion.div
              className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full shadow-lg"
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 360]
              }}
              transition={{ 
                y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 4, repeat: Infinity, ease: "linear" }
              }}
            />
          </motion.div>
        );
      
      case 'no-itinerary':
        return (
          <motion.div className="relative w-32 h-32 mx-auto">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full blur-2xl"
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative w-full h-full flex items-center justify-center">
              <motion.div
                animate={{ 
                  y: [0, -5, 0],
                  rotate: [-5, 5, -5]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Globe className="w-20 h-20 text-slate-600" />
              </motion.div>
              <motion.div
                className="absolute"
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                <Plane className="w-8 h-8 text-blue-400 absolute -top-8 left-12" />
              </motion.div>
            </div>
          </motion.div>
        );
      
      case 'no-results':
        return (
          <motion.div className="relative w-32 h-32 mx-auto">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-2xl"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="relative w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center shadow-2xl"
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <MapPin className="w-12 h-12 text-slate-500" />
              <motion.span
                className="absolute -top-2 -right-2 text-2xl"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 20, -20, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                ❓
              </motion.span>
            </motion.div>
          </motion.div>
        );
      
      case 'loading':
        return (
          <motion.div className="relative w-32 h-32 mx-auto">
            <motion.div className="absolute inset-0 flex items-center justify-center">
              {[Mountain, Coffee, Calendar].map((Icon, index) => (
                <motion.div
                  key={index}
                  className="absolute"
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.4
                  }}
                  style={{
                    transform: `rotate(${index * 120}deg) translateX(40px)`
                  }}
                >
                  <Icon className="w-8 h-8 text-blue-400" />
                </motion.div>
              ))}
            </motion.div>
            <motion.div
              className="w-full h-full flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Globe className="w-16 h-16 text-slate-600" />
            </motion.div>
          </motion.div>
        );
    }
  };

  const getContent = () => {
    switch (type) {
      case 'no-messages':
        return {
          title: title || "Start Your Adventure",
          description: description || "Tell me where you'd like to go and I'll craft the perfect itinerary for you!"
        };
      case 'no-itinerary':
        return {
          title: title || "No Itinerary Yet",
          description: description || "Share your travel dreams and I'll create a personalized journey just for you."
        };
      case 'no-results':
        return {
          title: title || "No Results Found",
          description: description || "Try adjusting your search or explore a different destination."
        };
      case 'loading':
        return {
          title: title || "Creating Your Journey",
          description: description || "Crafting the perfect itinerary tailored just for you..."
        };
    }
  };

  const content = getContent();

  return (
    <motion.div 
      className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {getIllustration()}
      
      <motion.h3 
        className="mt-6 text-xl font-semibold text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {content.title}
      </motion.h3>
      
      <motion.p 
        className="mt-2 text-sm text-slate-400 max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {content.description}
      </motion.p>
    </motion.div>
  );
}

export const EmptyState = memo(EmptyStateComponent);