import rasterio
from rasterio.windows import Window
from rasterio.enums import Resampling
from PIL import Image

DTM_PATH = "data/DTEEC_048842_1985_048908_1985_U01.IMG"
ORTHO_PATH = "data/ESP_048842_1985_RED_A_01_ORTHO.JP2"

START_ROW = 454
START_COL = 506

HEIGHT = 13866
WIDTH = 5942

OUTPUT_PATH = "Frontend/public/hirise_region.png"

# Target output resolution
# Roughly 1 meter per pixel
OUTPUT_WIDTH = 6000
OUTPUT_HEIGHT = 14000


# --------------------------------------------------
# Get exact projected bounds of the DTM crop
# --------------------------------------------------

with rasterio.open(DTM_PATH) as dtm:
    left, top = dtm.transform * (
        START_COL,
        START_ROW
    )

    right, bottom = dtm.transform * (
        START_COL + WIDTH,
        START_ROW + HEIGHT
    )

    print("DTM crop bounds:")
    print("left:", left)
    print("right:", right)
    print("top:", top)
    print("bottom:", bottom)


# --------------------------------------------------
# Find matching orthoimage region
# and downsample while reading
# --------------------------------------------------

with rasterio.open(ORTHO_PATH) as ortho:
    top_row, left_col = ortho.index(
        left,
        top
    )

    bottom_row, right_col = ortho.index(
        right,
        bottom
    )

    source_width = right_col - left_col
    source_height = bottom_row - top_row

    print("\nOriginal ortho region:")
    print("rows:", top_row, "to", bottom_row)
    print("cols:", left_col, "to", right_col)
    print("source width:", source_width)
    print("source height:", source_height)

    print("\nDownsampled output:")
    print("width:", OUTPUT_WIDTH)
    print("height:", OUTPUT_HEIGHT)

    window = Window(
        col_off=left_col,
        row_off=top_row,
        width=source_width,
        height=source_height
    )

    # Read directly into smaller array
    data = ortho.read(
        1,
        window=window,
        out_shape=(
            OUTPUT_HEIGHT,
            OUTPUT_WIDTH
        ),
        resampling=Resampling.bilinear
    )

    print("Extracted shape:", data.shape)

    image = Image.fromarray(data)

    image.save(
        OUTPUT_PATH,
        optimize=True
    )

    print("\nSaved to:", OUTPUT_PATH)