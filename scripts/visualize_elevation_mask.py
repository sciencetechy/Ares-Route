import numpy as np
import matplotlib.pyplot as plt

PATH = "data/elevation_grid.npy"

grid = np.load(PATH)

valid_mask = ~np.isnan(grid)

plt.figure(figsize=(8, 12))
plt.imshow(valid_mask, origin="upper")
plt.title("Valid Elevation Data")
plt.xlabel("Column")
plt.ylabel("Row")

plt.savefig("data/elevation_valid_mask.png", dpi=200, bbox_inches="tight")
plt.show()