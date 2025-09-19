export interface Venue {
  name: string;
  type: string;
  location: string;
  description?: string;
}

export function getRandomVenues(type: string, count: number = 5): Venue[] {
  const venues: Venue[] = [];
  for (let i = 1; i <= count; i++) {
    venues.push({
      name: `${type} ${i}`,
      type,
      location: 'City Center'
    });
  }
  return venues;
}