import { useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { TripOverview } from './components/TripOverview';
import { MapView } from './components/MapView';
import { AuthForm } from './components/AuthForm';
import { Button } from './components/ui/button';
import { Map, X } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen w-full flex bg-background">
      {/* Left Panel - Chat */}
      <div className="w-80 min-w-80 border-r border-border">
        <ChatPanel onLogout={handleLogout} />
      </div>
      
      {/* Center Panel - Trip Overview */}
      <div className="flex-1 border-r border-border relative">
        <TripOverview />
        
        {/* Map Toggle Button */}
        <Button
          onClick={() => setShowMap(!showMap)}
          variant="outline"
          size="sm"
          className="absolute top-4 right-4 z-10 border-border hover:bg-muted/50"
        >
          {showMap ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Hide Map
            </>
          ) : (
            <>
              <Map className="w-4 h-4 mr-2" />
              Show Map
            </>
          )}
        </Button>
      </div>

      {/* Right Panel - Map (Conditional) */}
      {showMap && (
        <div className="w-96 min-w-96">
          <MapView />
        </div>
      )}
    </div>
  );
}