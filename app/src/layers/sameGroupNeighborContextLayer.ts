import { LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { CoordinateSystem } from "@deck.gl/core";
import type { NeighborInfo, SampleRecord } from "../data/schema";

type NeighborPoint = NeighborInfo & {
  sourceId: string;
  sourceLon: number;
  sourceLat: number;
  lon: number;
  lat: number;
};

type Options = {
  coordinateSystem?: CoordinateSystem;
  idPrefix?: string;
};

function neighborPoints(samples: SampleRecord[]) {
  return samples.flatMap((sample) =>
    (sample.neighbors ?? [])
      .filter((neighbor): neighbor is NeighborInfo & { lon: number; lat: number } =>
        neighbor.lon !== undefined && neighbor.lat !== undefined
      )
      .map((neighbor) => ({
        ...neighbor,
        sourceId: sample.sample_id,
        sourceLon: sample.pred_lon,
        sourceLat: sample.pred_lat
      }))
  );
}

export function sameGroupNeighborContextLayers(samples: SampleRecord[], options: Options = {}) {
  const data = neighborPoints(samples);
  const coordinateSystem =
    options.coordinateSystem !== undefined ? { coordinateSystem: options.coordinateSystem } : {};
  const idPrefix = options.idPrefix ?? "same-group-neighbor-context";

  return [
    new LineLayer<NeighborPoint>({
      id: `${idPrefix}-lines`,
      data,
      ...coordinateSystem,
      getSourcePosition: (neighbor) => [neighbor.sourceLon, neighbor.sourceLat],
      getTargetPosition: (neighbor) => [neighbor.lon, neighbor.lat],
      getColor: [79, 70, 229, 95],
      getWidth: 1,
      widthUnits: "pixels"
    }),
    new ScatterplotLayer<NeighborPoint>({
      id: `${idPrefix}-points`,
      data,
      ...coordinateSystem,
      pickable: false,
      radiusUnits: "pixels",
      getRadius: 3,
      stroked: true,
      lineWidthUnits: "pixels",
      getLineWidth: 1,
      getPosition: (neighbor) => [neighbor.lon, neighbor.lat],
      getFillColor: [168, 85, 247, 190],
      getLineColor: [255, 255, 255, 170]
    })
  ];
}
