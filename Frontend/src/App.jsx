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
  PolylineOutlineMaterialProperty,
  Math as CesiumMath,
  Rectangle,
  ImageMaterialProperty,
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
        2500,
        Ellipsoid.MARS
      ),
      duration: 1.5,
    });
  }

  function raiseAboveSurface(cartesian, meters = 4) {
    const cartographic = Cartographic.fromCartesian(
      cartesian,
      Ellipsoid.MARS
    );

    return Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height + meters,
      Ellipsoid.MARS
    );
  }

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

    viewerRef.current = viewer;

    let startPoint = null;
    let endPoint = null;

    let startMarker = null;
    let endMarker = null;
    let routeEntity = null;

    async function loadMars() {
      try {
        const marsTileset = await Cesium3DTileset.fromIonAssetId(3644333);

        viewer.scene.primitives.add(marsTileset);
        viewer.entities.add({
          rectangle: {
            coordinates: Rectangle.fromDegrees(
              MIN_LON,
              MIN_LAT,
              MAX_LON,
              MAX_LAT
            ),

            material: new ImageMaterialProperty({
              image: "/hirise_region.png",
              transparent: false,
            }),

            // Slightly above the highest terrain in this crop
            height: -2570,
          },
        });

        // Draw routing area
        viewer.entities.add({
          polygon: {
            hierarchy: Cartesian3.fromDegreesArray(
              [
                MIN_LON, MAX_LAT,
                MAX_LON, MAX_LAT,
                MAX_LON, MIN_LAT,
                MIN_LON, MIN_LAT,
              ],
              Ellipsoid.MARS
            ),

            material: Color.YELLOW.withAlpha(0.03),
            outline: true,
            outlineColor: Color.YELLOW.withAlpha(0.7),
          },
        });

        // Start zoomed into routing area
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(
            ROUTING_CENTER_LON,
            ROUTING_CENTER_LAT,
            2500,
            Ellipsoid.MARS
          ),
          duration: 1.5,
        });
      } catch (error) {
        console.error("Failed to load Mars:", error);
      }
    }

    loadMars();

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(
      async (click) => {
        const cartesian = viewer.scene.pickPosition(click.position);

        if (!cartesian) {
          console.log("Could not determine clicked position.");
          return;
        }

        const cartographic = Cartographic.fromCartesian(
          cartesian,
          Ellipsoid.MARS
        );

        if (!cartographic) {
          return;
        }

        const longitude = CesiumMath.toDegrees(cartographic.longitude);
        const latitude = CesiumMath.toDegrees(cartographic.latitude);

        console.log(
          "Clicked Mars coordinate:",
          longitude,
          latitude
        );

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

          startMarker = viewer.entities.add({
            position: raiseAboveSurface(cartesian, 5),

            point: {
              pixelSize: 14,
              color: Color.LIME,
              outlineColor: Color.WHITE,
              outlineWidth: 3,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },

            label: {
              text: "START",
              font: "bold 14px sans-serif",
              pixelOffset: new Cartesian2(0, -24),
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 3,
              style: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });

          console.log("START:", startPoint);

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

          endMarker = viewer.entities.add({
            position: raiseAboveSurface(cartesian, 5),

            point: {
              pixelSize: 14,
              color: Color.RED,
              outlineColor: Color.WHITE,
              outlineWidth: 3,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },

            label: {
              text: "DESTINATION",
              font: "bold 14px sans-serif",
              pixelOffset: new Cartesian2(0, -24),
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 3,
              style: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });

          console.log("DESTINATION:", endPoint);

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

            const rawPositions = data.path.map((point) =>
              Cartesian3.fromDegrees(
                point.longitude,
                point.latitude,
                0,
                Ellipsoid.MARS
              )
            );

            const clampedPositions =
              await viewer.scene.clampToHeightMostDetailed(rawPositions);

            const visibleRoutePositions = clampedPositions.map((position) =>
              raiseAboveSurface(position, 3)
            );

            if (routeEntity) {
              viewer.entities.remove(routeEntity);
            }

            routeEntity = viewer.entities.add({
              polyline: {
                positions: visibleRoutePositions,
                width: 7,

                material: new PolylineOutlineMaterialProperty({
                  color: Color.fromCssColorString("#4285F4"),
                  outlineColor: Color.WHITE,
                  outlineWidth: 2,
                }),
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
          viewer.entities.remove(startMarker);
        }

        if (endMarker) {
          viewer.entities.remove(endMarker);
        }

        if (routeEntity) {
          viewer.entities.remove(routeEntity);
          routeEntity = null;
        }

        startPoint = {
          longitude,
          latitude,
        };

        endPoint = null;

        startMarker = viewer.entities.add({
          position: raiseAboveSurface(cartesian, 5),

          point: {
            pixelSize: 14,
            color: Color.LIME,
            outlineColor: Color.WHITE,
            outlineWidth: 3,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },

          label: {
            text: "START",
            font: "bold 14px sans-serif",
            pixelOffset: new Cartesian2(0, -24),
            fillColor: Color.WHITE,
            outlineColor: Color.BLACK,
            outlineWidth: 3,
            style: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });

        endMarker = null;

        console.log("New START:", startPoint);
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

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 10,

          width: "280px",
          padding: "16px",

          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",

          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "8px",
            color: "#202124",
          }}
        >
          Ares Route
        </div>

        <div
          style={{
            fontSize: "14px",
            color: "#5f6368",
            marginBottom: "12px",
            lineHeight: "1.4",
          }}
        >
          Click inside the routing area to choose a start point and destination.
        </div>

        <button
          onClick={zoomToRoutingArea}
          style={{
            width: "100%",
            padding: "10px",

            border: "none",
            borderRadius: "6px",

            background: "#4285F4",
            color: "white",

            fontSize: "14px",
            fontWeight: "600",

            cursor: "pointer",
          }}
        >
          Back to Routing Area
        </button>
      </div>
    </div>
  );
}

export default App;