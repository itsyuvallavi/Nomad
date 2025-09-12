'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shuffle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SurpriseMeButtonProps {
  onSurpriseTrip: (prompt: string) => void;
}

const surprisePrompts = [
  "Plan a spontaneous weekend getaway to a charming European city with local markets and cozy cafes",
  "Create an adventure-packed week in New Zealand with hiking, bungee jumping, and scenic drives",
  "Design a cultural immersion trip to Morocco with traditional markets, desert camping, and historic cities",
  "Plan a food lover's journey through Vietnam with street food tours and cooking classes",
  "Create a digital nomad month in Portugal with co-working spaces, beaches, and historic towns",
  "Design a wellness retreat in Costa Rica with yoga, nature walks, and thermal springs",
  "Plan a photography expedition to Iceland with waterfalls, glaciers, and Northern Lights",
  "Create a wine tasting tour through Tuscany with vineyard visits and cooking classes",
  "Design an island hopping adventure in Greece with ancient ruins and crystal clear waters",
  "Plan a safari and cultural trip to Kenya with wildlife viewing and Maasai village visits",
  "Create a temple and street food tour of Thailand with bustling markets and peaceful temples",
  "Design a music and art focused trip to Berlin with galleries, clubs, and historic sites",
  "Plan a sustainable eco-tourism trip to Ecuador with cloud forests and indigenous communities",
  "Create a winter wonderland experience in Lapland with Northern Lights and reindeer",
  "Design a archaeological adventure in Peru with Machu Picchu and ancient Inca sites"
];

const seasonalPrompts = {
  spring: [
    "Plan a cherry blossom viewing trip to Japan with traditional gardens and festivals",
    "Create a tulip season adventure in Netherlands with flower fields and canal tours",
    "Design a Easter market tour through Germany with historic cities and local traditions"
  ],
  summer: [
    "Plan a Mediterranean sailing adventure with Greek islands and coastal towns",
    "Create a midnight sun experience in Norway with fjords and northern landscapes",
    "Design a festival summer in Europe with music events and cultural celebrations"
  ],
  fall: [
    "Plan a fall foliage road trip through New England with scenic drives and small towns",
    "Create an Oktoberfest experience in Germany with beer gardens and traditional celebrations",
    "Design a harvest season trip to Napa Valley with wine tastings and vineyard tours"
  ],
  winter: [
    "Plan a Christmas market tour through Central Europe with festive traditions",
    "Create a Northern Lights adventure in Iceland with hot springs and glaciers",
    "Design a ski and après-ski experience in the Swiss Alps with mountain villages"
  ]
};

function getCurrentSeason(): keyof typeof seasonalPrompts {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

export default function SurpriseMeButton({ onSurpriseTrip }: SurpriseMeButtonProps) {
  const [isShuffling, setIsShuffling] = useState(false);

  const handleSurpriseMe = () => {
    setIsShuffling(true);
    
    // Combine general prompts with seasonal ones
    const currentSeason = getCurrentSeason();
    const allPrompts = [...surprisePrompts, ...seasonalPrompts[currentSeason]];
    
    // Add a small delay for the animation effect
    setTimeout(() => {
      const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];
      onSurpriseTrip(randomPrompt);
      setIsShuffling(false);
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      <Button
        onClick={handleSurpriseMe}
        disabled={isShuffling}
        variant="outline"
        className="relative overflow-hidden group border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
      >
        <motion.div
          className="flex items-center gap-2"
          animate={isShuffling ? { x: [0, -5, 5, 0] } : {}}
          transition={{ duration: 0.1, repeat: isShuffling ? 8 : 0 }}
        >
          {isShuffling ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
            >
              <Shuffle className="h-4 w-4" />
            </motion.div>
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>
            {isShuffling ? 'Finding magic...' : 'Surprise Me!'}
          </span>
        </motion.div>
        
        {/* Sparkle animation overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isShuffling ? 1 : 0 }}
        >
          {[...Array(3)].map((_, i) => {
            // Use deterministic positions based on index instead of Math.random()
            const positions = [
              { x: '20%', y: '30%' },
              { x: '70%', y: '60%' },
              { x: '40%', y: '80%' }
            ];
            
            return (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-primary rounded-full"
                initial={{ 
                  x: positions[i].x,
                  y: positions[i].y,
                  scale: 0 
                }}
                animate={isShuffling ? {
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                } : {}}
                transition={{
                  duration: 0.6,
                  delay: i * 0.1,
                  repeat: isShuffling ? Infinity : 0
                }}
              />
            );
          })}
        </motion.div>
      </Button>
    </motion.div>
  );
}