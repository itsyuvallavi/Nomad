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
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.39,14.83C19.35,14.83,19.32,14.83,19.28,14.83C18.15,14.73,17.02,15.2,16.28,16.03C15.53,16.88,14.9,17.93,14.84,19.06C14.83,19.14,14.83,19.21,14.83,19.29C14.83,19.33,14.83,19.38,14.83,19.42C15.8,19.5,16.79,19.03,17.58,18.23C18.39,17.43,19,16.37,19.12,15.24C19.15,15.1,19.18,14.96,19.2,14.83H19.39M18.82,7.43C18.25,6.66,17.2,6.33,16.14,6.5C15,6.7,14,7.28,13.25,8.13C13.25,8.13,13.24,8.14,13.24,8.14C12.5,7.27,11.45,6.7,10.35,6.5C9.26,6.3,8.2,6.64,7.59,7.4C6.34,8.83,6.3,10.95,7.46,12.33C8.04,13,8.79,13.43,9.54,13.68C10.26,13.92,11.03,14,11.75,14H12C11.94,13.3,11.93,12.6,12.03,11.93C12.18,11,12.58,10.15,13.25,9.5C13.25,9.5,13.25,9.5,13.25,9.5C13.88,8.8,14.84,8.34,15.82,8.19C16.83,8.04,17.82,8.27,18.53,9C18.69,8.49,18.82,7.96,18.82,7.43M12.15,0C10.15,0,8.3,0.67,6.86,1.86C5.3,3.15,4.26,5.03,4.06,7.03C2.86,7.23,1.66,7.86,0.85,8.99C-0.41,10.61,-0.19,12.94,1.26,14.41C2,15.19,2.94,15.71,3.93,15.88C3.96,16.1,3.99,16.32,4.03,16.54C4.24,18.7,5.34,20.67,6.9,21.94C8.36,23.11,10.14,24,12.08,24C12.11,24,12.13,24,12.15,24C14.15,24,16,23.33,17.44,22.14C18.9,20.85,19.94,18.97,20.14,16.97C21.34,16.77,22.54,16.14,23.35,15.01C24.61,13.39,24.39,11.06,22.94,9.59C22.2,8.81,21.26,8.29,20.27,8.12C20.24,7.9,20.21,7.68,20.17,7.46C19.96,5.3,18.86,3.33,17.4,2.06C15.94,0.89,14.16,0,12.22,0H12.15Z"></path>
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
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button variant="outline" className="bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/80 text-white" onClick={handleSocialLogin}>
              <GoogleIcon />
              <span>Google</span>
            </Button>
            <Button variant="outline" className="bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/80 text-white" onClick={handleSocialLogin}>
              <AppleIcon />
              <span>Apple</span>
            </Button>
          </div>

          <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-600/50"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">Or continue with</span>
              <div className="flex-grow border-t border-slate-600/50"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            
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
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isLogin ? 'Signing in...' : 'Redirecting...'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

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
