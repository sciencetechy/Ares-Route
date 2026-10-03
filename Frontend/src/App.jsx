import { useEffect, useRef } from "react";
import {
  Viewer,
  Ion,
  Ellipsoid,
  Cesium3DTileset,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

function App() {
  const cesiumContainer = useRef(null);

  useEffect(() => {
    Ion.defaultAccessToken =
      import.meta.env.VITE_CESIUM_TOKEN;

    // Use Mars instead of Earth's WGS84 ellipsoid
    Ellipsoid.default = Ellipsoid.MARS;

    const viewer = new Viewer(cesiumContainer.current, {
      // Mars is loaded as a global 3D Tiles tileset
      globe: false,

      // Earth-specific controls/features off
      sceneModePicker: false,
      baseLayerPicker: false,
      geocoder: false,

      animation: false,
      timeline: false,
    });

    async function loadMars() {
      try {
        const marsTileset =
          await Cesium3DTileset.fromIonAssetId(3644333);

        viewer.scene.primitives.add(marsTileset);

        await viewer.zoomTo(marsTileset);
      } catch (error) {
        console.error("Failed to load Mars:", error);
      }
    }

    loadMars();

    return () => {
      viewer.destroy();
    };
  }, []);

  return (
    <div
      ref={cesiumContainer}
      style={{
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}

export default App;