import rasterio
from rasterio.windows import Window
from rasterio.enums import Resampling
from PIL import Image
import numpy as np

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

    # Read directly into the smaller output size
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

    # --------------------------------------------------
    # Convert grayscale image to RGBA
    # --------------------------------------------------

    gray = data.astype(np.uint8)

    rgba = np.zeros(
        (OUTPUT_HEIGHT, OUTPUT_WIDTH, 4),
        dtype=np.uint8
    )

    # Grayscale -> RGB
    rgba[:, :, 0] = gray
    rgba[:, :, 1] = gray
    rgba[:, :, 2] = gray

    # Missing HiRISE area is stored as black (value 0)
    # Make those pixels transparent
    rgba[:, :, 3] = np.where(
        gray == 0,
        0,
        255
    ).astype(np.uint8)

    # Save as RGBA PNG
    image = Image.fromarray(
        rgba,
        mode="RGBA"
    )

    image.save(
        OUTPUT_PATH,
        optimize=True
    )

    print("\nSaved to:", OUTPUT_PATH)