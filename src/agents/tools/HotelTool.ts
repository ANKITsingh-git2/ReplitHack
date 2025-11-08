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

async function getCityCode(cityName: string, token: string): Promise<string | null> {
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
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${encodeURIComponent(searchCity)}&page[limit]=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0].iataCode;
    }
    return null;
  } catch (error: any) {
    console.error('Error getting city code:', error.response?.data || error.message);
    return null;
  }
}

export const HotelTool: Tool = {
  name: 'search_hotels',
  description: 'Searches for hotels in a destination',
  inputSchema: { destination: 'string', nights: 'number' },
  async execute(input: any) {
    console.log('Searching hotels in', input);

    const destination = input.destination || 'Goa';
    const nights = input.nights || 2;
    const checkIn = getCheckInDate();
    const checkOut = getCheckOutDate(nights);

    const token = await getAmadeusToken();

    if (!token) {
      console.log('❌ No Amadeus token - API keys may be invalid. Using mock data.');
      return generateMockHotels(destination, nights);
    }
    
    console.log('✅ Got Amadeus token, searching for hotels...');

    try {
      const cityCode = await getCityCode(destination, token);

      if (!cityCode) {
        console.log('Could not get city code, using mock data');
        return generateMockHotels(destination, nights);
      }

      // First, search for hotels in the city
      const hotelsListResponse = await axios.get(
        `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&radius=5&radiusUnit=KM&hotelSource=ALL`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!hotelsListResponse.data.data || hotelsListResponse.data.data.length === 0) {
        console.log('No hotels found in city, using mock data');
        return generateMockHotels(destination, nights);
      }

      // Get first 6 hotel IDs
      const hotelIds = hotelsListResponse.data.data.slice(0, 6).map((h: any) => h.hotelId).join(',');

      // Then get offers for those hotels
      const response = await axios.get(
        `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${hotelIds}&checkInDate=${checkIn}&checkOutDate=${checkOut}&adults=1&roomQuantity=1&bestRateOnly=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data.data || response.data.data.length === 0) {
        console.log('No hotels found from API, using mock data');
        return generateMockHotels(destination, nights);
      }

      const hotels = response.data.data.map((hotel: any, idx: number) => {
        const offer = hotel.offers[0];
        const pricePerNight = parseFloat(offer.price.total) / nights;
        const totalPrice = parseFloat(offer.price.total);
        const currency = offer.price.currency;

        const amenities = [];
        if (hotel.hotel.amenities) {
          hotel.hotel.amenities.slice(0, 5).forEach((amenity: string) => {
            amenities.push(amenity.replace(/_/g, ' '));
          });
        }
        if (amenities.length === 0) {
          amenities.push('WiFi', 'Restaurant', 'Room Service');
        }

        return {
          id: hotel.hotel.hotelId,
          name: hotel.hotel.name,
          destination: destination,
          location: hotel.hotel.cityCode || destination,
          rating: hotel.hotel.rating ? parseFloat(hotel.hotel.rating) : 4.0,
          stars: Math.min(5, Math.ceil(hotel.hotel.rating || 4)),
          amenities: amenities,
          nights: nights,
          pricePerNight: Math.round(pricePerNight),
          totalPrice: Math.round(totalPrice),
          pricePerNightINR: currency === 'INR' ? Math.round(pricePerNight) : Math.round(pricePerNight * 83),
          totalPriceINR: currency === 'INR' ? Math.round(totalPrice) : Math.round(totalPrice * 83),
          currency: currency,
          availability: 'Available',
          bookingLink: `https://www.booking.com/search.html?ss=${encodeURIComponent(destination)}&checkin=${checkIn}&checkout=${checkOut}`,
          cheapest: false,
        };
      }).sort((a: any, b: any) => a.pricePerNightINR - b.pricePerNightINR);

      if (hotels.length > 0) {
        hotels[0].cheapest = true;
      }

      return {
        ok: true,
        hotels: hotels,
        cheapest: hotels[0],
        source: 'Amadeus API (Real Data)',
      };
    } catch (error: any) {
      console.error('Error fetching hotels from Amadeus:', error.response?.data || error.message);
      return generateMockHotels(destination, nights);
    }
  },
};

function getCheckInDate(): string {
  const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

function getCheckOutDate(nights: number): string {
  const date = new Date(Date.now() + (30 + nights) * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

function generateMockHotels(destination: string, nights: number) {
  const hotels = [
    {
      name: `${destination} Grand Hotel`,
      rating: 4.8,
      price: 3200,
      location: 'City Center',
      amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Gym', 'Bar'],
      stars: 5,
    },
    {
      name: `${destination} Beach Resort & Spa`,
      rating: 4.6,
      price: 2800,
      location: 'Beachfront',
      amenities: ['WiFi', 'Beach Access', 'Pool', 'Restaurant', 'Water Sports'],
      stars: 4,
    },
    {
      name: `Luxury ${destination} Suites`,
      rating: 4.5,
      price: 2500,
      location: 'Downtown',
      amenities: ['WiFi', 'Pool', 'Restaurant', 'Gym', 'Room Service'],
      stars: 4,
    },
    {
      name: `${destination} Heritage Hotel`,
      rating: 4.3,
      price: 1800,
      location: 'Old Town',
      amenities: ['WiFi', 'Restaurant', 'Heritage Building', 'Garden'],
      stars: 3,
    },
    {
      name: `${destination} Comfort Inn`,
      rating: 4.0,
      price: 1200,
      location: 'Near Airport',
      amenities: ['WiFi', 'Restaurant', 'Free Parking', 'Airport Shuttle'],
      stars: 3,
    },
  ];

  const hotelList = hotels.map((hotel, idx) => {
    const priceVariation = Math.floor(Math.random() * 400) - 200;
    const finalPrice = Math.max(hotel.price + priceVariation, 1000);
    const totalPrice = finalPrice * nights;

    return {
      id: `HT${String(100 + idx).padStart(3, '0')}`,
      name: hotel.name,
      destination: destination,
      location: hotel.location,
      rating: hotel.rating,
      stars: hotel.stars,
      amenities: hotel.amenities,
      nights: nights,
      pricePerNight: finalPrice,
      totalPrice: totalPrice,
      pricePerNightINR: finalPrice,
      totalPriceINR: totalPrice,
      currency: 'INR',
      availability: 'Available',
      bookingLink: `https://www.booking.com/search.html?ss=${encodeURIComponent(destination)}&checkin=${getCheckInDate()}&checkout=${getCheckOutDate(nights)}`,
      cheapest: false,
    };
  }).sort((a, b) => a.pricePerNight - b.pricePerNight);

  hotelList[0].cheapest = true;

  return {
    ok: true,
    hotels: hotelList,
    cheapest: hotelList[0],
    source: 'Mock Data (Configure AMADEUS_API_KEY for real prices)',
  };
}
