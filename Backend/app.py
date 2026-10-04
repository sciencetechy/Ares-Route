from flask import Flask, request, jsonify
from flask_cors import CORS

import subprocess
import rasterio

from pathlib import Path
from pyproj import Transformer


app = Flask(__name__)
CORS(app)


# ---------------------------------
# Paths
# ---------------------------------

ROOT = Path(__file__).resolve().parent.parent

DTM_PATH = ROOT / "data" / "DTEEC_048842_1985_048908_1985_U01.IMG"
CPP_PATH = ROOT / "Backend" / "ares_route.exe"


# ---------------------------------
# Routing-grid information
# ---------------------------------

START_ROW = 454
START_COL = 506

HEIGHT = 13866
WIDTH = 5942

BLOCK_SIZE = 2

GRID_ROWS = HEIGHT // BLOCK_SIZE   # 6933
GRID_COLS = WIDTH // BLOCK_SIZE    # 2971


# ---------------------------------
# Open Mars DTM
# ---------------------------------

src = rasterio.open(DTM_PATH)

mars_geographic = src.crs.geodetic_crs

to_projected = Transformer.from_crs(
    mars_geographic,
    src.crs,
    always_xy=True
)

to_lonlat = Transformer.from_crs(
    src.crs,
    mars_geographic,
    always_xy=True
)


# ---------------------------------
# lon/lat -> A* grid cell
# ---------------------------------

def lonlat_to_grid(lon, lat):
    x, y = to_projected.transform(lon, lat)

    raw_row, raw_col = src.index(x, y)

    local_row = raw_row - START_ROW
    local_col = raw_col - START_COL

    # Make sure point is inside the 6 km x 14 km routing region
    if (
        local_row < 0 or local_row >= HEIGHT or
        local_col < 0 or local_col >= WIDTH
    ):
        return None

    grid_row = local_row // BLOCK_SIZE
    grid_col = local_col // BLOCK_SIZE

    return grid_row, grid_col


# ---------------------------------
# A* grid cell -> lon/lat
# ---------------------------------

def grid_to_lonlat(grid_row, grid_col):

    if (
        grid_row < 0 or grid_row >= GRID_ROWS or
        grid_col < 0 or grid_col >= GRID_COLS
    ):
        return None

    raw_row = START_ROW + grid_row * BLOCK_SIZE
    raw_col = START_COL + grid_col * BLOCK_SIZE

    # Center of the ~2m x ~2m routing cell
    center_row = raw_row + BLOCK_SIZE / 2
    center_col = raw_col + BLOCK_SIZE / 2

    x, y = src.transform * (
        center_col,
        center_row
    )

    lon, lat = to_lonlat.transform(x, y)

    return lon, lat


# ---------------------------------
# Route endpoint
# ---------------------------------

@app.route("/route", methods=["POST"])
def route():
    data = request.get_json()

    start = data["start"]
    end = data["end"]

    start_grid = lonlat_to_grid(
        start["longitude"],
        start["latitude"]
    )

    end_grid = lonlat_to_grid(
        end["longitude"],
        end["latitude"]
    )

    if start_grid is None or end_grid is None:
        return jsonify({
            "error": "Start or destination is outside the routing region"
        }), 400

    start_row, start_col = start_grid
    target_row, target_col = end_grid

    print("Start grid:", start_grid)
    print("Target grid:", end_grid)

    # ---------------------------------
    # Run C++ A*
    # ---------------------------------

    result = subprocess.run(
        [
            str(CPP_PATH),
            str(start_row),
            str(start_col),
            str(target_row),
            str(target_col)
        ],
        cwd=ROOT,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print("A* stdout:")
        print(result.stdout)

        print("A* stderr:")
        print(result.stderr)

        return jsonify({
            "error": "A* failed",
            "details": result.stderr.strip()
        }), 500

    # ---------------------------------
    # Read path from C++ output
    # ---------------------------------

    lines = result.stdout.splitlines()

    path_started = False
    grid_path = []

    for line in lines:
        if line == "PATH_BEGIN":
            path_started = True
            continue

        if line == "PATH_END":
            break

        if path_started:
            row, col = map(int, line.split())
            grid_path.append((row, col))

    if not grid_path:
        return jsonify({
            "error": "No path found"
        }), 404

    # ---------------------------------
    # Convert path back to lon/lat
    # ---------------------------------

    route_points = []

    for row, col in grid_path:
        result_point = grid_to_lonlat(row, col)

        if result_point is None:
            continue

        lon, lat = result_point

        route_points.append({
            "longitude": lon,
            "latitude": lat
        })

    return jsonify({
        "startGrid": {
            "row": start_row,
            "col": start_col
        },

        "endGrid": {
            "row": target_row,
            "col": target_col
        },

        "nodes": len(route_points),

        "path": route_points
    })


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )