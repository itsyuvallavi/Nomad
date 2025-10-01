// Mapping of cities to their most iconic landmarks and search terms
export const CITY_LANDMARKS: Record<string, {
  landmarks: string[];
  searchTerms: string[];
  fallbackEmoji: string;
}> = {
  'Paris': {
    landmarks: ['Eiffel Tower', 'Louvre Museum', 'Arc de Triomphe', 'Notre-Dame Cathedral'],
    searchTerms: ['Paris Eiffel Tower sunset', 'Paris Eiffel Tower day', 'Paris skyline Eiffel'],
    fallbackEmoji: '🗼'
  },
  'London': {
    landmarks: ['Big Ben', 'Tower Bridge', 'London Eye', 'Buckingham Palace'],
    searchTerms: ['London Big Ben Parliament', 'London Tower Bridge Thames', 'London Eye skyline'],
    fallbackEmoji: '🏰'
  },
  'New York': {
    landmarks: ['Statue of Liberty', 'Empire State Building', 'Times Square', 'Brooklyn Bridge'],
    searchTerms: ['New York Statue Liberty', 'Manhattan skyline Empire State', 'Times Square NYC'],
    fallbackEmoji: '🗽'
  },
  'Tokyo': {
    landmarks: ['Mount Fuji', 'Tokyo Tower', 'Senso-ji Temple', 'Shibuya Crossing'],
    searchTerms: ['Tokyo Tower Mount Fuji', 'Tokyo Shibuya crossing', 'Tokyo skyline night'],
    fallbackEmoji: '🗾'
  },
  'Rome': {
    landmarks: ['Colosseum', 'Vatican City', 'Trevi Fountain', 'Pantheon'],
    searchTerms: ['Rome Colosseum sunset', 'Vatican St Peters Basilica', 'Rome Trevi Fountain'],
    fallbackEmoji: '🏛️'
  },
  'Barcelona': {
    landmarks: ['Sagrada Familia', 'Park Güell', 'La Rambla', 'Casa Batlló'],
    searchTerms: ['Barcelona Sagrada Familia', 'Barcelona Park Guell Gaudi', 'Barcelona beach skyline'],
    fallbackEmoji: '⛪'
  },
  'Amsterdam': {
    landmarks: ['Anne Frank House', 'Van Gogh Museum', 'Rijksmuseum', 'Canal Houses'],
    searchTerms: ['Amsterdam canals houses', 'Amsterdam canal sunset', 'Amsterdam bicycles canal'],
    fallbackEmoji: '🚲'
  },
  'Dubai': {
    landmarks: ['Burj Khalifa', 'Burj Al Arab', 'Palm Jumeirah', 'Dubai Fountain'],
    searchTerms: ['Dubai Burj Khalifa skyline', 'Dubai Burj Al Arab sunset', 'Dubai skyline night'],
    fallbackEmoji: '🌆'
  },
  'Sydney': {
    landmarks: ['Sydney Opera House', 'Harbour Bridge', 'Bondi Beach', 'Darling Harbour'],
    searchTerms: ['Sydney Opera House Harbour', 'Sydney Harbour Bridge', 'Sydney Opera House sunset'],
    fallbackEmoji: '🎭'
  },
  'Singapore': {
    landmarks: ['Marina Bay Sands', 'Gardens by the Bay', 'Merlion', 'Sentosa'],
    searchTerms: ['Singapore Marina Bay Sands', 'Singapore Gardens Bay Supertree', 'Singapore Merlion skyline'],
    fallbackEmoji: '🦁'
  },
  'Bangkok': {
    landmarks: ['Grand Palace', 'Wat Pho', 'Wat Arun', 'Floating Market'],
    searchTerms: ['Bangkok Grand Palace temple', 'Bangkok Wat Arun sunset', 'Bangkok temple golden'],
    fallbackEmoji: '🛕'
  },
  'Istanbul': {
    landmarks: ['Hagia Sophia', 'Blue Mosque', 'Grand Bazaar', 'Bosphorus Bridge'],
    searchTerms: ['Istanbul Hagia Sophia', 'Istanbul Blue Mosque sunset', 'Istanbul Bosphorus skyline'],
    fallbackEmoji: '🕌'
  },
  'Berlin': {
    landmarks: ['Brandenburg Gate', 'Berlin Wall', 'Reichstag', 'TV Tower'],
    searchTerms: ['Berlin Brandenburg Gate', 'Berlin Wall East Side Gallery', 'Berlin TV Tower Alexanderplatz'],
    fallbackEmoji: '🏛️'
  },
  'Madrid': {
    landmarks: ['Royal Palace', 'Prado Museum', 'Retiro Park', 'Plaza Mayor'],
    searchTerms: ['Madrid Royal Palace', 'Madrid Plaza Mayor', 'Madrid Retiro Park Crystal Palace'],
    fallbackEmoji: '👑'
  },
  'Prague': {
    landmarks: ['Prague Castle', 'Charles Bridge', 'Old Town Square', 'Astronomical Clock'],
    searchTerms: ['Prague Castle sunset', 'Prague Charles Bridge dawn', 'Prague Old Town Square'],
    fallbackEmoji: '🏰'
  },
  'Vienna': {
    landmarks: ['Schönbrunn Palace', 'St. Stephen Cathedral', 'Hofburg Palace', 'Vienna State Opera'],
    searchTerms: ['Vienna Schonbrunn Palace', 'Vienna St Stephen Cathedral', 'Vienna Opera House'],
    fallbackEmoji: '🎼'
  },
  'Copenhagen': {
    landmarks: ['Little Mermaid', 'Nyhavn', 'Tivoli Gardens', 'Amalienborg Palace'],
    searchTerms: ['Copenhagen Nyhavn colorful houses', 'Copenhagen Little Mermaid statue', 'Copenhagen canal boats'],
    fallbackEmoji: '🧜‍♀️'
  },
  'Stockholm': {
    landmarks: ['Gamla Stan', 'Vasa Museum', 'Royal Palace', 'City Hall'],
    searchTerms: ['Stockholm Gamla Stan old town', 'Stockholm waterfront sunset', 'Stockholm City Hall'],
    fallbackEmoji: '🏰'
  },
  'Seoul': {
    landmarks: ['Gyeongbokgung Palace', 'N Seoul Tower', 'Bukchon Hanok Village', 'Myeongdong'],
    searchTerms: ['Seoul Gyeongbokgung Palace', 'Seoul N Tower night', 'Seoul palace traditional'],
    fallbackEmoji: '🏯'
  },
  'Hong Kong': {
    landmarks: ['Victoria Peak', 'Victoria Harbour', 'Big Buddha', 'Star Ferry'],
    searchTerms: ['Hong Kong Victoria Harbour skyline', 'Hong Kong Peak night view', 'Hong Kong skyline'],
    fallbackEmoji: '🌃'
  },
  'San Francisco': {
    landmarks: ['Golden Gate Bridge', 'Alcatraz Island', 'Fishermans Wharf', 'Cable Cars'],
    searchTerms: ['San Francisco Golden Gate Bridge', 'Golden Gate Bridge sunset fog', 'San Francisco cable car'],
    fallbackEmoji: '🌉'
  },
  'Los Angeles': {
    landmarks: ['Hollywood Sign', 'Santa Monica Pier', 'Griffith Observatory', 'Venice Beach'],
    searchTerms: ['Los Angeles Hollywood Sign', 'LA Hollywood Sign sunset', 'Santa Monica Pier sunset'],
    fallbackEmoji: '🎬'
  },
  'Las Vegas': {
    landmarks: ['Las Vegas Strip', 'Bellagio Fountains', 'Fremont Street', 'Red Rock Canyon'],
    searchTerms: ['Las Vegas Strip night lights', 'Las Vegas Bellagio fountains', 'Vegas neon lights'],
    fallbackEmoji: '🎰'
  },
  'Miami': {
    landmarks: ['South Beach', 'Art Deco District', 'Ocean Drive', 'Wynwood Walls'],
    searchTerms: ['Miami Beach South Beach', 'Miami Art Deco Ocean Drive', 'Miami Beach sunset'],
    fallbackEmoji: '🏖️'
  },
  'Chicago': {
    landmarks: ['Willis Tower', 'Cloud Gate', 'Navy Pier', 'Millennium Park'],
    searchTerms: ['Chicago Cloud Gate Bean', 'Chicago skyline Willis Tower', 'Chicago river architecture'],
    fallbackEmoji: '🏙️'
  },
  'Boston': {
    landmarks: ['Freedom Trail', 'Fenway Park', 'Boston Common', 'Harvard University'],
    searchTerms: ['Boston skyline harbor', 'Boston Freedom Trail historic', 'Boston Common park'],
    fallbackEmoji: '🏛️'
  },
  'Washington': {
    landmarks: ['White House', 'Lincoln Memorial', 'Capitol Building', 'Washington Monument'],
    searchTerms: ['Washington DC Capitol Building', 'Washington Monument Lincoln Memorial', 'White House Washington DC'],
    fallbackEmoji: '🏛️'
  },
  'Mexico City': {
    landmarks: ['Zócalo', 'Chapultepec Castle', 'Palacio de Bellas Artes', 'Teotihuacan'],
    searchTerms: ['Mexico City Zocalo cathedral', 'Mexico City Bellas Artes palace', 'Mexico City Angel Independence'],
    fallbackEmoji: '🏛️'
  },
  'Rio de Janeiro': {
    landmarks: ['Christ the Redeemer', 'Sugarloaf Mountain', 'Copacabana Beach', 'Ipanema Beach'],
    searchTerms: ['Rio Christ Redeemer statue', 'Rio de Janeiro Sugarloaf Mountain', 'Copacabana Beach Rio'],
    fallbackEmoji: '🏖️'
  },
  'Buenos Aires': {
    landmarks: ['Casa Rosada', 'La Boca', 'Recoleta Cemetery', 'Teatro Colón'],
    searchTerms: ['Buenos Aires Casa Rosada pink', 'Buenos Aires La Boca colorful', 'Buenos Aires Obelisco'],
    fallbackEmoji: '🏛️'
  },
  'Cairo': {
    landmarks: ['Pyramids of Giza', 'Sphinx', 'Egyptian Museum', 'Khan el-Khalili'],
    searchTerms: ['Cairo Pyramids Giza Sphinx', 'Egypt Pyramids sunset', 'Cairo pyramids camels'],
    fallbackEmoji: '🔺'
  },
  'Cape Town': {
    landmarks: ['Table Mountain', 'V&A Waterfront', 'Robben Island', 'Cape of Good Hope'],
    searchTerms: ['Cape Town Table Mountain', 'Cape Town waterfront harbor', 'Cape Town beach mountain'],
    fallbackEmoji: '⛰️'
  },
  'Marrakech': {
    landmarks: ['Jemaa el-Fnaa', 'Majorelle Garden', 'Koutoubia Mosque', 'Bahia Palace'],
    searchTerms: ['Marrakech Jemaa el-Fnaa square', 'Marrakech souk market', 'Marrakech mosque minaret'],
    fallbackEmoji: '🕌'
  },
  'Mumbai': {
    landmarks: ['Gateway of India', 'Marine Drive', 'Chhatrapati Shivaji Terminus', 'Haji Ali Dargah'],
    searchTerms: ['Mumbai Gateway India', 'Mumbai Marine Drive skyline', 'Mumbai Victoria Terminus'],
    fallbackEmoji: '🏛️'
  },
  'Delhi': {
    landmarks: ['India Gate', 'Red Fort', 'Lotus Temple', 'Qutub Minar'],
    searchTerms: ['Delhi India Gate', 'Delhi Red Fort', 'Delhi Lotus Temple'],
    fallbackEmoji: '🏛️'
  },
  'Bali': {
    landmarks: ['Tanah Lot Temple', 'Uluwatu Temple', 'Tegallalang Rice Terraces', 'Mount Batur'],
    searchTerms: ['Bali Tanah Lot temple sunset', 'Bali rice terraces green', 'Bali temple ocean'],
    fallbackEmoji: '🏝️'
  },
  'Athens': {
    landmarks: ['Acropolis', 'Parthenon', 'Ancient Agora', 'Temple of Zeus'],
    searchTerms: ['Athens Acropolis Parthenon', 'Athens Parthenon sunset', 'Athens ancient ruins'],
    fallbackEmoji: '🏛️'
  },
  'Santorini': {
    landmarks: ['Oia Blue Domes', 'Caldera View', 'Red Beach', 'Akrotiri'],
    searchTerms: ['Santorini Oia blue domes', 'Santorini white houses blue', 'Santorini sunset caldera'],
    fallbackEmoji: '🏝️'
  },
  'Venice': {
    landmarks: ['St. Marks Square', 'Rialto Bridge', 'Grand Canal', 'Bridge of Sighs'],
    searchTerms: ['Venice Grand Canal gondola', 'Venice St Marks Square basilica', 'Venice Rialto Bridge'],
    fallbackEmoji: '🚤'
  },
  'Florence': {
    landmarks: ['Duomo Cathedral', 'Ponte Vecchio', 'Uffizi Gallery', 'David Statue'],
    searchTerms: ['Florence Duomo cathedral dome', 'Florence Ponte Vecchio bridge', 'Florence skyline Duomo'],
    fallbackEmoji: '🏛️'
  },
  'Lisbon': {
    landmarks: ['Belém Tower', 'Jerónimos Monastery', 'Tram 28', 'São Jorge Castle'],
    searchTerms: ['Lisbon Belem Tower', 'Lisbon yellow tram 28', 'Lisbon colorful buildings'],
    fallbackEmoji: '🚋'
  },
  'Edinburgh': {
    landmarks: ['Edinburgh Castle', 'Royal Mile', 'Arthur Seat', 'Calton Hill'],
    searchTerms: ['Edinburgh Castle hill', 'Edinburgh Royal Mile historic', 'Edinburgh skyline castle'],
    fallbackEmoji: '🏰'
  },
  'Dublin': {
    landmarks: ['Trinity College', 'Temple Bar', 'Guinness Storehouse', 'Dublin Castle'],
    searchTerms: ['Dublin Temple Bar colorful', 'Dublin Trinity College library', 'Dublin river Liffey'],
    fallbackEmoji: '🍀'
  }
};

// Helper function to get the best search term for a city
export function getIconicImageSearch(cityName: string): {
  searchTerm: string;
  fallbackEmoji: string;
} {
  // Clean the city name (remove country if present)
  const cleanCity = cityName.split(',')[0].trim();
  
  // Try exact match first
  if (CITY_LANDMARKS[cleanCity]) {
    const cityData = CITY_LANDMARKS[cleanCity];
    // Return the first (most iconic) search term
    return {
      searchTerm: cityData.searchTerms[0],
      fallbackEmoji: cityData.fallbackEmoji
    };
  }
  
  // Try partial match
  const partialMatch = Object.keys(CITY_LANDMARKS).find(city => 
    cleanCity.toLowerCase().includes(city.toLowerCase()) ||
    city.toLowerCase().includes(cleanCity.toLowerCase())
  );
  
  if (partialMatch) {
    const cityData = CITY_LANDMARKS[partialMatch];
    return {
      searchTerm: cityData.searchTerms[0],
      fallbackEmoji: cityData.fallbackEmoji
    };
  }
  
  // Default fallback for unknown cities
  return {
    searchTerm: `${cleanCity} landmark tourist attraction`,
    fallbackEmoji: '🏛️'
  };
}

// Get multiple search terms for variety
export function getMultipleIconicSearches(cityName: string, count: number = 3): string[] {
  const cleanCity = cityName.split(',')[0].trim();
  
  if (CITY_LANDMARKS[cleanCity]) {
    return CITY_LANDMARKS[cleanCity].searchTerms.slice(0, count);
  }
  
  // Fallback searches for unknown cities
  return [
    `${cleanCity} famous landmark`,
    `${cleanCity} tourist attraction`,
    `${cleanCity} city skyline`
  ];
}