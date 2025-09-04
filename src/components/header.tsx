import { Compass } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
        <Compass className="h-8 w-8 text-accent" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Nomad Navigator
        </h1>
      </div>
    </header>
  );
}
