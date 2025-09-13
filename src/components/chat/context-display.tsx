/**
 * Conversation Context Display - Phase 4.2
 * Shows active conversation state, destinations, preferences, and confidence levels
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  Settings, 
  Target, 
  TrendingUp, 
  MessageCircle, 
  Trash2,
  Edit3,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConversationState } from '@/services/ai/flows/generate-dialog-response';
import { ClassificationResult } from '@/services/ai/utils/hybrid-parser';
import { cn } from '@/lib/utils';

interface ContextDisplayProps {
  conversationState: ConversationState;
  className?: string;
  onClearContext?: () => void;
  onEditDestination?: (destination: string) => void;
  onEditOrigin?: () => void;
  compact?: boolean;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string | number;
}

function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultExpanded = true,
  badge 
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="border border-border rounded-lg bg-card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {badge}
            </Badge>
          )}
        </div>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 border-t border-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfidenceIndicator({ confidence, label }: { confidence?: number; label?: string }) {
  if (!confidence) return null;
  
  const percentage = Math.round(confidence * 100);
  const getColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center gap-2">
      <TrendingUp size={12} className={getColor(confidence)} />
      <span className={`text-xs ${getColor(confidence)}`}>
        {label ? `${label}: ` : ''}{percentage}%
      </span>
    </div>
  );
}

export function ConversationContextDisplay({
  conversationState,
  className,
  onClearContext,
  onEditDestination,
  onEditOrigin,
  compact = false
}: ContextDisplayProps) {
  const { context, metadata, currentItinerary, history } = conversationState;
  
  // Get latest message classification if available
  const latestMessage = history[history.length - 1];
  const latestClassification = latestMessage?.metadata?.classification;

  if (compact) {
    return (
      <div className={cn("p-3 bg-muted/20 rounded-lg border border-border", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <MessageCircle size={14} />
            <span className="font-medium">{metadata.messageCount} messages</span>
            {context.destinations.length > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {context.destinations.length} destination{context.destinations.length > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
          {onClearContext && (
            <Button variant="ghost" size="sm" onClick={onClearContext} className="h-6 w-6 p-0">
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with session info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Conversation Context</h3>
          <p className="text-sm text-muted-foreground">
            Session started {new Date(metadata.startTime).toLocaleTimeString()}
          </p>
        </div>
        {onClearContext && (
          <Button variant="outline" size="sm" onClick={onClearContext}>
            <Trash2 size={14} className="mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Travel Details */}
      <CollapsibleSection
        title="Travel Details"
        icon={<MapPin size={16} />}
        badge={context.destinations.length}
      >
        <div className="space-y-3">
          {/* Origin */}
          {context.origin && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">From:</span>
                <span className="font-medium">{context.origin}</span>
              </div>
              {onEditOrigin && (
                <Button variant="ghost" size="sm" onClick={onEditOrigin} className="h-6 w-6 p-0">
                  <Edit3 size={12} />
                </Button>
              )}
            </div>
          )}

          {/* Destinations */}
          {context.destinations.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Destinations:</span>
              <div className="space-y-1">
                {context.destinations.map((destination, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm font-medium">{destination}</span>
                    {onEditDestination && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onEditDestination(destination)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 size={12} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Itinerary Summary */}
          {currentItinerary && (
            <div className="p-2 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Itinerary Ready: {currentItinerary.totalDays} days
                </span>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Conversation State */}
      <CollapsibleSection
        title="Conversation State"
        icon={<MessageCircle size={16} />}
        badge={metadata.messageCount}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Messages:</span>
            <span className="font-medium">{metadata.messageCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last activity:</span>
            <span className="font-medium">
              {new Date(metadata.lastActivity).toLocaleTimeString()}
            </span>
          </div>
          
          {/* Latest message classification */}
          {latestClassification && (
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Latest input type:</span>
                <Badge variant="outline" className="text-xs">
                  {latestClassification.type}
                </Badge>
              </div>
              {latestClassification.confidence && (
                <ConfidenceIndicator 
                  confidence={latestClassification.confidence}
                  label="Confidence"
                />
              )}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Preferences & Constraints */}
      {(context.preferences.size > 0 || context.constraints.length > 0) && (
        <CollapsibleSection
          title="Preferences & Constraints"
          icon={<Settings size={16} />}
          badge={context.preferences.size + context.constraints.length}
          defaultExpanded={false}
        >
          <div className="space-y-3">
            {/* Preferences */}
            {context.preferences.size > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Preferences:</span>
                <div className="flex flex-wrap gap-1">
                  {Array.from(context.preferences.entries()).map(([key, value], index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Constraints */}
            {context.constraints.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Constraints:</span>
                <div className="space-y-1">
                  {context.constraints.map((constraint, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Badge 
                        variant={constraint.priority === 'high' ? 'destructive' : 
                               constraint.priority === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {constraint.priority}
                      </Badge>
                      <span>{constraint.type}: {String(constraint.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Debug Information (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <CollapsibleSection
          title="Debug Info"
          icon={<Target size={16} />}
          defaultExpanded={false}
        >
          <div className="space-y-2 text-xs font-mono">
            <div>Session ID: {conversationState.sessionId}</div>
            <div>User ID: {conversationState.userId || 'Anonymous'}</div>
            <div>
              Context size: {JSON.stringify(context).length} bytes
            </div>
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

export default ConversationContextDisplay;