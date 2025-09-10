import { Plane, Home, Utensils, Car } from 'lucide-react';

export function CostBreakdown() {
  const costItems = [
    {
      icon: Plane,
      label: 'Flights',
      amount: 6300,
      percentage: 47
    },
    {
      icon: Home,
      label: 'Stay',
      amount: 4200,
      percentage: 31
    },
    {
      icon: Utensils,
      label: 'Food',
      amount: 1935,
      percentage: 15
    },
    {
      icon: Car,
      label: 'Transport',
      amount: 900,
      percentage: 7
    }
  ];

  const total = costItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-3">
      <h2 className="text-lg tracking-tight text-foreground">Cost breakdown</h2>
      
      <div className="space-y-2">
        {costItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                <item.icon className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-sm text-foreground">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-foreground/30 transition-all duration-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="text-sm text-foreground min-w-[3.5rem] text-right">
                ${item.amount.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Total estimated</span>
          <span className="text-lg text-foreground">${total.toLocaleString()}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Per person • 43 days</p>
      </div>
    </div>
  );
}