'use client';

import { memo } from 'react';
import { useMotion } from '@/components/providers/motion-provider';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Brain, MapPin, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerationProgress as GenerationProgressType } from './hooks/use-chat-state';

interface GenerationProgressProps {
  progress: GenerationProgressType;
  isVisible: boolean;
  className?: string;
}

const stageIcons = {
  understanding: Brain,
  planning: MapPin,
  generating: Sparkles,
  finalizing: CheckCircle
};

const stageColors = {
  understanding: 'text-blue-500',
  planning: 'text-purple-500',
  generating: 'text-orange-500',
  finalizing: 'text-green-500'
};

export const GenerationProgress = memo(function GenerationProgress({
  progress,
  isVisible,
  className
}: GenerationProgressProps) {
  const { motion, isLoaded } = useMotion();
  const MotionDiv = isLoaded && motion ? motion.div : 'div';
  
  const Icon = stageIcons[progress.stage];
  const iconColor = stageColors[progress.stage];

  if (!isVisible) return null;

  return (
    <MotionDiv
      {...(isLoaded ? {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.2 }
      } : {})}
      className={cn(
        "fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50",
        "bg-card border rounded-lg shadow-lg p-4 min-w-[320px]",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className={cn("h-5 w-5 animate-pulse", iconColor)} />
        <span className="text-sm font-medium">{progress.message}</span>
      </div>
      <Progress value={progress.percentage} className="h-2" />
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span className="capitalize">{progress.stage}</span>
        <span>{progress.percentage}%</span>
      </div>
    </MotionDiv>
  );
});

export default GenerationProgress;