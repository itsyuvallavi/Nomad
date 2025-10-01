'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AuthSuccessProps {
  message?: string;
}

export const AuthSuccess: React.FC<AuthSuccessProps> = ({ 
  message = "Welcome! You've been signed in successfully." 
}) => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">Success!</h3>
            <p className="text-sm text-green-700 mt-1">
              {message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};