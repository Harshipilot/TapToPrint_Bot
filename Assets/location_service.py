import json
import math
import random
import urllib.parse
import urllib.request
import urllib.error

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "PrintXBot/1.0 (contact: example@example.com)"


def generate_nearby_shops(user_lat, user_lon, num_shops=3, max_distance_km=10):
    """Generate fake print shops near the user's location."""
    shops = []
    
    # Shop name templates
    name_templates = [
        "Quick Print Center", "Digital Print Hub", "Express Copy Shop", "PrintPro Outlet",
        "City Print Services", "Fast Print Station", "Print Masters", "Copy & Print Plus",
        "Print Zone", "Document Solutions", "Print Palace", "Copy Corner"
    ]
    
    # Area names for addresses
    areas = [
        "Main Market", "Central Plaza", "Shopping Complex", "Business District", 
        "Commercial Area", "Market Square", "City Center", "Downtown", "Uptown",
        "Metro Station", "Mall Area", "Residential Complex"
    ]
    
    for i in range(num_shops):
        # Generate random distance and angle
        distance = random.uniform(0.5, max_distance_km)  # 0.5 to 10 km
        angle = random.uniform(0, 2 * math.pi)  # Random direction
        
        # Convert to lat/lon offset (approximate)
        # 1 degree lat ≈ 111 km, 1 degree lon ≈ 111 km * cos(lat)
        lat_offset = (distance * math.sin(angle)) / 111.0
        lon_offset = (distance * math.cos(angle)) / (111.0 * math.cos(math.radians(user_lat)))
        
        shop_lat = user_lat + lat_offset
        shop_lon = user_lon + lon_offset
        
        # Generate shop name and address
        name = f"{random.choice(name_templates)} {i+1}"
        address = f"{random.choice(areas)}, {random.choice(['Near', 'Opposite', 'Beside'])} {random.choice(['Mall', 'Hospital', 'School', 'Park', 'Station'])}"
        
        shops.append({
            "lat": shop_lat,
            "lon": shop_lon,
            "name": name,
            "address": address,
            "distance": distance
        })
    
    # Sort by distance
    shops.sort(key=lambda x: x["distance"])
    return shops

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth."""
    R = 6371  # Radius of the Earth in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

def reverse_geocode_location(lat, lon):
    """Return a human-readable address for the given coordinates."""
    params = {
        "format": "json",
        "lat": lat,
        "lon": lon,
        "zoom": 18,
        "addressdetails": 1
    }
    url = f"{NOMINATIM_URL}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            data = json.load(response)
            return data.get("display_name")
    except (urllib.error.URLError, json.JSONDecodeError):
        return None


def build_shop_address(tags):
    """Build a readable address string from OSM tags."""
    parts = []
    for key in ["addr:housenumber", "addr:street", "addr:city", "addr:postcode", "addr:country"]:
        value = tags.get(key)
        if value:
            parts.append(value)
    if parts:
        return ", ".join(parts)

    if tags.get("name"):
        return tags.get("name")

    return "Print shop"


def get_shop_name(tags):
    """Choose the best available name for a shop."""
    return tags.get("name") or tags.get("shop") or tags.get("amenity") or "Print shop"


def search_nearby_print_shops(user_lat, user_lon, radius_m=3000, top_n=4):
    """Query OpenStreetMap Overpass API for nearby printing / copy shops."""
    query = f"""
[out:json][timeout:25];
(
  node[\"amenity\"=\"copyshop\"](around:{radius_m},{user_lat},{user_lon});
  way[\"amenity\"=\"copyshop\"](around:{radius_m},{user_lat},{user_lon});
  relation[\"amenity\"=\"copyshop\"](around:{radius_m},{user_lat},{user_lon});
  node[\"shop\"=\"printing\"](around:{radius_m},{user_lat},{user_lon});
  way[\"shop\"=\"printing\"](around:{radius_m},{user_lat},{user_lon});
  relation[\"shop\"=\"printing\"](around:{radius_m},{user_lat},{user_lon});
);
out center;
""".strip()

    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    request = urllib.request.Request(
        OVERPASS_URL,
        data=data,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.load(response)
    except (urllib.error.URLError, json.JSONDecodeError):
        return []

    shops = []
    for element in result.get("elements", []):
        tags = element.get("tags", {})
        if not tags:
            continue

        if element.get("type") == "node":
            shop_lat = element.get("lat")
            shop_lon = element.get("lon")
        else:
            center = element.get("center", {})
            shop_lat = center.get("lat")
            shop_lon = center.get("lon")

        if shop_lat is None or shop_lon is None:
            continue

        distance = haversine_distance(user_lat, user_lon, shop_lat, shop_lon)
        shops.append({
            "name": get_shop_name(tags),
            "address": build_shop_address(tags),
            "distance": distance
        })

    shops.sort(key=lambda x: x["distance"])
    return shops[:top_n]


def find_nearest_locations(user_lat, user_lon, top_n=3):
    """Find the nearest real print shops to the user's coordinates."""
    shops = search_nearby_print_shops(user_lat, user_lon, top_n=top_n)

    fallback = False
    if not shops:
        shops = generate_nearby_shops(user_lat, user_lon, num_shops=top_n, max_distance_km=10)
        fallback = True

    locations_with_distances = []
    for shop in shops:
        locations_with_distances.append((shop["distance"], {
            "name": shop["name"],
            "address": shop["address"]
        }))

    return locations_with_distances, fallback


def get_location_message(locations_with_distances, user_address=None, fallback=False):
    """Generate a message for the nearest locations."""
    if user_address:
        message = f"📍 <b>Your Location</b>: {user_address}\n\n"
    else:
        message = "📍 <b>Nearest Print Shops</b>\n\n"

    for i, (distance, location) in enumerate(locations_with_distances, 1):
        message += f"🏢 <b>{i}. {location['name']}</b>\n"
        message += f"📌 {location['address']}\n"
        message += f"📏 Distance: {distance:.2f} km\n\n"

    if fallback:
        message += "⚠️ Could not fetch live map data, showing generated nearby shops.\n\n"

    message += "🕒 Business Hours: 9 AM - 9 PM\n"
    message += "📞 Contact: +91-XXXXXXXXXX"
    return message
