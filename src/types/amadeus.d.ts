declare module 'amadeus' {
  export default class Amadeus {
    constructor(config: {
      clientId: string;
      clientSecret: string;
    });
    
    shopping: {
      flightOffersSearch: {
        get(params: any): Promise<any>;
      };
    };
    
    referenceData: {
      locations: {
        get(params: any): Promise<any>;
      };
    };
  }
}