import { Wifi, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { z } from 'genkit';
import { ActivitySchema } from '@/ai/schemas';

type Activity = z.infer<typeof ActivitySchema>;

interface CoworkingSectionProps {
  activities: Activity[];
}

export function CoworkingSection({ activities }: CoworkingSectionProps) {
  // Filter for coworking spaces or work-related activities
  const coworkingSpaces = activities.filter(activity => 
    activity.category === 'Work' ||
    activity.description.toLowerCase().includes('cowork') ||
    activity.description.toLowerCase().includes('work space') ||
    activity.description.toLowerCase().includes('workspace')
  ).slice(0, 4); // Show max 4 coworking spaces

  if (coworkingSpaces.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 mb-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Wifi className="w-4 h-4 text-blue-400" />
        <h2 className="text-white text-xs font-medium uppercase tracking-wide">Coworking Spaces</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {coworkingSpaces.map((space, index) => (
          <motion.div
            key={`cowork-${index}`}
            className="bg-slate-700/50 rounded-md p-2 hover:bg-slate-700/70 transition-colors cursor-pointer"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            onClick={() => {
              if (space.address) {
                window.open(`https://maps.google.com/?q=${encodeURIComponent(space.address)}`, '_blank');
              }
            }}
          >
            <h3 className="text-white text-xs font-medium line-clamp-1">{space.description}</h3>
            
            {space.address && (
              <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-1">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{space.address}</span>
              </div>
            )}
            
            {space.time && (
              <p className="text-slate-500 text-[10px] mt-0.5">{space.time}</p>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}