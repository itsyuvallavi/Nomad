import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { Eye, EyeOff, Globe, ArrowRight } from 'lucide-react';

interface AuthFormProps {
  onLogin: () => void;
}

export function AuthForm({ onLogin }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-foreground rounded-lg">
            <Globe className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="text-2xl tracking-tight text-foreground">Nomad Navigator</h1>
            <p className="text-muted-foreground mt-1">
              {isLogin ? 'Sign in to continue' : 'Create your account'}
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="John"
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Doe"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  required={!isLogin}
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="rounded"
                  />
                  <Label htmlFor="remember" className="text-muted-foreground cursor-pointer">Remember me</Label>
                </div>
                <button
                  type="button"
                  className="text-foreground hover:text-muted-foreground transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-200 group"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  <span>{isLogin ? 'Signing in' : 'Creating account'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6">
            <Separator />
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </span>{' '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-foreground hover:text-muted-foreground transition-colors underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <a href="#" className="text-foreground hover:text-muted-foreground transition-colors underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-foreground hover:text-muted-foreground transition-colors underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}