# create elevation grid
# currently nodes are ~2m x 2m
# bounding box is ~1km x 1km

import rasterio
import numpy as np
from rasterio.windows import Window

PATH = "data/DTEEC_048842_1985_048908_1985_U01.IMG"

START_ROW = 6887
START_COL = 2977
SIZE = 1000

BLOCK_SIZE = 2

with rasterio.open(PATH) as src:
    window = Window(
        col_off=START_COL,
        row_off=START_ROW,
        width=SIZE,
        height=SIZE
    )

    # Read the 1000 x 1000 section of the DTM
    data = src.read(1, window=window)

    # Replace missing terrain values with NaN
    if src.nodata is not None:
        data = np.where(data == src.nodata, np.nan, data)

    grid_size = SIZE // BLOCK_SIZE

    # Combine every 2 x 2 group of raw pixels into one routing node
    # Each node stores the average elevation of those pixels
    elevation_grid = data.reshape(
        grid_size,
        BLOCK_SIZE,
        grid_size,
        BLOCK_SIZE
    ).mean(axis=(1, 3))

    print("Routing grid shape:", elevation_grid.shape)
    print("Routing nodes:", elevation_grid.size)
    print("Min elevation:", np.nanmin(elevation_grid))
    print("Max elevation:", np.nanmax(elevation_grid))
    print("Average elevation:", np.nanmean(elevation_grid))

    # Save NumPy version for easy Python analysis/debugging
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