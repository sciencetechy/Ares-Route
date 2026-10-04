#include <iostream>
#include <fstream>
#include <vector>
#include <queue>
#include <cmath>
#include <limits>
#include <algorithm>

using namespace std;

const int ROWS = 6933;
const int COLS = 2971;
const double CELL_SIZE = 2.02;
const double PI = acos(-1.0);

struct State {
    int row;
    int col;
    double f;

    bool operator<(const State& other) const {
        return f > other.f;
    }
};

int getId(int row, int col) {
    return row * COLS + col;
}

double heuristic(int row, int col, int targetRow, int targetCol) {
    double dr = (targetRow - row) * CELL_SIZE;
    double dc = (targetCol - col) * CELL_SIZE;

    return sqrt(dr * dr + dc * dc);
}

double slopeMultiplier(double angleDegrees) {
    const double MAX_SLOPE = 25.0;
    const double K = 6.0;

    angleDegrees = abs(angleDegrees);

    if (angleDegrees > MAX_SLOPE) {
        return -1.0;
    }

    double normalized = angleDegrees / MAX_SLOPE;

    return 1.0 + K * normalized * normalized;
}

int main(int argc, char* argv[]) {

    // ---------------------------------
    // Load elevation grid
    // ---------------------------------

    vector<float> elevation(ROWS * COLS);

    ifstream file("data/elevation_grid.bin", ios::binary);

    if (!file) {
        cerr << "Could not open elevation_grid.bin\n";
        return 1;
    }

    file.read(
        reinterpret_cast<char*>(elevation.data()),
        elevation.size() * sizeof(float)
    );

    if (!file) {
        cerr << "Error reading elevation grid\n";
        return 1;
    }

    file.close();

    cout << "Loaded " << elevation.size() << " terrain nodes\n";

    // ---------------------------------
    // Start and destination
    // ---------------------------------

    if (argc != 5) {
        cerr << "Usage: ares_route <startRow> <startCol> <targetRow> <targetCol>\n";
        return 1;
    }

    int startRow = stoi(argv[1]);
    int startCol = stoi(argv[2]);
    int targetRow = stoi(argv[3]);
    int targetCol = stoi(argv[4]);

    if (
        startRow < 0 || startRow >= ROWS ||
        startCol < 0 || startCol >= COLS ||
        targetRow < 0 || targetRow >= ROWS ||
        targetCol < 0 || targetCol >= COLS
    ) {
        cerr << "Start or target is outside the routing grid.\n";
        return 1;
    }

    int startId = getId(startRow, startCol);
    int targetId = getId(targetRow, targetCol);

    // Missing elevation data cannot be used as start/end
    if (std::isnan(elevation[startId])) {
        cerr << "Start is outside valid terrain.\n";
        return 1;
    }

    if (std::isnan(elevation[targetId])) {
        cerr << "Target is outside valid terrain.\n";
        return 1;
    }

    // ---------------------------------
    // A* data
    // ---------------------------------

    const double INF = numeric_limits<double>::infinity();

    vector<double> gCost(ROWS * COLS, INF);
    vector<int> parent(ROWS * COLS, -1);

    priority_queue<State> openSet;

    gCost[startId] = 0.0;

    openSet.push({
        startRow,
        startCol,
        heuristic(startRow, startCol, targetRow, targetCol)
    });

    // 8-direction movement
    int dr[8] = {-1, 1, 0, 0, -1, -1, 1, 1};
    int dc[8] = {0, 0, -1, 1, -1, 1, -1, 1};

    // ---------------------------------
    // A*
    // ---------------------------------

    int expanded = 0;

    while (!openSet.empty()) {
        State current = openSet.top();
        openSet.pop();

        int row = current.row;
        int col = current.col;

        int currentId = getId(row, col);

        // Missing terrain = blocked
        if (std::isnan(elevation[currentId])) {
            continue;
        }

        double expectedF =
            gCost[currentId] +
            heuristic(row, col, targetRow, targetCol);

        // Ignore stale priority queue entries
        if (current.f > expectedF + 1e-9) {
            continue;
        }

        expanded++;

        // Target popped with current best valid gCost
        if (currentId == targetId) {
            break;
        }

        for (int i = 0; i < 8; i++) {
            int nextRow = row + dr[i];
            int nextCol = col + dc[i];

            if (
                nextRow < 0 || nextRow >= ROWS ||
                nextCol < 0 || nextCol >= COLS
            ) {
                continue;
            }

            int nextId = getId(nextRow, nextCol);

            // Missing elevation = blocked terrain
            if (std::isnan(elevation[nextId])) {
                continue;
            }

            bool diagonal =
                dr[i] != 0 &&
                dc[i] != 0;

            double distance;

            if (diagonal) {
                distance = CELL_SIZE * sqrt(2.0);
            } else {
                distance = CELL_SIZE;
            }

            // ---------------------------------
            // Slope cost
            // ---------------------------------

            double deltaHeight =
                elevation[nextId] -
                elevation[currentId];

            double slopeAngle =
                atan(deltaHeight / distance) *
                180.0 / PI;

            double multiplier =
                slopeMultiplier(slopeAngle);

            // Too steep
            if (multiplier < 0) {
                continue;
            }

            double moveCost =
                distance * multiplier;

            double newG =
                gCost[currentId] +
                moveCost;

            if (newG < gCost[nextId]) {
                gCost[nextId] = newG;
                parent[nextId] = currentId;

                double f =
                    newG +
                    heuristic(
                        nextRow,
                        nextCol,
                        targetRow,
                        targetCol
                    );

                openSet.push({
                    nextRow,
                    nextCol,
                    f
                });
            }
        }
    }

    cout << "Expanded nodes: " << expanded << "\n";

    // ---------------------------------
    // Reconstruct path
    // ---------------------------------

    if (
        targetId != startId &&
        parent[targetId] == -1
    ) {
        cout << "No path found\n";
        return 0;
    }

    vector<int> path;

    int current = targetId;

    while (current != -1) {
        path.push_back(current);

        if (current == startId) {
            break;
        }

        current = parent[current];
    }

    reverse(path.begin(), path.end());

    // ---------------------------------
    // Calculate actual geometric distance
    // ---------------------------------

    double actualDistance = 0.0;

    for (size_t i = 1; i < path.size(); i++) {
        int prev = path[i - 1];
        int curr = path[i];

        int prevRow = prev / COLS;
        int prevCol = prev % COLS;

        int currRow = curr / COLS;
        int currCol = curr % COLS;

        bool diagonal =
            prevRow != currRow &&
            prevCol != currCol;

        if (diagonal) {
            actualDistance +=
                CELL_SIZE * sqrt(2.0);
        } else {
            actualDistance += CELL_SIZE;
        }
    }

    // ---------------------------------
    // Output
    // ---------------------------------

    cout << "Path found\n";
    cout << "Nodes in path: " << path.size() << "\n";
    cout << "Actual distance: "
         << actualDistance
         << " meters\n";
    cout << "Terrain-weighted cost: "
         << gCost[targetId]
         << "\n";

    cout << "PATH_BEGIN\n";

    for (int nodeId : path) {
        int row = nodeId / COLS;
        int col = nodeId % COLS;

        cout << row << " " << col << "\n";
    }

    cout << "PATH_END\n";

    return 0;
}