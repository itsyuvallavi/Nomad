import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';

export const mockItinerary: GeneratePersonalizedItineraryOutput = {
  title: "London Work & Explore Week",
  destination: "London, UK",
  itinerary: [
    {
      day: 1,
      date: "2025-02-15",
      title: "Arrival & City Introduction",
      activities: [
        {
          time: "10:00 AM",
          description: "Arrive at Heathrow Airport",
          category: "Travel",
          address: "Heathrow Airport, London TW6 1EW"
        },
        {
          time: "12:00 PM",
          description: "Check-in at hostel in King's Cross",
          category: "Accommodation",
          address: "King's Cross, London WC1X"
        },
        {
          time: "2:00 PM",
          description: "Lunch at Borough Market",
          category: "Food",
          address: "8 Southwark St, London SE1 1TL"
        },
        {
          time: "4:00 PM",
          description: "Walk along South Bank & see Tower Bridge",
          category: "Leisure",
          address: "Tower Bridge Rd, London SE1 2UP"
        },
        {
          time: "7:00 PM",
          description: "Traditional pub dinner",
          category: "Food",
          address: "Covent Garden, London WC2E"
        },
        {
          time: "8:30 PM",
          description: "Evening walk along Thames & Tower Bridge illuminated",
          category: "Leisure",
          address: "Thames Path, London SE1"
        }
      ]
    },
    {
      day: 2,
      date: "2025-02-16",
      title: "Museums & Culture Day",
      activities: [
        {
          time: "9:00 AM",
          description: "The British Library - Free WiFi & Quiet Space",
          category: "Work",
          address: "96 Euston Rd, London NW1 2DB"
        },
        {
          time: "1:00 PM",
          description: "Lunch break - grab sandwiches",
          category: "Food",
          address: "Russell Square, London WC1B"
        },
        {
          time: "2:00 PM",
          description: "Visit British Museum (free entry)",
          category: "Attraction",
          address: "Great Russell St, London WC1B 3DG"
        },
        {
          time: "5:00 PM",
          description: "Explore Covent Garden street performers",
          category: "Leisure",
          address: "Covent Garden, London WC2E 8RF"
        },
        {
          time: "7:30 PM",
          description: "Affordable dinner in Chinatown",
          category: "Food",
          address: "Chinatown, London W1D 5DA"
        },
        {
          time: "9:00 PM",
          description: "Leicester Square nightlife & street performances",
          category: "Leisure",
          address: "Leicester Square, London WC2H 7LU"
        }
      ]
    },
    {
      day: 3,
      date: "2025-02-17",
      title: "Parks & Markets",
      activities: [
        {
          time: "9:00 AM",
          description: "Morning jog in Hyde Park",
          category: "Leisure",
          address: "Hyde Park, London W2 2UH"
        },
        {
          time: "10:30 AM",
          description: "The Coffee Works Project - Laptop Friendly Cafe",
          category: "Work",
          address: "127 Notting Hill Gate, London W11 3LB"
        },
        {
          time: "1:00 PM",
          description: "Explore Portobello Road Market",
          category: "Attraction",
          address: "Portobello Rd, London W11 1LJ"
        },
        {
          time: "3:00 PM",
          description: "Visit Natural History Museum (free)",
          category: "Attraction",
          address: "Cromwell Rd, London SW7 5BD"
        },
        {
          time: "6:00 PM",
          description: "Picnic dinner in Kensington Gardens",
          category: "Food",
          address: "Kensington Gardens, London W2 3XA"
        },
        {
          time: "7:30 PM",
          description: "Sunset at Hyde Park & evening stroll",
          category: "Leisure",
          address: "Hyde Park, London W2 2UH"
        },
        {
          time: "9:00 PM",
          description: "Drinks at a rooftop bar (optional)",
          category: "Leisure",
          address: "Paddington, London W2"
        }
      ]
    },
    {
      day: 4,
      date: "2025-02-18",
      title: "East London Experience",
      activities: [
        {
          time: "9:00 AM",
          description: "WeWork Shoreditch - Day Pass Available",
          category: "Work",
          address: "1 Mark Square, London EC2A 4EG"
        },
        {
          time: "1:00 PM",
          description: "Street food at Brick Lane Market",
          category: "Food",
          address: "Brick Lane, London E1 6QL"
        },
        {
          time: "3:00 PM",
          description: "Street art tour in Shoreditch",
          category: "Leisure",
          address: "Shoreditch, London E1"
        },
        {
          time: "5:00 PM",
          description: "Visit Columbia Road Flower Market",
          category: "Attraction",
          address: "Columbia Rd, London E2 7RG"
        },
        {
          time: "7:00 PM",
          description: "Craft beer and burgers",
          category: "Food",
          address: "Hackney, London E8"
        },
        {
          time: "8:30 PM",
          description: "Live music at Old Blue Last pub",
          category: "Leisure",
          address: "38 Great Eastern St, London EC2A 3ES"
        }
      ]
    },
    {
      day: 5,
      date: "2025-02-19",
      title: "Royal London",
      activities: [
        {
          time: "10:00 AM",
          description: "See Buckingham Palace (from outside)",
          category: "Attraction",
          address: "Buckingham Palace, London SW1A 1AA"
        },
        {
          time: "11:30 AM",
          description: "Walk through St. James's Park",
          category: "Leisure",
          address: "St. James's Park, London SW1A 2BJ"
        },
        {
          time: "1:00 PM",
          description: "Lunch at Westminster food market",
          category: "Food",
          address: "Westminster, London SW1"
        },
        {
          time: "2:30 PM",
          description: "Visit Tate Modern (free entry)",
          category: "Attraction",
          address: "Bankside, London SE1 9TG"
        },
        {
          time: "5:00 PM",
          description: "Royal Festival Hall - Free WiFi & River Views",
          category: "Work",
          address: "Southbank Centre, London SE1 8XX"
        },
        {
          time: "7:30 PM",
          description: "Theatre district - catch a show",
          category: "Leisure",
          address: "West End, London WC2"
        },
        {
          time: "10:00 PM",
          description: "Late night dessert & coffee in Soho",
          category: "Food",
          address: "Soho, London W1D"
        }
      ]
    },
    {
      day: 6,
      date: "2025-02-20",
      title: "Greenwich & Thames",
      activities: [
        {
          time: "10:00 AM",
          description: "Take Thames Clipper to Greenwich",
          category: "Travel",
          address: "Greenwich Pier, London SE10 9HT"
        },
        {
          time: "11:00 AM",
          description: "Visit Cutty Sark and Maritime Museum",
          category: "Attraction",
          address: "King William Walk, Greenwich SE10 9HT"
        },
        {
          time: "1:00 PM",
          description: "Lunch at Greenwich Market",
          category: "Food",
          address: "Greenwich Market, London SE10 9HZ"
        },
        {
          time: "3:00 PM",
          description: "Walk to Prime Meridian Line",
          category: "Attraction",
          address: "Royal Observatory, Greenwich SE10 8XJ"
        },
        {
          time: "5:00 PM",
          description: "Return to city via DLR",
          category: "Travel",
          address: "Greenwich DLR Station"
        },
        {
          time: "7:00 PM",
          description: "Farewell dinner in Soho",
          category: "Food",
          address: "Soho, London W1D"
        },
        {
          time: "9:00 PM",
          description: "Night walk through illuminated London Eye area",
          category: "Leisure",
          address: "South Bank, London SE1"
        }
      ]
    },
    {
      day: 7,
      date: "2025-02-21",
      title: "Departure Day",
      activities: [
        {
          time: "9:00 AM",
          description: "Check out from accommodation",
          category: "Accommodation",
          address: "King's Cross, London"
        },
        {
          time: "10:00 AM",
          description: "Last minute souvenir shopping",
          category: "Leisure",
          address: "Oxford Street, London W1"
        },
        {
          time: "12:00 PM",
          description: "Lunch at Paddington Station",
          category: "Food",
          address: "Paddington Station, London W2 1HB"
        },
        {
          time: "2:00 PM",
          description: "Heathrow Express to airport",
          category: "Travel",
          address: "Paddington to Heathrow"
        },
        {
          time: "5:00 PM",
          description: "Flight back to Los Angeles",
          category: "Travel",
          address: "Heathrow Terminal 5"
        }
      ]
    }
  ],
  quickTips: [
    "Get an Oyster Card for easy public transport - £5 deposit + pay as you go",
    "Many museums in London are free - perfect for budget travelers",
    "Meal deals at Tesco/Sainsbury's are £3-4 for lunch",
    "Download Citymapper app for best navigation around London"
  ]
};