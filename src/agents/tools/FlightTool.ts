import { Tool } from './Tool';
import axios from 'axios';

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;

let amadeusToken: string | null = null;
let tokenExpiry: number = 0;

async function getAmadeusToken(): Promise<string | null> {
  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    return null;
  }

  if (amadeusToken && Date.now() < tokenExpiry) {
    return amadeusToken;
  }

  try {
    const response = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AMADEUS_API_KEY,
        client_secret: AMADEUS_API_SECRET,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    amadeusToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return amadeusToken;
  } catch (error: any) {
    console.error('Error getting Amadeus token:', error.response?.data || error.message);
    return null;
  }
}

async function getIATACode(cityName: string, token: string): Promise<string | null> {
  try {
    // City name mapping for common variations
    const cityMap: Record<string, string> = {
      'bangalore': 'Bengaluru',
      'bombay': 'Mumbai',
      'calcutta': 'Kolkata',
      'madras': 'Chennai',
      'new york': 'New York',
      'san francisco': 'San Francisco',
    };
    
    const searchCity = cityMap[cityName.toLowerCase()] || cityName;
    
    const response = await axios.get(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${encodeURIComponent(searchCity)}&page[limit]=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.data.data && response.data.data.length > 0) {
      // Prefer CITY type over AIRPORT
      const cityResult = response.data.data.find((loc: any) => loc.subType === 'CITY');
      return (cityResult || response.data.data[0]).iataCode;
    }
    return null;
  } catch (error: any) {
    console.error('Error getting IATA code:', error.response?.data || error.message);
    return null;
  }
}

export const FlightTool: Tool = {
  name: 'search_flights',
  description: 'Searches for flights between cities',
  inputSchema: { destination: 'string', dates: { from: 'string', to: 'string' } },
  async execute(input: any) {
    console.log('Searching flights for', input);

    const destination = input.destination || 'Goa';
    const origin = input.origin || 'Bangalore';
    const departDate = input.dates?.from || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const token = await getAmadeusToken();

    if (!token) {
      console.log('❌ No Amadeus token - API keys may be invalid. Using mock data.');
      return generateMockFlights(destination, departDate, origin);
    }
    
    console.log('✅ Got Amadeus token, searching for flights...');

    try {
      const originCode = await getIATACode(origin, token);
      const destCode = await getIATACode(destination, token);

      console.log(`IATA codes: ${origin} = ${originCode}, ${destination} = ${destCode}`);

      if (!originCode || !destCode) {
        console.log('❌ Could not get IATA codes, using mock data');
        return generateMockFlights(destination, departDate, origin);
      }

      const response = await axios.get(
        `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originCode}&destinationLocationCode=${destCode}&departureDate=${departDate}&adults=1&max=5`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data.data || response.data.data.length === 0) {
        console.log('No flights found from API, using mock data');
        return generateMockFlights(destination, departDate, origin);
      }

      const flights = response.data.data.map((offer: any, idx: number) => {
        const segment = offer.itineraries[0].segments[0];
        const price = parseFloat(offer.price.total);
        const currency = offer.price.currency;
        
        const departTime = new Date(segment.departure.at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const arriveTime = new Date(segment.arrival.at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        const durationMinutes = parseDuration(offer.itineraries[0].duration);
        const durationHours = Math.floor(durationMinutes / 60);
        const durationMins = durationMinutes % 60;

        return {
          id: `${segment.carrierCode}${segment.number}`,
          airline: segment.carrierCode,
          flightNumber: `${segment.carrierCode}${segment.number}`,
          from: `${origin} (${originCode})`,
          to: `${destination} (${destCode})`,
          depart: departDate,
          departTime: departTime,
          arriveTime: arriveTime,
          duration: `${durationHours}h ${durationMins}m`,
          stops: offer.itineraries[0].segments.length - 1,
          price: Math.round(price),
          currency: currency,
          priceINR: currency === 'INR' ? Math.round(price) : Math.round(price * 83),
          class: 'Economy',
          seats: 'Available',
          bookingLink: `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from ${origin} to ${destination} ${departDate}`)}`,
          cheapest: false,
        };
      }).sort((a: any, b: any) => a.priceINR - b.priceINR);

      if (flights.length > 0) {
        flights[0].cheapest = true;
      }

      return {
        ok: true,
        flights: flights,
        cheapest: flights[0],
        source: 'Amadeus API (Real Data)',
      };
    } catch (error: any) {
      console.error('Error fetching flights from Amadeus:', error.response?.data || error.message);
      return generateMockFlights(destination, departDate, origin);
    }
  },
};

function parseDuration(duration: string): number {
  const hours = duration.match(/(\d+)H/);
  const minutes = duration.match(/(\d+)M/);
  return (hours ? parseInt(hours[1]) : 0) * 60 + (minutes ? parseInt(minutes[1]) : 0);
}

function generateMockFlights(destination: string, departDate: string, origin: string = 'Bangalore') {
  const airlines = [
    { name: 'IndiGo', code: '6E', website: 'https://www.goindigo.in' },
    { name: 'SpiceJet', code: 'SG', website: 'https://www.spicejet.com' },
    { name: 'Air India', code: 'AI', website: 'https://www.airindia.in' },
    { name: 'Vistara', code: 'UK', website: 'https://www.airvistara.com' },
    { name: 'AirAsia India', code: 'I5', website: 'https://www.airasia.com' }
  ];
  
  const times = [
    { depart: '06:30', arrive: '09:00', duration: '2h 30m' },
    { depart: '09:15', arrive: '11:45', duration: '2h 30m' },
    { depart: '12:45', arrive: '15:15', duration: '2h 30m' },
    { depart: '15:20', arrive: '17:50', duration: '2h 30m' },
    { depart: '18:00', arrive: '20:30', duration: '2h 30m' }
  ];
  
  const basePrices = [2999, 3299, 3799, 4199, 3499];
  
  const flights = [];
  const numFlights = 5;
  
  for (let idx = 0; idx < numFlights; idx++) {
    const airline = airlines[idx % airlines.length];
    const timeSlot = times[idx % times.length];
    const basePrice = basePrices[idx % basePrices.length];
    
    const priceVariation = Math.floor(Math.random() * 1000) - 200;
    const finalPrice = Math.max(basePrice + priceVariation, 2500);
    
    const stops = Math.random() > 0.6 ? 0 : 1;
    const flightNumber = `${airline.code}${Math.floor(1000 + Math.random() * 9000)}`;
    
    const bookingUrl = `${airline.website}/booking?from=BLR&to=${destination}&date=${departDate}&class=economy`;
    
    flights.push({
      id: flightNumber,
      airline: airline.name,
      flightNumber: flightNumber,
      from: `${origin} (BLR)`,
      to: `${destination} Airport`,
      depart: departDate,
      departTime: timeSlot.depart,
      arriveTime: timeSlot.arrive,
      duration: timeSlot.duration,
      stops: stops,
      price: finalPrice,
      priceINR: finalPrice,
      currency: 'INR',
      class: 'Economy',
      seats: Math.random() > 0.3 ? 'Available' : 'Limited',
      bookingLink: bookingUrl,
      cheapest: false,
    });
  }
  
  const cheapestIndex = flights.reduce((minIdx, flight, idx, arr) => 
    flight.price < arr[minIdx].price ? idx : minIdx, 0);
  flights[cheapestIndex].cheapest = true;
  
  flights.sort((a, b) => a.price - b.price);

  return {
    ok: true,
    flights: flights,
    cheapest: flights[0],
    source: 'Mock Data (Configure AMADEUS_API_KEY for real prices)',
  };
}
