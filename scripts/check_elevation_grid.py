import numpy as np

PATH = "data/elevation_grid.npy"

grid = np.load(PATH)

valid = ~np.isnan(grid)

rows, cols = np.where(valid)

print("Grid shape:", grid.shape)
print("Total nodes:", grid.size)
print("Valid nodes:", valid.sum())
print("NaN nodes:", np.isnan(grid).sum())

print()
print("Valid-data bounding box:")
print("Min row:", rows.min())
print("Max row:", rows.max())
print("Min col:", cols.min())
print("Max col:", cols.max())

print()
print("Rows with no valid data:", np.sum(valid.sum(axis=1) == 0))
print("Cols with no valid data:", np.sum(valid.sum(axis=0) == 0))