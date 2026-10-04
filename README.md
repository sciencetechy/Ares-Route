# Ares-Route

Ares-Route is a Mars rover route planner that uses real HiRISE elevation data and A* pathfinding to generate safer routes across the Martian surface.

## Demo
Check Ares-Route Devpost for images and Video Demo: https://devpost.com/software/blah-blah-6vgrdz

## What it does

Ares-Route allows users to select two points on Mars and calculates a route between them using real elevation data from Jezero Crater.

Instead of only minimizing distance, the routing algorithm can assign higher costs to steeper terrain, allowing it to prefer safer paths over shorter but more difficult ones.

## How it works

The terrain data is converted into a grid of nodes.

Each node represents a location on Mars and stores its elevation. Neighboring nodes are connected with movement costs based on distance and terrain.

A* evaluates each node using:

$$
f(n) = g(n) + h(n)
$$

where:

- g(n) is the cost travelled so far
- h(n) is the estimated distance to the destination

For terrain-aware routing, the movement cost between nodes can be modeled as:

$$
cost(u,v) = d(1 + λP(θ))
$$

where θ is the slope angle and P(θ) is the slope penalty.

## Tech Stack

- React
- Vite
- Cesium
- JavaScript
- C++
- Python
- A*
- HiRISE Digital Terrain Model

## Project Structure

```text
Ares-Route/
├── Frontend/
│   └── React + Cesium interface
├── Backend/
│   └── C++ A* pathfinding
├── scripts/
│   └── Python terrain processing scripts
└── README.md
```

## Running the Project

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

### Backend

Compile and run the C++ routing program using your preferred C++ compiler.

### Terrain Processing

Python scripts inside the `scripts` folder are used to process the HiRISE elevation data and prepare it for the routing algorithm.

## Data Source

Terrain data comes from the [HiRISE Digital Terrain Model of Jezero Crater](https://www.uahirise.org/dtm/dtm.php?ID=ESP_048842_1985).

## Future Improvements

- Add terrain roughness penalties
- Support additional Mars landing sites
- Allow users to load different terrain datasets
- Add different routing objectives such as shortest, safest, or lowest-energy paths
