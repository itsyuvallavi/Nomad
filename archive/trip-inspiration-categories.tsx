'use client';

import { motion } from 'framer-motion';
import { 
  Coffee, 
  Briefcase, 
  Mountain, 
  Palette, 
  Waves, 
  Building,
  Heart,
  Camera,
  Utensils,
  TreePine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TripCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  color: string;
  duration: string;
}

const categories: TripCategory[] = [
  {
    id: 'weekend',
    title: 'Weekend Getaway',
    description: 'Quick escapes for busy schedules',
    icon: <Coffee className="h-5 w-5" />,
    prompt: 'Plan a perfect 2-3 day weekend getaway with relaxation, local food, and easy travel',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    duration: '2-3 days'
  },
  {
    id: 'nomad',
    title: 'Digital Nomad Month',
    description: 'Work-friendly long stays',
    icon: <Briefcase className="h-5 w-5" />,
    prompt: 'Create a 1-month digital nomad experience with co-working spaces, reliable WiFi, and work-life balance',
    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    duration: '4 weeks'
  },
  {
    id: 'adventure',
    title: 'Adventure Trip',
    description: 'Thrills and outdoor activities',
    icon: <Mountain className="h-5 w-5" />,
    prompt: 'Design an adrenaline-packed adventure trip with hiking, extreme sports, and outdoor challenges',
    color: 'bg-green-500/10 text-green-700 dark:text-green-300',
    duration: '5-10 days'
  },
  {
    id: 'cultural',
    title: 'Cultural Deep Dive',
    description: 'Museums, history, and local traditions',
    icon: <Palette className="h-5 w-5" />,
    prompt: 'Plan an immersive cultural journey with museums, historical sites, local traditions, and art galleries',
    color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
    duration: '7-14 days'
  },
  {
    id: 'beach',
    title: 'Beach Vacation',
    description: 'Sun, sand, and relaxation',
    icon: <Waves className="h-5 w-5" />,
    prompt: 'Create a relaxing beach vacation with pristine beaches, water activities, and tropical vibes',
    color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    duration: '5-7 days'
  },
  {
    id: 'city',
    title: 'City Break',
    description: 'Urban exploration and nightlife',
    icon: <Building className="h-5 w-5" />,
    prompt: 'Plan an exciting city break with urban attractions, shopping, restaurants, and nightlife',
    color: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
    duration: '3-5 days'
  },
  {
    id: 'romantic',
    title: 'Romantic Getaway',
    description: 'Perfect for couples',
    icon: <Heart className="h-5 w-5" />,
    prompt: 'Design a romantic escape with intimate dining, scenic views, and couple-friendly activities',
    color: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
    duration: '3-7 days'
  },
  {
    id: 'photography',
    title: 'Photography Tour',
    description: 'Capture stunning landscapes',
    icon: <Camera className="h-5 w-5" />,
    prompt: 'Create a photographer\'s dream trip with scenic landscapes, golden hour spots, and iconic viewpoints',
    color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    duration: '5-12 days'
  },
  {
    id: 'food',
    title: 'Culinary Journey',
    description: 'Food tours and cooking classes',
    icon: <Utensils className="h-5 w-5" />,
    prompt: 'Plan a food lover\'s adventure with cooking classes, food tours, local markets, and signature restaurants',
    color: 'bg-red-500/10 text-red-700 dark:text-red-300',
    duration: '4-8 days'
  },
  {
    id: 'nature',
    title: 'Nature Retreat',
    description: 'National parks and wildlife',
    icon: <TreePine className="h-5 w-5" />,
    prompt: 'Design a nature-focused trip with national parks, wildlife viewing, and eco-friendly accommodations',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    duration: '6-10 days'
  }
];

interface TripInspirationCategoriesProps {
  onCategorySelect: (prompt: string) => void;
}

export default function TripInspirationCategories({ onCategorySelect }: TripInspirationCategoriesProps) {
  return (
    <motion.div
      className="w-full max-w-4xl mx-auto mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
    >
      <h2 className="text-xl font-semibold text-center mb-6 text-foreground">
        Trip Inspiration
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className="h-full cursor-pointer transition-all hover:shadow-md border-border hover:border-primary/20 group"
              onClick={() => onCategorySelect(category.prompt)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center h-full">
                <div className={`p-3 rounded-full mb-3 ${category.color} group-hover:scale-110 transition-transform`}>
                  {category.icon}
                </div>
                
                <h3 className="font-medium text-sm mb-2 text-foreground group-hover:text-primary transition-colors">
                  {category.title}
                </h3>
                
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {category.description}
                </p>
                
                <div className="mt-auto">
                  <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                    {category.duration}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <motion.p 
        className="text-center text-sm text-muted-foreground mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.5 }}
      >
        Click any category to start planning your perfect trip
      </motion.p>
    </motion.div>
  );
}