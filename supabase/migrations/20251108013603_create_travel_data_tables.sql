/*
  # Create Travel Data Tables

  1. New Tables
    - `destinations`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `country` (text)
      - `airport_code` (text)
      - `flight_time_from_blr` (integer, minutes)
      - `avg_flight_price` (integer, base price in INR)
      - `timezone` (text)
      - `created_at` (timestamp)
    
    - `hotels`
      - `id` (uuid, primary key)
      - `destination_id` (uuid, foreign key)
      - `name` (text)
      - `rating` (decimal)
      - `location` (text)
      - `amenities` (jsonb array)
      - `price_per_night` (integer, INR)
      - `hotel_type` (text: budget/mid-range/luxury)
      - `created_at` (timestamp)
    
    - `flights`
      - `id` (uuid, primary key)
      - `destination_id` (uuid, foreign key)
      - `airline` (text)
      - `flight_number` (text)
      - `departure_time` (text)
      - `duration_minutes` (integer)
      - `base_price` (integer, INR)
      - `class` (text: economy/business/first)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Allow public read access (for travel search)
    - Restrict write access to authenticated users only

  3. Seed Data
    - Popular Indian and international destinations
    - Realistic flight and hotel data
*/

-- Destinations table
CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  country text NOT NULL,
  airport_code text NOT NULL,
  flight_time_from_blr integer NOT NULL,
  avg_flight_price integer NOT NULL,
  timezone text DEFAULT 'Asia/Kolkata',
  created_at timestamptz DEFAULT now()
);

-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid REFERENCES destinations(id) ON DELETE CASCADE,
  name text NOT NULL,
  rating decimal(2,1) CHECK (rating >= 0 AND rating <= 5),
  location text NOT NULL,
  amenities jsonb DEFAULT '[]'::jsonb,
  price_per_night integer NOT NULL,
  hotel_type text CHECK (hotel_type IN ('budget', 'mid-range', 'luxury')) DEFAULT 'mid-range',
  created_at timestamptz DEFAULT now()
);

-- Flights table
CREATE TABLE IF NOT EXISTS flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid REFERENCES destinations(id) ON DELETE CASCADE,
  airline text NOT NULL,
  flight_number text NOT NULL,
  departure_time text NOT NULL,
  duration_minutes integer NOT NULL,
  base_price integer NOT NULL,
  class text CHECK (class IN ('economy', 'business', 'first')) DEFAULT 'economy',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;

-- Public read access for travel search
CREATE POLICY "Anyone can view destinations"
  ON destinations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view hotels"
  ON hotels FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view flights"
  ON flights FOR SELECT
  USING (true);

-- Only authenticated users can insert/update
CREATE POLICY "Authenticated users can insert destinations"
  ON destinations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert hotels"
  ON hotels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert flights"
  ON flights FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hotels_destination ON hotels(destination_id);
CREATE INDEX IF NOT EXISTS idx_flights_destination ON flights(destination_id);
CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations(name);

-- Seed popular destinations
INSERT INTO destinations (name, country, airport_code, flight_time_from_blr, avg_flight_price)
VALUES
  ('Goa', 'India', 'GOI', 90, 4000),
  ('Mumbai', 'India', 'BOM', 90, 4500),
  ('Delhi', 'India', 'DEL', 150, 5500),
  ('Dubai', 'UAE', 'DXB', 210, 15000),
  ('Singapore', 'Singapore', 'SIN', 270, 18000),
  ('Bangkok', 'Thailand', 'BKK', 210, 12000),
  ('Maldives', 'Maldives', 'MLE', 90, 20000),
  ('Kathmandu', 'Nepal', 'KTM', 180, 8000),
  ('Colombo', 'Sri Lanka', 'CMB', 75, 7000),
  ('Kuala Lumpur', 'Malaysia', 'KUL', 240, 14000)
ON CONFLICT (name) DO NOTHING;
