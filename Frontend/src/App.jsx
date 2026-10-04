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
  PolylineDashMaterialProperty,
  Math as CesiumMath,
  Rectangle,
  ImageMaterialProperty,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";


function App() {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  const resetRouteRef = useRef(null);
  const loadingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [routeStats, setRouteStats] = useState(null);

  // Landing page
  const [enteredSite, setEnteredSite] = useState(false);

  // Why not straight dropdown
  const [whyOpen, setWhyOpen] = useState(false);


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


  function setRoutingLoading(value) {
    loadingRef.current = value;
    setLoading(value);
  }


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

    setRoutingLoading(false);
    setErrorMessage("");
    setRouteStats(null);
    setWhyOpen(false);
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
    let straightLineEntity = null;


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

      if (straightLineEntity) {
        viewer.entities.remove(straightLineEntity);
        straightLineEntity = null;
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

            height: -2590,
          },
        });


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

        if (loadingRef.current) {
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
                pixelSize: 13,

                color:
                  Color.fromCssColorString(
                    "#61d095"
                  ),

                outlineColor:
                  Color.fromCssColorString(
                    "#101010"
                  ),

                outlineWidth: 3,

                disableDepthTestDistance:
                  Number.POSITIVE_INFINITY,
              },

              label: {
                text: "START",

                font:
                  "600 13px Arial, sans-serif",

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
                pixelSize: 13,

                color:
                  Color.fromCssColorString(
                    "#ff574d"
                  ),

                outlineColor:
                  Color.fromCssColorString(
                    "#101010"
                  ),

                outlineWidth: 3,

                disableDepthTestDistance:
                  Number.POSITIVE_INFINITY,
              },

              label: {
                text: "DESTINATION",

                font:
                  "600 13px Arial, sans-serif",

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


          setRoutingLoading(true);
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

                  width: 6,

                  material:
                    new PolylineOutlineMaterialProperty(
                      {
                        color:
                          Color.fromCssColorString(
                            "#ff5a4f"
                          ),

                        outlineColor:
                          Color.fromCssColorString(
                            "#1b0908"
                          ),

                        outlineWidth: 2,
                      }
                    ),
                },
              });


            // --------------------------------
            // Straight-line comparison
            // --------------------------------

            const STRAIGHT_SAMPLES = 100;

            const straightRawPositions = [];

            for (let i = 0; i <= STRAIGHT_SAMPLES; i++) {
              const t = i / STRAIGHT_SAMPLES;

              const lon =
                startPoint.longitude +
                (
                  endPoint.longitude -
                  startPoint.longitude
                ) * t;

              const lat =
                startPoint.latitude +
                (
                  endPoint.latitude -
                  startPoint.latitude
                ) * t;

              straightRawPositions.push(
                Cartesian3.fromDegrees(
                  lon,
                  lat,
                  0,
                  Ellipsoid.MARS
                )
              );
            }

            const straightClampedPositions =
              await viewer.scene.clampToHeightMostDetailed(
                straightRawPositions
              );

            const straightVisiblePositions =
              straightClampedPositions.map(
                (position) =>
                  raiseAboveSurface(
                    position,
                    5
                  )
              );

            if (straightLineEntity) {
              viewer.entities.remove(
                straightLineEntity
              );
            }

            straightLineEntity =
              viewer.entities.add({
                polyline: {
                  positions:
                    straightVisiblePositions,

                  width: 3,

                  material:
                    new PolylineDashMaterialProperty({
                      color:
                        Color.fromCssColorString(
                          "#f2e6e3"
                        ).withAlpha(0.65),

                      dashLength: 14,
                    }),
                },
              });


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

              straightDistance:
                data.straightDistance ?? null,

              straightMaxSlope:
                data.straightMaxSlope ?? null,

              straightCost:
                data.straightCost ?? null,

              straightSafe:
                data.straightSafe ?? null,
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
            setRoutingLoading(false);
          }


          return;
        }


        // --------------------------------
        // Third click = new route
        // --------------------------------

        clearRoute();

        setRouteStats(null);
        setErrorMessage("");
        setWhyOpen(false);


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
              pixelSize: 13,

              color:
                Color.fromCssColorString(
                  "#61d095"
                ),

              outlineColor:
                Color.fromCssColorString(
                  "#101010"
                ),

              outlineWidth: 3,

              disableDepthTestDistance:
                Number.POSITIVE_INFINITY,
            },

            label: {
              text: "START",

              font:
                "600 13px Arial, sans-serif",

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


  // --------------------------------
  // Shared UI styles
  // --------------------------------

  const glassPanel = {
    background:
      "rgba(17, 12, 12, 0.94)",

    border:
      "1px solid rgba(255, 91, 78, 0.16)",

    borderRadius: "18px",

    boxShadow:
      "0 16px 55px rgba(0,0,0,0.38)",

    backdropFilter: "blur(14px)",
  };


  const buttonBase = {
    height: "42px",

    padding: "0 14px",

    borderRadius: "11px",

    fontSize: "13px",
    fontWeight: "600",

    cursor: "pointer",

    fontFamily: "inherit",

    transition:
      "background 0.15s ease, border 0.15s ease, transform 0.15s ease",
  };


  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",

        position: "relative",

        overflow: "hidden",

        background: "#090707",

        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >

      {/* -------------------------------- */}
      {/* Cesium */}
      {/* -------------------------------- */}

      <div
        ref={cesiumContainer}

        style={{
          width: "100%",
          height: "100%",
        }}
      />


      {/* -------------------------------- */}
      {/* Landing page */}
      {/* -------------------------------- */}

      {!enteredSite && (
        <div
          style={{
            position: "absolute",
            inset: 0,

            zIndex: 100,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            backgroundImage:
              "linear-gradient(rgba(8, 6, 6, 0.20), rgba(8, 6, 6, 0.35)), url('/mars.png')",

            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",

            color: "#f4eeee",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",

              padding: "32px",

              textAlign: "center",
            }}
          >

            <div
              style={{
                color: "#ff5a4f",

                fontSize: "11px",

                fontWeight: "700",

                letterSpacing: "2.5px",

                textTransform: "uppercase",

                marginBottom: "22px",
              }}
            >
              Mars Route Planning
            </div>


            <h1
              style={{
                margin: 0,

                color: "#fffafa",

                fontSize:
                  "clamp(54px, 9vw, 92px)",

                lineHeight: "0.9",

                fontWeight: "750",

                letterSpacing: "-5px",
              }}
            >
              Ares Route
            </h1>


            <div
              style={{
                marginTop: "24px",

                color: "#aa9b99",

                fontSize: "16px",

                lineHeight: "1.6",
              }}
            >
              Autonomous route planning
              across Jezero Crater.
            </div>


            <div
              style={{
                marginTop: "10px",

                color: "#685c5a",

                fontSize: "12px",
              }}
            >
              built by Adhvik Chakraborty
            </div>


            <button
              onClick={() =>
                setEnteredSite(true)
              }

              style={{
                marginTop: "36px",

                padding:
                  "13px 22px",

                border: "none",

                borderRadius: "999px",

                background: "#ff5a4f",

                color: "#170706",

                fontSize: "14px",

                fontWeight: "700",

                cursor: "pointer",

                fontFamily: "inherit",
              }}
            >
              Enter Ares Route
            </button>


            <div
              style={{
                marginTop: "22px",

                color: "#413735",

                fontSize: "10px",

                letterSpacing:
                  "0.6px",

                textTransform:
                  "uppercase",
              }}
            >
              Jezero Crater · Mars
            </div>

          </div>
        </div>
      )}


      {/* -------------------------------- */}
      {/* Main site */}
      {/* -------------------------------- */}

      {enteredSite && (
        <div
          style={{
            position: "absolute",

            top: "22px",
            left: "22px",

            zIndex: 10,

            width: "320px",

            display: "flex",
            flexDirection: "column",

            gap: "10px",

            color: "#f4eeee",
          }}
        >

          {/* ----------------------------- */}
          {/* Main route panel */}
          {/* ----------------------------- */}

          <div
            style={{
              ...glassPanel,

              padding: "20px",
            }}
          >

            {/* Header */}

            <div
              style={{
                display: "flex",

                alignItems: "center",

                justifyContent:
                  "space-between",

                marginBottom: "4px",
              }}
            >

              <div
                style={{
                  fontSize: "19px",

                  fontWeight: "700",

                  letterSpacing:
                    "-0.4px",
                }}
              >
                Ares Route
              </div>


              <div
                style={{
                  display: "flex",

                  alignItems:
                    "center",

                  gap: "6px",

                  color: "#8f817f",

                  fontSize: "11px",
                }}
              >

                <span
                  style={{
                    width: "6px",
                    height: "6px",

                    borderRadius:
                      "50%",

                    background:
                      "#ff5a4f",

                    display:
                      "inline-block",
                  }}
                />

                online

              </div>
            </div>


            <div
              style={{
                color: "#796c6a",

                fontSize: "12px",

                marginBottom: "22px",
              }}
            >
              Jezero Crater · Mars
            </div>


            {/* Instructions */}

            {!routeStats &&
              !loading && (
                <div
                  style={{
                    color: "#c6bab8",

                    fontSize: "13px",

                    lineHeight:
                      "1.55",

                    marginBottom:
                      "20px",
                  }}
                >
                  Choose a start point
                  and destination on the
                  terrain.
                </div>
              )}


            {/* Loading */}

            {loading && (
              <div
                style={{
                  marginBottom:
                    "20px",
                }}
              >

                <div
                  style={{
                    display: "flex",

                    justifyContent:
                      "space-between",

                    marginBottom:
                      "9px",
                  }}
                >

                  <span
                    style={{
                      color: "#d9cfcd",

                      fontSize:
                        "13px",
                    }}
                  >
                    Finding route
                  </span>


                  <span
                    style={{
                      color: "#ff665b",

                      fontSize:
                        "13px",

                      letterSpacing:
                        "2px",
                    }}
                  >
                    •••
                  </span>

                </div>


                <div
                  style={{
                    width: "100%",

                    height: "2px",

                    background:
                      "rgba(255,255,255,0.07)",

                    borderRadius:
                      "999px",

                    overflow:
                      "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "55%",

                      height: "100%",

                      background:
                        "#ff5a4f",

                      borderRadius:
                        "999px",
                    }}
                  />
                </div>

              </div>
            )}


            {/* Error */}

            {errorMessage && (
              <div
                style={{
                  padding:
                    "11px 12px",

                  marginBottom:
                    "18px",

                  background:
                    "rgba(255,74,62,0.09)",

                  border:
                    "1px solid rgba(255,92,79,0.18)",

                  borderRadius:
                    "10px",

                  color: "#ff8b82",

                  fontSize:
                    "12px",

                  lineHeight:
                    "1.45",
                }}
              >
                {errorMessage}
              </div>
            )}


            {/* Route Stats */}

            {routeStats && (
              <div
                style={{
                  marginBottom:
                    "21px",
                }}
              >

                {routeStats.distance !==
                  null && (
                  <div
                    style={{
                      marginBottom:
                        "20px",
                    }}
                  >

                    <div
                      style={{
                        color:
                          "#796c6a",

                        fontSize:
                          "10px",

                        marginBottom:
                          "3px",

                        textTransform:
                          "uppercase",

                        letterSpacing:
                          "0.8px",
                      }}
                    >
                      Route distance
                    </div>


                    <div
                      style={{
                        color:
                          "#fffafa",

                        fontSize:
                          "32px",

                        fontWeight:
                          "650",

                        letterSpacing:
                          "-1.2px",
                      }}
                    >
                      {(
                        routeStats.distance /
                        1000
                      ).toFixed(2)}

                      <span
                        style={{
                          fontSize:
                            "14px",

                          color:
                            "#9f918f",

                          marginLeft:
                            "6px",

                          fontWeight:
                            "500",
                        }}
                      >
                        km
                      </span>
                    </div>

                  </div>
                )}


                <div
                  style={{
                    display: "grid",

                    gridTemplateColumns:
                      "1fr 1fr",

                    gap:
                      "16px 12px",
                  }}
                >

                  {routeStats.maxSlope !==
                    null && (
                    <Stat
                      label="Max slope"

                      value={`${routeStats.maxSlope.toFixed(
                        1
                      )}°`}
                    />
                  )}


                  {routeStats.computationTime !==
                    null && (
                    <Stat
                      label="Compute"

                      value={`${routeStats.computationTime.toFixed(
                        2
                      )} s`}
                    />
                  )}


                  {routeStats.nodes !==
                    null && (
                    <Stat
                      label="Path nodes"

                      value={routeStats.nodes.toLocaleString()}
                    />
                  )}


                  {routeStats.expanded !==
                    null && (
                    <Stat
                      label="Expanded"

                      value={routeStats.expanded.toLocaleString()}
                    />
                  )}


                  {routeStats.weightedCost !==
                    null && (
                    <Stat
                      label="Terrain cost"

                      value={routeStats.weightedCost.toFixed(
                        1
                      )}
                    />
                  )}

                </div>
              </div>
            )}


            {/* Buttons */}

            <div
              style={{
                display: "grid",

                gridTemplateColumns:
                  "1fr 1fr",

                gap: "8px",
              }}
            >

              <button
                onClick={
                  zoomToRoutingArea
                }

                style={{
                  ...buttonBase,

                  border:
                    "1px solid rgba(255,255,255,0.10)",

                  background:
                    "rgba(255,255,255,0.045)",

                  color:
                    "#ddd3d1",
                }}
              >
                Recenter
              </button>


              <button
                onClick={resetRoute}

                style={{
                  ...buttonBase,

                  border:
                    "1px solid rgba(255,91,78,0.26)",

                  background:
                    "rgba(255,77,64,0.09)",

                  color:
                    "#ff776d",
                }}
              >
                Reset
              </button>

            </div>


            {/* Footer */}

            <div
              style={{
                marginTop: "16px",

                paddingTop: "13px",

                borderTop:
                  "1px solid rgba(255,255,255,0.055)",

                color: "#5c504f",

                fontSize: "10px",

                display: "flex",

                justifyContent:
                  "space-between",
              }}
            >
              <span>
                6 × 14 km region
              </span>

              <span>
                ~2 m grid
              </span>
            </div>

          </div>


          {/* ----------------------------- */}
          {/* Why not straight? */}
          {/* ----------------------------- */}

          <div
            style={{
              ...glassPanel,

              overflow: "hidden",
            }}
          >

            <button
              onClick={() =>
                setWhyOpen(
                  !whyOpen
                )
              }

              style={{
                width: "100%",

                padding:
                  "15px 17px",

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                border: "none",

                background:
                  "transparent",

                color: "#ddd3d1",

                cursor: "pointer",

                fontFamily:
                  "inherit",
              }}
            >

              <span
                style={{
                  fontSize:
                    "13px",

                  fontWeight:
                    "600",
                }}
              >
                Why not straight?
              </span>


              <span
                style={{
                  color: "#ff665b",

                  fontSize:
                    "17px",

                  lineHeight: 1,

                  transform:
                    whyOpen
                      ? "rotate(45deg)"
                      : "rotate(0deg)",

                  transition:
                    "transform 0.18s ease",
                }}
              >
                +
              </span>

            </button>


            {whyOpen && (
              <div
                style={{
                  padding:
                    "16px 17px 18px",

                  borderTop:
                    "1px solid rgba(255,255,255,0.05)",
                }}
              >

                {!routeStats ? (
                  <div
                    style={{
                      color: "#827573",
                      fontSize: "12px",
                      lineHeight: "1.5",
                    }}
                  >
                    Calculate a route first to compare it
                    with the direct path.
                  </div>
                ) : (
                  <>
                    {/* Labels */}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: "12px",
                        marginBottom: "16px",
                      }}
                    >

                      <div>
                        <div
                          style={{
                            color: "#8c7d7b",
                            fontSize: "10px",
                            textTransform:
                              "uppercase",
                            letterSpacing:
                              "0.7px",
                            marginBottom: "5px",
                          }}
                        >
                          Straight
                        </div>

                        <div
                          style={{
                            color: "#f0e7e5",
                            fontSize: "16px",
                            fontWeight: "600",
                          }}
                        >
                          {routeStats.straightDistance !== null
                            ? `${(
                                routeStats.straightDistance /
                                1000
                              ).toFixed(2)} km`
                            : "—"}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            color: "#8c7d7b",
                            fontSize: "10px",
                            textTransform:
                              "uppercase",
                            letterSpacing:
                              "0.7px",
                            marginBottom: "5px",
                          }}
                        >
                          Ares
                        </div>

                        <div
                          style={{
                            color: "#ff6b61",
                            fontSize: "16px",
                            fontWeight: "600",
                          }}
                        >
                          {routeStats.distance !== null
                            ? `${(
                                routeStats.distance /
                                1000
                              ).toFixed(2)} km`
                            : "—"}
                        </div>
                      </div>

                    </div>

                    {/* Max slope comparison */}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: "12px",

                        paddingTop: "13px",

                        borderTop:
                          "1px solid rgba(255,255,255,0.05)",

                        marginBottom: "16px",
                      }}
                    >

                      <div>
                        <div
                          style={{
                            color: "#756866",
                            fontSize: "10px",
                            marginBottom: "4px",
                          }}
                        >
                          max slope
                        </div>

                        <div
                          style={{
                            color:
                              routeStats.straightSafe === false
                                ? "#ff6b61"
                                : "#ddd3d1",

                            fontSize: "14px",
                            fontWeight: "600",
                          }}
                        >
                          {routeStats.straightMaxSlope !== null
                            ? `${routeStats.straightMaxSlope.toFixed(
                                1
                              )}°`
                            : "—"}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            color: "#756866",
                            fontSize: "10px",
                            marginBottom: "4px",
                          }}
                        >
                          max slope
                        </div>

                        <div
                          style={{
                            color: "#ddd3d1",
                            fontSize: "14px",
                            fontWeight: "600",
                          }}
                        >
                          {routeStats.maxSlope !== null
                            ? `${routeStats.maxSlope.toFixed(
                                1
                              )}°`
                            : "—"}
                        </div>
                      </div>

                    </div>

                    {/* Explanation */}

                    <div
                      style={{
                        color: "#a99b99",

                        fontSize: "12px",

                        lineHeight: "1.55",
                      }}
                    >

                      {routeStats.straightSafe === false ? (
                        <>
                          The direct path crosses terrain
                          that exceeds the{" "}

                          <span
                            style={{
                              color: "#ff6b61",
                            }}
                          >
                            25° slope limit
                          </span>

                          . Ares Route takes a longer path
                          to stay on traversable terrain.
                        </>
                      ) : (
                        <>
                          The direct path is traversable,
                          but Ares Route reduces exposure
                          to steep terrain by optimizing
                          terrain-weighted cost.
                        </>
                      )}

                    </div>

                    {/* Extra distance */}

                    {routeStats.distance !== null &&
                      routeStats.straightDistance !== null && (
                        <div
                          style={{
                            marginTop: "14px",

                            paddingTop: "13px",

                            borderTop:
                              "1px solid rgba(255,255,255,0.05)",

                            color: "#6f6260",

                            fontSize: "11px",
                          }}
                        >
                          Route adds{" "}

                          <span
                            style={{
                              color: "#bcaeac",
                            }}
                          >
                            {Math.max(
                              0,
                              (
                                routeStats.distance -
                                routeStats.straightDistance
                              ) / 1000
                            ).toFixed(2)}{" "}
                            km
                          </span>

                          {" "}to avoid worse terrain.
                        </div>
                      )}

                  </>
                )}

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}


function Stat({ label, value }) {
  return (
    <div>

      <div
        style={{
          color: "#716563",

          fontSize: "10px",

          textTransform:
            "uppercase",

          letterSpacing:
            "0.7px",

          marginBottom:
            "3px",
        }}
      >
        {label}
      </div>


      <div
        style={{
          color: "#e8dfdd",

          fontSize: "15px",

          fontWeight: "600",

          fontVariantNumeric:
            "tabular-nums",
        }}
      >
        {value}
      </div>

    </div>
  );
}


export default App;