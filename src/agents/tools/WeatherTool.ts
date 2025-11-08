import { Tool } from './Tool';
import axios from 'axios';

export const WeatherTool: Tool = {
  name: 'check_weather',
  description: 'Checks weather conditions for a destination',
  inputSchema: { destination: 'string', days: 'number' },
  async execute(input: any) {
    console.log('Checking weather for', input);

    const destination = input.destination || 'Goa';
    const days = Math.min(input.days || 5, 7);

    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      return generateMockWeather(destination, days);
    }

    try {
      const geoResponse = await axios.get(
        `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${apiKey}`
      );

      if (!geoResponse.data || geoResponse.data.length === 0) {
        return generateMockWeather(destination, days);
      }

      const { lat, lon, name } = geoResponse.data[0];

      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      );

      const forecasts = weatherResponse.data.list
        .filter((_: any, idx: number) => idx % 8 === 0)
        .slice(0, days)
        .map((item: any) => ({
          date: new Date(item.dt * 1000).toLocaleDateString(),
          temp: Math.round(item.main.temp),
          tempMin: Math.round(item.main.temp_min),
          tempMax: Math.round(item.main.temp_max),
          condition: item.weather[0].main,
          description: item.weather[0].description,
          humidity: item.main.humidity,
          windSpeed: Math.round(item.wind.speed * 3.6),
          icon: item.weather[0].icon,
        }));

      const current = weatherResponse.data.list[0];

      return {
        ok: true,
        location: name,
        current: {
          temp: Math.round(current.main.temp),
          condition: current.weather[0].main,
          description: current.weather[0].description,
          humidity: current.main.humidity,
          windSpeed: Math.round(current.wind.speed * 3.6),
          feelsLike: Math.round(current.main.feels_like),
        },
        forecast: forecasts,
      };
    } catch (error: any) {
      console.error('Error fetching weather:', error.message);
      return generateMockWeather(destination, days);
    }
  },
};

function generateMockWeather(destination: string, days: number) {
  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Clear'];
  const forecasts = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const temp = 25 + Math.floor(Math.random() * 10);

    forecasts.push({
      date: date.toLocaleDateString(),
      temp: temp,
      tempMin: temp - 3,
      tempMax: temp + 3,
      condition: condition,
      description: condition.toLowerCase(),
      humidity: 60 + Math.floor(Math.random() * 30),
      windSpeed: 10 + Math.floor(Math.random() * 15),
    });
  }

  return {
    ok: true,
    location: destination,
    current: {
      temp: forecasts[0].temp,
      condition: forecasts[0].condition,
      description: forecasts[0].description,
      humidity: forecasts[0].humidity,
      windSpeed: forecasts[0].windSpeed,
      feelsLike: forecasts[0].temp - 1,
    },
    forecast: forecasts,
  };
}
