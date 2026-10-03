# just used this to check how the elevation and stuff looks like in the DTM

import rasterio
import numpy as np
from rasterio.windows import Window

PATH = "data/DTEEC_048842_1985_048908_1985_U01.IMG"

START_ROW = 6887
START_COL = 2977
SIZE = 1000

with rasterio.open(PATH) as src:
    window = Window(
        col_off=START_COL,
        row_off=START_ROW,
        width=SIZE,
        height=SIZE
    )

    data = src.read(1, window=window)

    nodata = src.nodata

    valid = data[data != nodata]

    print("Shape:", data.shape)
    print("Total pixels:", data.size)
    print("Valid pixels:", valid.size)

    print("Minimum elevation:", valid.min())
    print("Maximum elevation:", valid.max())
    print("Average elevation:", valid.mean())