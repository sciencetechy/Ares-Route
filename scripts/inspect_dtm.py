# to check width and height

import rasterio

path = "data/DTEEC_048842_1985_048908_1985_U01.IMG"

with rasterio.open(path) as src:
    print("Width:", src.width)
    print("Height:", src.height)
    print("Bands:", src.count)
    print("Data type:", src.dtypes)
    print("CRS:", src.crs)
    print("Transform:", src.transform)
    print("Bounds:", src.bounds)
    print("NoData:", src.nodata)