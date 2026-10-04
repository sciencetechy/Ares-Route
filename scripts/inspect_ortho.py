import rasterio

PATH = "data/ESP_048842_1985_RED_A_01_ORTHO.JP2"

with rasterio.open(PATH) as src:
    print("Width:", src.width)
    print("Height:", src.height)
    print("Bands:", src.count)
    print("Data type:", src.dtypes)
    print("CRS:", src.crs)
    print("Transform:", src.transform)
    print("Bounds:", src.bounds)
    print("NoData:", src.nodata)