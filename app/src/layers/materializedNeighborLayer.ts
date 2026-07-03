import { LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { CoordinateSystem, PickingInfo } from "@deck.gl/core";
import type { SampleRecord } from "../data/schema";

type MaterializedDatum = {
  sample: SampleRecord;
  selected: boolean;
};

type Options = {
  coordinateSystem?: CoordinateSystem;
  idPrefix?: string;
  trueColor?: [number, number, number, number];
  predictedColor?: [number, number, number, number];
  lineColor?: [number, number, number, number];
};

const TRUE_MATERIALIZED_COLOR: [number, number, number, number] = [20, 184, 166, 235];
const PRED_MATERIALIZED_COLOR: [number, number, number, number] = [236, 72, 153, 235];
const SELECTED_LINE_COLOR: [number, number, number, number] = [255, 214, 10, 245];

export function materializedNeighborLayers(
  samples: SampleRecord[],
  predictedIds: Set<string>,
  selectedSampleId: string | undefined,
  onSelect: (sample: SampleRecord) => void,
  options: Options = {}
) {
  const idPrefix = options.idPrefix ?? "materialized-neighbor";
  const trueColor = options.trueColor ?? TRUE_MATERIALIZED_COLOR;
  const predictedColor = options.predictedColor ?? PRED_MATERIALIZED_COLOR;
  const lineColor = options.lineColor ?? [236, 72, 153, 125];
  const data = samples.map((sample) => ({
    sample,
    selected: sample.sample_id === selectedSampleId
  }));
  const predictedData = data.filter(({ sample }) => predictedIds.has(sample.sample_id));
  const coordinateSystem =
    options.coordinateSystem !== undefined ? { coordinateSystem: options.coordinateSystem } : {};

  return [
    new LineLayer<MaterializedDatum>({
      id: `${idPrefix}-prediction-lines`,
      data: predictedData,
      ...coordinateSystem,
      getSourcePosition: ({ sample }) => [sample.true_lon, sample.true_lat],
      getTargetPosition: ({ sample }) => [sample.pred_lon, sample.pred_lat],
      getColor: lineColor,
      getWidth: ({ selected }) => (selected ? 2 : 1),
      widthUnits: "pixels"
    }),
    new ScatterplotLayer<MaterializedDatum>({
      id: `${idPrefix}-true`,
      data,
      ...coordinateSystem,
      pickable: true,
      radiusUnits: "pixels",
      getRadius: ({ selected }) => (selected ? 8 : 6),
      stroked: true,
      lineWidthUnits: "pixels",
      getLineWidth: ({ selected }) => (selected ? 3 : 1),
      getPosition: ({ sample }) => [sample.true_lon, sample.true_lat],
      getFillColor: trueColor,
      getLineColor: ({ selected }) => (selected ? SELECTED_LINE_COLOR : [255, 255, 255, 210]),
      onClick: (info: PickingInfo<MaterializedDatum>) => info.object && onSelect(info.object.sample),
      updateTriggers: {
        getRadius: [selectedSampleId],
        getLineWidth: [selectedSampleId],
        getLineColor: [selectedSampleId]
      }
    }),
    new ScatterplotLayer<MaterializedDatum>({
      id: `${idPrefix}-predicted`,
      data: predictedData,
      ...coordinateSystem,
      pickable: true,
      radiusUnits: "pixels",
      getRadius: ({ selected }) => (selected ? 8 : 6),
      stroked: true,
      lineWidthUnits: "pixels",
      getLineWidth: ({ selected }) => (selected ? 3 : 1),
      getPosition: ({ sample }) => [sample.pred_lon, sample.pred_lat],
      getFillColor: predictedColor,
      getLineColor: ({ selected }) => (selected ? SELECTED_LINE_COLOR : [255, 255, 255, 210]),
      onClick: (info: PickingInfo<MaterializedDatum>) => info.object && onSelect(info.object.sample),
      updateTriggers: {
        getRadius: [selectedSampleId],
        getLineWidth: [selectedSampleId],
        getLineColor: [selectedSampleId]
      }
    })
  ];
}
