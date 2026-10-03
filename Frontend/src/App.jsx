import { useEffect, useRef } from "react";
import {
  Viewer,
  Ion,
  Ellipsoid,
  Cesium3DTileset,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartographic,
  Cartesian2,
  Color,
  Math as CesiumMath,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

function App() {
  const cesiumContainer = useRef(null);

  useEffect(() => {
    Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;

    Ellipsoid.default = Ellipsoid.MARS;

    const viewer = new Viewer(cesiumContainer.current, {
      globe: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      geocoder: false,
      animation: false,
      timeline: false,
    });

    let startPoint = null;
    let endPoint = null;

    let startMarker = null;
    let endMarker = null;

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

    const handler = new ScreenSpaceEventHandler(
      viewer.scene.canvas
    );

    handler.setInputAction((click) => {
      const cartesian =
        viewer.scene.pickPosition(click.position);

      if (!cartesian) {
        console.log("Could not determine clicked position.");
        return;
      }

      const cartographic =
        Cartographic.fromCartesian(
          cartesian,
          Ellipsoid.MARS
        );

      if (!cartographic) {
        return;
      }

      const longitude =
        CesiumMath.toDegrees(cartographic.longitude);

      const latitude =
        CesiumMath.toDegrees(cartographic.latitude);

      console.log(
        "Clicked Mars coordinate:",
        longitude,
        latitude
      );

      // First click = start
      if (startPoint === null) {
        startPoint = {
          longitude,
          latitude,
        };

        startMarker = viewer.entities.add({
          position: cartesian,

          point: {
            pixelSize: 12,
            color: Color.LIME,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
          },

          label: {
            text: "START",
            font: "14px sans-serif",
            pixelOffset: new Cartesian2(0, -20),
          },
        });

        console.log("START:", startPoint);

        return;
      }

      // Second click = destination
      if (endPoint === null) {
        endPoint = {
          longitude,
          latitude,
        };

        endMarker = viewer.entities.add({
          position: cartesian,

          point: {
            pixelSize: 12,
            color: Color.RED,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
          },

          label: {
            text: "DESTINATION",
            font: "14px sans-serif",
            pixelOffset: new Cartesian2(0, -20),
          },
        });

        console.log("DESTINATION:", endPoint);

        console.log(
          "ROUTE REQUEST:",
          startPoint,
          "->",
          endPoint
        );

        return;
      }

      // Third click resets and becomes new start
      if (startMarker) {
        viewer.entities.remove(startMarker);
      }

      if (endMarker) {
        viewer.entities.remove(endMarker);
      }

      startPoint = {
        longitude,
        latitude,
      };

      endPoint = null;

      startMarker = viewer.entities.add({
        position: cartesian,

        point: {
          pixelSize: 12,
          color: Color.LIME,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
        },

        label: {
          text: "START",
          font: "14px sans-serif",
          pixelOffset: new Cartesian2(0, -20),
        },
      });

      endMarker = null;

      console.log("New START:", startPoint);
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
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