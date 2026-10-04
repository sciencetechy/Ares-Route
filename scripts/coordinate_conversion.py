import rasterio
from pyproj import Transformer

PATH = "data/DTEEC_048842_1985_048908_1985_U01.IMG"

START_ROW = 6887
START_COL = 2977
SIZE = 1000
BLOCK_SIZE = 2

GRID_SIZE = SIZE // BLOCK_SIZE


with rasterio.open(PATH) as src:

    # Geographic Mars CRS (longitude / latitude)
    mars_geographic = src.crs.geodetic_crs

    # lon/lat -> projected DTM coordinates
    to_projected = Transformer.from_crs(
        mars_geographic,
        src.crs,
        always_xy=True
    )

    # projected DTM coordinates -> lon/lat
    to_lonlat = Transformer.from_crs(
        src.crs,
        mars_geographic,
        always_xy=True
    )


    def lonlat_to_grid(lon, lat):

        # lon/lat -> projected x/y in meters
        x, y = to_projected.transform(lon, lat)

        # projected x/y -> raw DTM pixel
        raw_row, raw_col = src.index(x, y)

        # Convert from full DTM coordinates
        # into our 1000 x 1000 crop
        local_row = raw_row - START_ROW
        local_col = raw_col - START_COL

        # Make sure point is inside our crop
        if (
            local_row < 0 or local_row >= SIZE or
            local_col < 0 or local_col >= SIZE
        ):
            return None

        # Raw pixels -> 2 m routing cells
        grid_row = local_row // BLOCK_SIZE
        grid_col = local_col // BLOCK_SIZE

        return grid_row, grid_col


    def grid_to_lonlat(grid_row, grid_col):

        # Start of this routing cell in the full DTM
        raw_row = START_ROW + grid_row * BLOCK_SIZE
        raw_col = START_COL + grid_col * BLOCK_SIZE

        # Use CENTER of the 2 x 2 routing cell
        center_row = raw_row + BLOCK_SIZE / 2
        center_col = raw_col + BLOCK_SIZE / 2

        # Pixel position -> projected x/y
        x, y = src.transform * (center_col, center_row)

        # projected x/y -> Mars lon/lat
        lon, lat = to_lonlat.transform(x, y)

        return lon, lat


corners = [
    (0, 0),
    (0, 499),
    (499, 499),
    (499, 0)
]

for row, col in corners:
    lon, lat = grid_to_lonlat(row, col)
    print(row, col, "->", lon, lat)