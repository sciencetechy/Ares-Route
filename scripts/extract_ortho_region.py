import rasterio
from rasterio.windows import Window
from PIL import Image
import numpy as np

DTM_PATH = "data/DTEEC_048842_1985_048908_1985_U01.IMG"
ORTHO_PATH = "data/ESP_048842_1985_RED_A_01_ORTHO.JP2"

START_ROW = 6887
START_COL = 2977
SIZE = 1000

OUTPUT_PATH = "Frontend/public/hirise_region.png"


# --------------------------------------------------
# Get exact projected bounds of the existing DTM crop
# --------------------------------------------------

with rasterio.open(DTM_PATH) as dtm:
    left, top = dtm.transform * (START_COL, START_ROW)

    right, bottom = dtm.transform * (
        START_COL + SIZE,
        START_ROW + SIZE
    )

    print("DTM crop bounds:")
    print("left:", left)
    print("right:", right)
    print("top:", top)
    print("bottom:", bottom)


# --------------------------------------------------
# Convert those projected coordinates into
# orthoimage pixel coordinates
# --------------------------------------------------

with rasterio.open(ORTHO_PATH) as ortho:
    top_row, left_col = ortho.index(left, top)
    bottom_row, right_col = ortho.index(right, bottom)

    print("\nOrtho crop:")
    print("rows:", top_row, "to", bottom_row)
    print("cols:", left_col, "to", right_col)

    width = right_col - left_col
    height = bottom_row - top_row

    print("width:", width)
    print("height:", height)

    window = Window(
        col_off=left_col,
        row_off=top_row,
        width=width,
        height=height
    )

    data = ortho.read(1, window=window)

    print("Extracted shape:", data.shape)

    # save as PNG
    image = Image.fromarray(data)
    image.save(OUTPUT_PATH)

    print("\nSaved to:", OUTPUT_PATH)