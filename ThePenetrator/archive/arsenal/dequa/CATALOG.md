# Dequa (v4w_website) — Flask Navigation API
# Source: C:\Users\natha\v4w_website

## ARCHITECTURE
Flask + SQLAlchemy + Flask-RESTful + JWT + Flask-Security
Version: 0.1.5 | API Version: 1.0
Multi-database binds: main, trackusage, users, errors, ideas, feed_err

## DATABASE MODELS (app/models.py)

### Geographic
- Location: lat, lon, street_id, neighborhood_id, housenumber, shape (PickleType)
- Area: name, shape (polygon)
- Street: name, name_alt, name_spe, name_den, shape, score (0-100)
- Neighborhood: name (sestiere), zipcode, shape
- Poi: name, name_alt, location_id, category, hours, wheelchair, osm_id, osm_tags

### Auth & Permissions
- Users: email, password (hashed), roles, confirmed_at
- Roles: name, description
- Tokens: user_id, type, jti, token, revoked, expires
- TokenTypes: type name → permissions (many-to-many with Apis)
- Apis: name, path (registered endpoints)
- TokenApiCounters: per-token-per-API request counting

### Error System
- ErrorGroups → ErrorCodes → ErrorTranslations × Languages
- Multi-language error responses (default: English)

### Analytics
- FlaskUsage: full request logging via TrackUsage
- Ideas: community feedback with voting
- Feedbacks: user reports with geospatial data

## RELATION TABLES
- poi_types (POI ↔ Types M2M)
- area_streets (Area ↔ Street M2M)
- streets_neighborhoods (Street ↔ Neighborhood M2M)

## API ENDPOINTS (app/api.py)

### GetAddressAPI (GET)
- Input: address (required), language (default: en)
- Auth: JWT + permission_required decorator
- Returns: { address, longitude, latitude }
- Error codes: 10 (not found), 11 (ambiguous), 21 (bad args)

### getPath (GET)
- Input: start, end (required), speed (default: 5), mode (default: foot), language
- Auth: JWT + permission_required
- Returns: { length, time, url (dequa link) }
- Supports: walk, boat modes
- Error codes: 12 (routing error), 20 (bad coords)

### getMultiplePaths (GET)
- Input: start[] (multiple origins), end, speed, mode, language
- Auth: JWT + permission_required
- Returns: { start_point: { length, time } } for each origin

## AUTH PATTERN
```
@permission_required decorator:
  1. verify_jwt_in_request()
  2. Extract claims → get token type
  3. verify_permissions(type, url) → check TokenType.permissions contains Api
  4. update_api_counter() → increment TokenApiCounters
```

## CORE LIBRARIES (app/src/libpy/)

### lib_graph.py — Graph Routing Engine
- load_graphs(pickle_terra, pickle_acqua) → dual networkx graphs
- calculate_path_wkt() → shortest path with distance
- dynamically_add_edges() → runtime graph modification
- Dependencies: NetworkX, Shapely, GeoPy, Pickle

### lib_search.py — Address & POI Lookup
- find_address_in_db(address) → coordinate matches
- find_POI(N, coords, category, maxAttempts) → proximity search with expanding radius
- find_closest_nodes() → euclidean distance to graph nodes
- Fuzzy matching: FuzzyWuzzy (fuzz.ratio, process.extract)

### lib_analytics.py — Traffic Analysis
- analyze_traffic() → 10-week trends, daily breakdowns
- extract_pages_stats() → per-URL charts
- extract_device_stats() → platform breakdown
- extract_searches_stats() → search term analytics

### lib_communication.py — Frontend Message Formatting
- prepare_our_message_to_javascript() → GeoJSON for Leaflet
- correct_coordinates_for_leaflet() → XY/lat-lon inversion

### lib_database.py — SQLite Query Layer
- fetch_usage_data_from_db() → pandas DataFrame
- fetch_feedbacks_from_db() → structured dicts

## RUNTIME PARAMETERS (app/site_parameters.py)
- walk_speed: 5 km/h (1.39 m/s)
- boat_speed: 5 km/h
- min_dist_to_go_by_boat: 40m
- min_dist_to_suggest_boat: 60m
- current_tide: 80%
- safety_diff_tide: 5%
- height_low_boots: 40cm
- height_high_boots: 75cm

## DEPENDENCIES (key)
GIS: GDAL, GeoPandas, Shapely, PyProj
Web: Flask, Flask-WTF, Flask-SQLAlchemy, Flask-Migrate, Flask-Mail, Flask-Security, Flask-Admin, Flask-RESTful, Flask-JWT-Extended
Data: NetworkX, Pandas, NumPy, Matplotlib
Search: FuzzyWuzzy
