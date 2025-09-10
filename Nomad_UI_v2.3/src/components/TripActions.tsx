import { Download, Share2, Calendar, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';

export function TripActions() {
  const downloadCalendar = () => {
    // Create a simple ICS file content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NomadPlan//EN
BEGIN:VEVENT
DTSTART:20241208T090000Z
DTEND:20241208T120000Z
SUMMARY:Work at Hub Lisbon
LOCATION:Rua Garrett 64, Chiado, Lisboa
DESCRIPTION:Coworking session at highly-rated space
END:VEVENT
BEGIN:VEVENT
DTSTART:20241208T140000Z
DTEND:20241208T160000Z
SUMMARY:Explore Alfama District
LOCATION:Alfama, Lisboa, Portugal
DESCRIPTION:Walking tour of historic neighborhood
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lisbon-trip-itinerary.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareItinerary = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Lisbon Trip Itinerary',
          text: 'Check out my AI-generated travel itinerary for Lisbon!',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          onClick={downloadCalendar}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Calendar</span>
        </Button>
        
        <Button
          onClick={shareItinerary}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
        
        <Button
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        
        <Button
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center gap-2"
        >
          <Heart className="w-4 h-4" />
          <span className="hidden sm:inline">Save</span>
        </Button>
      </div>
      
      <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
        <h3 className="text-white font-medium mb-2">Quick Tips for Lisbon</h3>
        <div className="space-y-1 text-sm text-slate-300">
          <p>• Visa: EU passport holders don't need visa for stays up to 90 days</p>
          <p>• Best working hours: 9 AM - 6 PM (UTC+1 timezone)</p>
          <p>• Average daily budget: €60-80 for mid-range nomad lifestyle</p>
          <p>• WiFi: Generally excellent in coworking spaces and cafes</p>
        </div>
      </div>
    </motion.div>
  );
}