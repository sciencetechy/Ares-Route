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
  Cartesian3,
  Color,
  Math as CesiumMath,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

function App() {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);

  const ROUTING_CENTER_LON = 77.52278736;
  const ROUTING_CENTER_LAT = 18.46275121;

  const MIN_LON = 77.51398423962716;
  const MAX_LON = 77.53159048259516;

  const MIN_LAT = 18.45424805037143;
  const MAX_LAT = 18.47125437515814;

  function zoomToRoutingArea() {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        ROUTING_CENTER_LON,
        ROUTING_CENTER_LAT,
        2500
      ),
      duration: 1.5,
    });
  }

  useEffect(() => {
    Ion.defaultAccessToken =
      import.meta.env.VITE_CESIUM_TOKEN;

    Ellipsoid.default = Ellipsoid.MARS;

    const viewer = new Viewer(
      cesiumContainer.current,
      {
        globe: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        geocoder: false,
        animation: false,
        timeline: false,
      }
    );

    viewerRef.current = viewer;

    let startPoint = null;
    let endPoint = null;

    let startMarker = null;
    let endMarker = null;

    async function loadMars() {
      try {
        const marsTileset =
          await Cesium3DTileset.fromIonAssetId(
            3644333
          );

        viewer.scene.primitives.add(
          marsTileset
        );

        // Draw routing area
        viewer.entities.add({
          polygon: {
            hierarchy:
              Cartesian3.fromDegreesArray([
                MIN_LON,
                MAX_LAT,

                MAX_LON,
                MAX_LAT,

                MAX_LON,
                MIN_LAT,

                MIN_LON,
                MIN_LAT,
              ]),

            material:
              Color.YELLOW.withAlpha(0.15),

            outline: true,
            outlineColor: Color.YELLOW,
          },
        });

        // Start zoomed into routing region
        viewer.camera.flyTo({
          destination:
            Cartesian3.fromDegrees(
              ROUTING_CENTER_LON,
              ROUTING_CENTER_LAT,
              2500
            ),

          duration: 1.5,
        });

      } catch (error) {
        console.error(
          "Failed to load Mars:",
          error
        );
      }
    }

    loadMars();

    const handler =
      new ScreenSpaceEventHandler(
        viewer.scene.canvas
      );

    handler.setInputAction(
      async (click) => {
        const cartesian =
          viewer.scene.pickPosition(
            click.position
          );

        if (!cartesian) {
          console.log(
            "Could not determine clicked position."
          );
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
          CesiumMath.toDegrees(
            cartographic.longitude
          );

        const latitude =
          CesiumMath.toDegrees(
            cartographic.latitude
          );

        console.log(
          "Clicked Mars coordinate:",
          longitude,
          latitude
        );

        // --------------------------------
        // Check if click is inside
        // routing region
        // --------------------------------

        const insideRoutingArea =
          longitude >= MIN_LON &&
          longitude <= MAX_LON &&
          latitude >= MIN_LAT &&
          latitude <= MAX_LAT;

        if (!insideRoutingArea) {
          console.log(
            "Click outside routing area:",
            longitude,
            latitude
          );

          return;
        }

        // --------------------------------
        // First click = start
        // --------------------------------

        if (startPoint === null) {
          startPoint = {
            longitude,
            latitude,
          };

          startMarker =
            viewer.entities.add({
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
                pixelOffset:
                  new Cartesian2(
                    0,
                    -20
                  ),
              },
            });

          console.log(
            "START:",
            startPoint
          );

          return;
        }

        // --------------------------------
        // Second click = destination
        // --------------------------------

        if (endPoint === null) {
          endPoint = {
            longitude,
            latitude,
          };

          endMarker =
            viewer.entities.add({
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
                pixelOffset:
                  new Cartesian2(
                    0,
                    -20
                  ),
              },
            });

          console.log(
            "DESTINATION:",
            endPoint
          );

          console.log(
            "ROUTE REQUEST:",
            startPoint,
            "->",
            endPoint
          );

          try {
            const response = await fetch("http://127.0.0.1:5000/route", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                start: startPoint,
                end: endPoint,
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              console.error("Route error:", data);
              return;
            }

            console.log("Route received:", data);

            const positions = data.path.map((point) =>
              Cartesian3.fromDegrees(
                point.longitude,
                point.latitude,
                0
              )
            );

            viewer.entities.add({
              polyline: {
                positions,
                width: 4,
                material: Color.CYAN,
              },
            });
          } catch (error) {
            console.error("Failed to get route:", error);
          }

          return;
        }

        // --------------------------------
        // Third valid click resets
        // --------------------------------

        if (startMarker) {
          viewer.entities.remove(
            startMarker
          );
        }

        if (endMarker) {
          viewer.entities.remove(
            endMarker
          );
        }

        startPoint = {
          longitude,
          latitude,
        };

        endPoint = null;

        startMarker =
          viewer.entities.add({
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
              pixelOffset:
                new Cartesian2(
                  0,
                  -20
                ),
            },
          });

        endMarker = null;

        console.log(
          "New START:",
          startPoint
        );
      },

      ScreenSpaceEventType.LEFT_CLICK
    );

    return () => {
      handler.destroy();

      viewerRef.current = null;

      viewer.destroy();
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
      }}
    >
      <div
        ref={cesiumContainer}
        style={{
          width: "100%",
          height: "100%",
        }}
      />

      <button
        onClick={zoomToRoutingArea}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",

          zIndex: 10,

          padding: "10px 16px",

          fontSize: "14px",
          fontWeight: "600",

          cursor: "pointer",

          border: "1px solid white",
          borderRadius: "6px",

          background: "rgba(20, 20, 20, 0.85)",
          color: "white",
        }}
      >
        Back to Routing Area
      </button>
    </div>
  );
}

export default App;