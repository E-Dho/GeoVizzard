import { PathLayer, TextLayer } from "@deck.gl/layers";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import type { UtmContext, UtmContextLabel, UtmContextLine } from "../data/utm";

function colorForContextLine(line: UtmContextLine): [number, number, number, number] {
  if (line.kind === "frame") return [51, 65, 85, 75];
  if (line.kind === "land") return [15, 23, 42, 58];
  if (line.kind === "border") return [51, 65, 85, 44];
  return [71, 85, 105, 42];
}

function widthForContextLine(line: UtmContextLine) {
  if (line.kind === "frame") return 1.4;
  if (line.kind === "land") return 1.1;
  return 1;
}

export function utmContextLayers(context?: UtmContext, vectorLines: UtmContextLine[] = []) {
  if (!context) return [];
  const lines = [...vectorLines, ...context.lines];

  return [
    new PathLayer<UtmContextLine>({
      id: "utm-context-lines",
      data: lines,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      pickable: false,
      getPath: (line) => line.path,
      getColor: colorForContextLine,
      getWidth: widthForContextLine,
      widthUnits: "pixels",
      updateTriggers: {
        getColor: [lines.length],
        getWidth: [lines.length]
      }
    }),
    new TextLayer<UtmContextLabel>({
      id: "utm-context-labels",
      data: context.labels,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      pickable: false,
      getPosition: (label) => label.position,
      getText: (label) => label.text,
      getColor: [71, 85, 105, 105],
      getSize: 11,
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      sizeUnits: "pixels",
      background: true,
      getBackgroundColor: [248, 250, 252, 155],
      backgroundPadding: [3, 2]
    })
  ];
}
