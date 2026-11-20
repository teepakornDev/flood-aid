"use client";

import type { FloodBounds, FloodReportFeature } from "@floodaid/contracts";
import type { GeoJSONSource, Map as MapInstance, StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { MapPoint } from "../../features/flood-reports/report-display";
import "maplibre-gl/dist/maplibre-gl.css";

const reportSource = "floodaid-observations";
const pinSource = "floodaid-location";
const emptyFeatures = { type: "FeatureCollection" as const, features: [] };
const emptyReports: FloodReportFeature[] = [];
const offlineStyle: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: "geojson",
      data: "/maps/southeast-asia.geojson",
      attribution: 'Made with <a href="https://www.naturalearthdata.com/">Natural Earth</a>',
    },
  },
  layers: [
    { id: "water", type: "background", paint: { "background-color": "#dcecf4" } },
    { id: "land", type: "fill", source: "basemap", filter: ["==", ["get", "kind"], "country"], paint: { "fill-color": "#e6eee2" } },
    { id: "borders", type: "line", source: "basemap", filter: ["==", ["get", "kind"], "country"], paint: { "line-color": "#a4afa1", "line-width": 1 } },
    { id: "lakes", type: "fill", source: "basemap", filter: ["==", ["get", "kind"], "lake"], paint: { "fill-color": "#dcecf4" } },
    {
      id: "roads", type: "line", source: "basemap", minzoom: 7,
      filter: ["==", ["get", "kind"], "road"],
      paint: { "line-color": "#a89d86", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.7, 10, 1.4, 14, 3] },
    },
  ],
};

interface ObservationMapProps {
  center: MapPoint;
  bundledOnly?: boolean;
  reports?: FloodReportFeature[];
  pin?: MapPoint | null;
  onBoundsChange?: (bounds: FloodBounds) => void;
  onPick?: (point: MapPoint) => void;
  onSelectReport?: (id: string) => void;
}

export function ObservationMap({
  center, bundledOnly = false, reports = emptyReports, pin, onBoundsChange, onPick, onSelectReport,
}: ObservationMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const currentMap = useRef<MapInstance | null>(null);
  const [readyMap, setReadyMap] = useState<MapInstance | null>(null);
  const [mapIssue, setMapIssue] = useState(false);

  useEffect(() => {
    let active = true;
    let map: MapInstance | undefined;
    const element = container.current;
    void import("maplibre-gl").then(({ Map, NavigationControl }) => {
      if (!active || !element) return;
      map = new Map({
        container: element,
        style: (!bundledOnly && process.env.NEXT_PUBLIC_MAP_STYLE_URL) || offlineStyle,
        center: [center[0], Math.max(-85, Math.min(85, center[1]))],
        zoom: 10,
        renderWorldCopies: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        locale: {
          "Map.Title": "แผนที่น้ำท่วม",
          "NavigationControl.ZoomIn": "ซูมเข้า",
          "NavigationControl.ZoomOut": "ซูมออก",
        },
      });
      const instance = map;
      currentMap.current = instance;
      instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
      instance.on("error", () => { if (active) setMapIssue(true); });
      if (onPick || onSelectReport) {
        instance.on("click", (event) => {
          if (onPick) onPick([event.lngLat.wrap().lng, event.lngLat.lat]);
          if (!onSelectReport || !instance.getLayer(reportSource)) return;
          const [feature] = instance.queryRenderedFeatures(event.point, { layers: [reportSource] });
          if (typeof feature?.id === "string") onSelectReport(feature.id);
        });
      }
      instance.on("load", () => {
        if (!active) return;
        setMapIssue(false);
        instance.addSource(reportSource, { type: "geojson", data: emptyFeatures, promoteId: "id" });
        instance.addLayer({
          id: reportSource, source: reportSource, type: "circle",
          paint: {
            "circle-radius": 7,
            "circle-color": ["match", ["get", "verificationStatus"], "VERIFIED", "#08786a", "#a94d14"],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
        instance.addSource(pinSource, { type: "geojson", data: emptyFeatures });
        instance.addLayer({
          id: pinSource, source: pinSource, type: "circle",
          paint: { "circle-radius": 8, "circle-color": "#1e40af", "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" },
        });
        setReadyMap(instance);
      });
    }).catch(() => {
      if (!active) return;
      if (!map) element?.replaceChildren();
      setMapIssue(true);
    });

    return () => {
      active = false;
      currentMap.current = null;
      map?.remove();
      // A failed constructor can leave controls or a canvas in the container.
      element?.replaceChildren();
    };
  }, [center, bundledOnly, onPick, onSelectReport]);

  useEffect(() => {
    if (!readyMap || readyMap !== currentMap.current || !onBoundsChange) return;
    const updateBounds = () => {
      const bounds = readyMap.getBounds();
      onBoundsChange([
        Math.max(-180, bounds.getWest()), Math.max(-90, bounds.getSouth()),
        Math.min(180, bounds.getEast()), Math.min(90, bounds.getNorth()),
      ]);
    };
    readyMap.on("moveend", updateBounds);
    updateBounds();
    return () => { readyMap.off("moveend", updateBounds); };
  }, [readyMap, onBoundsChange]);

  useEffect(() => {
    if (!readyMap || readyMap !== currentMap.current) return;
    readyMap.getSource<GeoJSONSource>(reportSource)?.setData({ type: "FeatureCollection", features: reports });
    readyMap.getSource<GeoJSONSource>(pinSource)?.setData(pin
      ? { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: pin } }
      : emptyFeatures);
  }, [readyMap, reports, pin]);

  return (
    <div>
      <div ref={container} className={`h-72 overflow-hidden rounded-2xl bg-[#dcecf4] sm:h-96 ${onPick ? "cursor-crosshair" : ""}`} />
      {mapIssue && <p role="status" className="mt-2 text-sm text-slate-700">แผนที่โหลดได้ไม่ครบ ใช้ช่องพิกัดหรือรายการรายงานด้านล่างได้</p>}
    </div>
  );
}
