import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthFormProps {
  onLogin: () => void;
  onSignUp: () => void;
}

// SVG Icon for Google
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.012,35.836,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
  </svg>
);

// SVG Icon for Apple
const AppleIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.01,1.96C10.94,2.05 9.87,2.54 9.09,3.3C8.03,4.28 7.5,5.65 7.5,7.03C7.5,7.08 7.5,7.13 7.5,7.18C7.51,8.58 8.12,9.84 9.07,10.74C9.5,11.12 9.99,11.38 10.51,11.53C11.02,11.68 11.55,11.72 12.08,11.64C12.07,12.33 12.04,13.01 11.97,13.68C11.08,13.56 10.18,13.89 9.53,14.54C8.34,15.65 8.11,17.47 9,18.86C9.84,20.15 11.29,21 12.8,21C13.04,21 13.27,20.97 13.5,20.92C14.47,20.73 15.42,20.13 16.03,19.33C16.21,19.12 16.38,18.9 16.54,18.67C15.34,17.8 15.05,16.23 15.8,15.05C16.83,13.44 18.9,12.83 20.5,13.88C20.9,13.3 21.2,12.67 21.35,12C20.13,11.83 18.94,11.25 18.13,10.28C17.1,9.04 16.97,7.29 17.88,6.03C18.66,5 19.92,4.64 21.05,4.88C21.05,3.71 20.69,2.56 19.97,1.75C18.82,0.58 17.11,0 15.4,0C14.25,0 13.1,0.42 12.01,1.96Z" />
    </svg>
);


export function AuthForm({ onLogin, onSignUp }: AuthFormProps) {
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

    if (isLogin) {
      setTimeout(() => {
        setIsLoading(false);
        onLogin();
      }, 800);
    } else {
        setTimeout(() => {
            setIsLoading(false);
            onSignUp();
          }, 800);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSocialLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
        setIsLoading(false);
        onLogin();
    }, 800);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-4">
          <motion.div 
            className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl"
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 1, 0]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <motion.div 
              className="w-8 h-8 bg-slate-800 rounded-md"
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: {
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                },
                scale: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            />
          </motion.div>
          <div>
            <h1 className="text-2xl font-medium text-white">Welcome to Nomad Navigator</h1>
            <p className="text-slate-400 mt-1">
              {isLogin ? 'Sign in to plan your next adventure' : 'Create an account to get started'}
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-600/50 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-blue-500"
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-blue-500 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="rounded border-slate-600 bg-slate-700/50 text-blue-500 focus:ring-blue-500"
                  />
                  <Label htmlFor="remember" className="text-sm text-slate-400">Remember me</Label>
                </div>
                <button
                  type="button"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 group"
            >
              {isLoading && !isLogin ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : isLoading && isLogin ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-slate-600/50"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">Or</span>
              <div className="flex-grow border-t border-slate-600/50"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/80 text-white" onClick={handleSocialLogin}>
              <GoogleIcon />
              <span>Google</span>
            </Button>
            <Button variant="outline" className="bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/80 text-white" onClick={handleSocialLogin}>
              <AppleIcon />
              <span>Apple</span>
            </Button>
          </div>

          <div className="mt-6 text-center">
            <span className="text-slate-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}