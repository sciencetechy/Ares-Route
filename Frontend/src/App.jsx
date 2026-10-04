import { useEffect, useRef, useState } from "react";

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
  const resetRouteRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [routeStats, setRouteStats] = useState(null);


  // --------------------------------
  // Routing region: ~6 km x 14 km
  // --------------------------------

  const MIN_LON = 77.47039202883163;
  const MAX_LON = 77.5751826933907;

  const MIN_LAT = 18.344627121160055;
  const MAX_LAT = 18.580875304369517;

  const ROUTING_CENTER_LON =
    (MIN_LON + MAX_LON) / 2;

  const ROUTING_CENTER_LAT =
    (MIN_LAT + MAX_LAT) / 2;

  const ROUTING_CAMERA_HEIGHT = 18000;


  function zoomToRoutingArea() {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        ROUTING_CENTER_LON,
        ROUTING_CENTER_LAT,
        ROUTING_CAMERA_HEIGHT,
        Ellipsoid.MARS
      ),
      duration: 1.5,
    });
  }


  function resetRoute() {
    if (resetRouteRef.current) {
      resetRouteRef.current();
    }

    setLoading(false);
    setErrorMessage("");
    setRouteStats(null);
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
    let routeEntity = null;


    function clearRoute() {
      if (startMarker) {
        viewer.entities.remove(startMarker);
        startMarker = null;
      }

      if (endMarker) {
        viewer.entities.remove(endMarker);
        endMarker = null;
      }

      if (routeEntity) {
        viewer.entities.remove(routeEntity);
        routeEntity = null;
      }

      startPoint = null;
      endPoint = null;
    }


    resetRouteRef.current = clearRoute;


    async function loadMars() {
      try {
        const marsTileset =
          await Cesium3DTileset.fromIonAssetId(
            3644333
          );

        viewer.scene.primitives.add(marsTileset);


        // --------------------------------
        // HiRISE image overlay
        // --------------------------------

        viewer.entities.add({
          rectangle: {
            coordinates:
              Rectangle.fromDegrees(
                MIN_LON,
                MIN_LAT,
                MAX_LON,
                MAX_LAT
              ),

            material:
              new ImageMaterialProperty({
                image: "/hirise_region.png",
                transparent: true,
              }),

            // Approximate flat height for now
            height: -2590,
          },
        });


        // --------------------------------
        // Start zoomed into routing area
        // --------------------------------

        viewer.camera.flyTo({
          destination:
            Cartesian3.fromDegrees(
              ROUTING_CENTER_LON,
              ROUTING_CENTER_LAT,
              ROUTING_CAMERA_HEIGHT,
              Ellipsoid.MARS
            ),

          duration: 1.5,
        });

      } catch (error) {
        console.error(
          "Failed to load Mars:",
          error
        );

        setErrorMessage(
          "Failed to load Mars terrain."
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

        if (loading) {
          return;
        }

        const cartesian =
          viewer.scene.pickPosition(
            click.position
          );

        if (!cartesian) {
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


        const insideRoutingArea =
          longitude >= MIN_LON &&
          longitude <= MAX_LON &&
          latitude >= MIN_LAT &&
          latitude <= MAX_LAT;


        if (!insideRoutingArea) {
          setErrorMessage(
            "Choose a point inside the routing area."
          );

          return;
        }


        setErrorMessage("");


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

              position:
                raiseAboveSurface(
                  cartesian,
                  5
                ),

              point: {
                pixelSize: 14,
                color: Color.LIME,
                outlineColor: Color.WHITE,
                outlineWidth: 3,

                disableDepthTestDistance:
                  Number.POSITIVE_INFINITY,
              },

              label: {
                text: "START",
                font:
                  "bold 14px sans-serif",

                pixelOffset:
                  new Cartesian2(
                    0,
                    -24
                  ),

                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 3,
                style: 2,

                disableDepthTestDistance:
                  Number.POSITIVE_INFINITY,
              },
            });

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

              position:
                raiseAboveSurface(
                  cartesian,
                  5
                ),

              point: {
                pixelSize: 14,
                color: Color.RED,
                outlineColor: Color.WHITE,
                outlineWidth: 3,

                disableDepthTestDistance:
                  Number.POSITIVE_INFINITY,
              },

              label: {
                text: "DESTINATION",

                font:
                  "bold 14px sans-serif",

                pixelOffset:
                  new Cartesian2(
                    0,
                    -24
                  ),

                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 3,
                style: 2,

                disableDepthTestDistance:
                  Number.POSITIVE_INFINITY,
              },
            });


          setLoading(true);
          setRouteStats(null);
          setErrorMessage("");


          try {
            const response =
              await fetch(
                "/route",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body: JSON.stringify({
                    start: startPoint,
                    end: endPoint,
                  }),
                }
              );


            const data =
              await response.json();


            if (!response.ok) {
              setErrorMessage(
                data.error ||
                "Could not calculate route."
              );

              return;
            }


            const rawPositions =
              data.path.map(
                (point) =>
                  Cartesian3.fromDegrees(
                    point.longitude,
                    point.latitude,
                    0,
                    Ellipsoid.MARS
                  )
              );


            const clampedPositions =
              await viewer.scene
                .clampToHeightMostDetailed(
                  rawPositions
                );


            const visibleRoutePositions =
              clampedPositions.map(
                (position) =>
                  raiseAboveSurface(
                    position,
                    3
                  )
              );


            if (routeEntity) {
              viewer.entities.remove(
                routeEntity
              );
            }


            routeEntity =
              viewer.entities.add({
                polyline: {
                  positions:
                    visibleRoutePositions,

                  width: 7,

                  material:
                    new PolylineOutlineMaterialProperty(
                      {
                        color:
                          Color.fromCssColorString(
                            "#4285F4"
                          ),

                        outlineColor:
                          Color.WHITE,

                        outlineWidth: 2,
                      }
                    ),
                },
              });


            // Backend already provides nodes.
            // Other fields will be added next.
            setRouteStats({
              nodes: data.nodes,

              distance:
                data.distance ?? null,

              weightedCost:
                data.weightedCost ?? null,

              expanded:
                data.expanded ?? null,

              computationTime:
                data.computationTime ?? null,

              maxSlope:
                data.maxSlope ?? null,
            });

          } catch (error) {

            console.error(
              "Failed to get route:",
              error
            );

            setErrorMessage(
              "Failed to contact routing backend."
            );

          } finally {
            setLoading(false);
          }


          return;
        }


        // --------------------------------
        // Third click starts a new route
        // --------------------------------

        clearRoute();

        setRouteStats(null);
        setErrorMessage("");


        startPoint = {
          longitude,
          latitude,
        };


        startMarker =
          viewer.entities.add({

            position:
              raiseAboveSurface(
                cartesian,
                5
              ),

            point: {
              pixelSize: 14,
              color: Color.LIME,
              outlineColor: Color.WHITE,
              outlineWidth: 3,

              disableDepthTestDistance:
                Number.POSITIVE_INFINITY,
            },

            label: {
              text: "START",

              font:
                "bold 14px sans-serif",

              pixelOffset:
                new Cartesian2(
                  0,
                  -24
                ),

              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 3,
              style: 2,

              disableDepthTestDistance:
                Number.POSITIVE_INFINITY,
            },
          });
      },

      ScreenSpaceEventType.LEFT_CLICK
    );


    return () => {
      handler.destroy();

      resetRouteRef.current = null;
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

          width: "290px",
          padding: "16px",

          background: "white",

          borderRadius: "12px",

          boxShadow:
            "0 2px 12px rgba(0,0,0,0.25)",

          fontFamily:
            "Arial, sans-serif",
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
          Click inside the routing area
          to choose a start point and
          destination.
        </div>


        {loading && (
          <div
            style={{
              padding: "10px",
              marginBottom: "12px",

              background: "#f1f3f4",
              borderRadius: "6px",

              fontSize: "14px",
              color: "#202124",

              fontWeight: "600",
            }}
          >
            Calculating route...
          </div>
        )}


        {errorMessage && (
          <div
            style={{
              padding: "10px",
              marginBottom: "12px",

              background: "#fce8e6",
              borderRadius: "6px",

              fontSize: "13px",
              color: "#c5221f",
            }}
          >
            {errorMessage}
          </div>
        )}


        {routeStats && (
          <div
            style={{
              padding: "10px",

              marginBottom: "12px",

              border:
                "1px solid #dadce0",

              borderRadius: "8px",

              fontSize: "13px",

              color: "#202124",

              lineHeight: "1.6",
            }}
          >

            <div>
              <strong>Route nodes:</strong>{" "}
              {routeStats.nodes}
            </div>


            {routeStats.distance !== null && (
              <div>
                <strong>Distance:</strong>{" "}
                {(
                  routeStats.distance / 1000
                ).toFixed(2)}{" "}
                km
              </div>
            )}

            {routeStats.maxSlope !== null && (
              <div>
                <strong>Max slope:</strong>{" "}
                {routeStats.maxSlope.toFixed(1)}°
              </div>
            )}

            {routeStats.weightedCost !== null && (
              <div>
                <strong>
                  Terrain cost:
                </strong>{" "}
                {routeStats.weightedCost.toFixed(
                  1
                )}
              </div>
            )}


            {routeStats.expanded !== null && (
              <div>
                <strong>
                  Expanded nodes:
                </strong>{" "}
                {routeStats.expanded.toLocaleString()}
              </div>
            )}


            {routeStats.computationTime !== null && (
              <div>
                <strong>
                  Compute time:
                </strong>{" "}
                {routeStats.computationTime.toFixed(
                  2
                )}{" "}
                s
              </div>
            )}

          </div>
        )}


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

            marginBottom: "8px",
          }}
        >
          Back to Routing Area
        </button>


        <button
          onClick={resetRoute}

          style={{
            width: "100%",
            padding: "10px",

            border:
              "1px solid #dadce0",

            borderRadius: "6px",

            background: "white",
            color: "#202124",

            fontSize: "14px",
            fontWeight: "600",

            cursor: "pointer",
          }}
        >
          Reset Route
        </button>

      </div>
    </div>
  );
}


export default App;