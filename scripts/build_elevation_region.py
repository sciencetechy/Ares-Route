# create elevation grid
# routing nodes are ~2m x 2m
# region is ~6km x 14km

import rasterio
import numpy as np
from rasterio.windows import Window

PATH = "data/DTEEC_048842_1985_048908_1985_U01.IMG"

# Clean ~6 km x 14 km crop
START_ROW = 454
START_COL = 506

HEIGHT = 13866
WIDTH = 5942

BLOCK_SIZE = 2

with rasterio.open(PATH) as src:
    window = Window(
        col_off=START_COL,
        row_off=START_ROW,
        width=WIDTH,
        height=HEIGHT
    )

    # Read the selected region of the DTM
    data = src.read(1, window=window)

    # Replace missing terrain values with NaN
    if src.nodata is not None:
        data = np.where(data == src.nodata, np.nan, data)

    grid_rows = HEIGHT // BLOCK_SIZE
    grid_cols = WIDTH // BLOCK_SIZE

    # Combine every 2 x 2 group of raw pixels
    # into one routing node
    elevation_grid = data.reshape(
        grid_rows,
        BLOCK_SIZE,
        grid_cols,
        BLOCK_SIZE
    ).mean(axis=(1, 3))

    print("Routing grid shape:", elevation_grid.shape)
    print("Routing nodes:", elevation_grid.size)
    print("Min elevation:", np.nanmin(elevation_grid))
    print("Max elevation:", np.nanmax(elevation_grid))
    print("Average elevation:", np.nanmean(elevation_grid))
    print("NaN nodes:", np.isnan(elevation_grid).sum())

    # Save NumPy version for Python/debugging
    np.save(
        "data/elevation_grid.npy",
        elevation_grid
    )

    # Save float32 binary version for C++
    elevation_grid.astype(np.float32).tofile(
        "data/elevation_grid.bin"
    )

    print("Saved to data/elevation_grid.npy")
    print("Saved to data/elevation_grid.bin")