import { Card } from './ui/card';
import { Lightbulb, Bed, FileText, Shield, Map, Copy } from 'lucide-react';

export function TripTips() {
  const tips = [
    { icon: Bed, text: 'Book accommodations in advance' },
    { icon: FileText, text: 'Check visa requirements' },
    { icon: Shield, text: 'Get travel insurance' },
    { icon: Map, text: 'Download offline maps' },
    { icon: Copy, text: 'Keep digital copies of documents' }
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-yellow-400" />
        <h2 className="text-xl font-medium text-white">Quick Tips for Denmark</h2>
      </div>

      <Card className="bg-slate-800/30 border-slate-600/30 p-4">
        <ul className="space-y-3">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-center gap-3 text-slate-300">
              <div className="w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                <tip.icon className="w-3 h-3 text-slate-400" />
              </div>
              <span className="text-sm">{tip.text}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}