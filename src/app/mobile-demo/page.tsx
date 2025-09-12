/**
 * Mobile Demo Page
 * Showcase of premium mobile components and interactions
 */

'use client';

import * as React from "react";
import { motion } from "framer-motion";
import { MessageCircle, Heart, Settings, Home, Search, User, Plus, Camera, Mic, Send } from "lucide-react";
import { PremiumButton, FAB } from "@/components/ui/premium-button";
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent, AnimatedCardList } from "@/components/ui/premium-card";
import MobileBottomNav, { MobileNavFAB, useMobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import PremiumChatInput from "@/components/chat/premium-chat-input";
import PremiumMessageBubble from "@/components/chat/premium-message-bubble";
import { STAGGER_LIST_VARIANTS, HAPTIC } from "@/lib/animations";

const demoMessages = [
  {
    id: '1',
    content: "Hey! Let's test out our premium mobile interface 🚀",
    isUser: false,
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: '2',
    content: "Wow, this looks amazing! The haptic feedback is so satisfying.",
    isUser: true,
    timestamp: new Date(Date.now() - 240000),
  },
  {
    id: '3',
    content: "Try swiping on the messages, long pressing for actions, and using the voice input! Everything has been designed for the perfect mobile experience.",
    isUser: false,
    timestamp: new Date(Date.now() - 180000),
  },
];

const navItems = [
  {
    id: 'home',
    label: 'Home',
    icon: <Home className="w-6 h-6" />,
    activeIcon: <Home className="w-6 h-6 fill-current" />,
  },
  {
    id: 'search',
    label: 'Search',
    icon: <Search className="w-6 h-6" />,
    badge: 3,
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: <MessageCircle className="w-6 h-6" />,
    activeIcon: <MessageCircle className="w-6 h-6 fill-current" />,
    badge: 12,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: <User className="w-6 h-6" />,
  },
];

export default function MobileDemoPage() {
  const [chatInput, setChatInput] = React.useState('');
  const [messages, setMessages] = React.useState(demoMessages);
  const { activeItem, handleItemChange } = useMobileBottomNav('home');

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        content: chatInput,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      setChatInput('');
      
      // Simulate response after delay
      setTimeout(() => {
        const response = {
          id: (Date.now() + 1).toString(),
          content: "Great! Your message was received. The mobile experience is working perfectly with haptic feedback, smooth animations, and gesture controls! 🎉",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, response]);
      }, 1500);
    }
  };

  const handleVoiceStart = () => {
    HAPTIC.medium();
    console.log('Voice recording started');
  };

  const handleVoiceEnd = () => {
    HAPTIC.light();
    console.log('Voice recording ended');
  };

  const renderContent = () => {
    switch (activeItem) {
      case 'home':
        return (
          <div className="p-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Premium Mobile Experience
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed">
                Welcome to the future of mobile interfaces! Every interaction is designed with haptic feedback, smooth animations, and delightful micro-interactions.
              </p>
            </motion.div>

            <AnimatedCardList>
              <PremiumCard
                interactive
                hover3D
                variant="gradient"
                onTap={() => HAPTIC.light()}
              >
                <PremiumCardHeader>
                  <PremiumCardTitle>Haptic Feedback System</PremiumCardTitle>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <p className="text-gray-600">
                    Experience subtle vibrations that make every tap, swipe, and interaction feel natural and responsive.
                  </p>
                </PremiumCardContent>
              </PremiumCard>

              <PremiumCard
                interactive
                hover3D
                variant="elevated"
                swipeActions
                onSwipeLeft={() => HAPTIC.success()}
                onSwipeRight={() => HAPTIC.error()}
              >
                <PremiumCardHeader>
                  <PremiumCardTitle>Gesture Controls</PremiumCardTitle>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <p className="text-gray-600">
                    Swipe this card left or right, or long-press for contextual actions. Every gesture is smooth and intuitive.
                  </p>
                </PremiumCardContent>
              </PremiumCard>

              <PremiumCard
                interactive
                variant="glass"
                onTap={() => handleItemChange('messages')}
              >
                <PremiumCardHeader>
                  <PremiumCardTitle>Premium Chat Interface</PremiumCardTitle>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <p className="text-gray-600">
                    Tap here to see our enhanced chat interface with voice input, message actions, and smooth animations.
                  </p>
                </PremiumCardContent>
              </PremiumCard>
            </AnimatedCardList>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Interactive Buttons</h2>
              <div className="flex flex-wrap gap-3">
                <PremiumButton variant="default" hapticType="light">
                  Primary Action
                </PremiumButton>
                <PremiumButton variant="gradient" hapticType="medium">
                  Gradient Style
                </PremiumButton>
                <PremiumButton variant="success" hapticType="success">
                  Success
                </PremiumButton>
                <PremiumButton variant="destructive" hapticType="error">
                  Destructive
                </PremiumButton>
              </div>
            </div>
          </div>
        );

      case 'messages':
        return (
          <div className="flex flex-col h-full">
            {/* Chat messages */}
            <motion.div 
              className="flex-1 overflow-y-auto p-4 space-y-4"
              variants={STAGGER_LIST_VARIANTS}
              initial="initial"
              animate="animate"
            >
              {messages.map((message, index) => (
                <PremiumMessageBubble
                  key={message.id}
                  content={message.content}
                  isUser={message.isUser}
                  timestamp={message.timestamp}
                  index={index}
                  onSwipeLeft={() => console.log('React with heart')}
                  onSwipeRight={() => console.log('Reply to message')}
                  onLongPress={() => console.log('Show message actions')}
                />
              ))}
            </motion.div>

            {/* Chat input */}
            <PremiumChatInput
              value={chatInput}
              onChange={setChatInput}
              onSend={handleSendMessage}
              onVoiceStart={handleVoiceStart}
              onVoiceEnd={handleVoiceEnd}
              placeholder="Try typing, voice input, or attachments..."
            />
          </div>
        );

      default:
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                {navItems.find(item => item.id === activeItem)?.icon}
              </motion.div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {navItems.find(item => item.id === activeItem)?.label}
              </h2>
              <p className="text-gray-600">
                This section showcases the premium mobile navigation system with smooth animations and haptic feedback.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Main content */}
      <div className="flex-1 pb-20">
        {renderContent()}
      </div>

      {/* Floating Action Button */}
      <MobileNavFAB
        onClick={() => {
          HAPTIC.heavy();
          console.log('FAB clicked!');
        }}
      >
        <Plus className="w-6 h-6" />
      </MobileNavFAB>

      {/* Bottom Navigation */}
      <MobileBottomNav
        items={navItems}
        activeItem={activeItem}
        onItemChange={handleItemChange}
        variant="elevated"
      />
    </div>
  );
}