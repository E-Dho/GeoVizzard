import { memo } from "react";
import type { LayerSettings } from "../state/useAppState";

type Props = {
  settings: LayerSettings;
  setSettings: React.Dispatch<React.SetStateAction<LayerSettings>>;
  hasSigma: boolean;
  hasPotentialOutliers: boolean;
};

const Toggle = memo(function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
});

function LayerControlsComponent({ settings, setSettings, hasSigma, hasPotentialOutliers }: Props) {
  const patch = (partial: Partial<LayerSettings>) =>
    setSettings((current) => ({ ...current, ...partial }));

  return (
    <section className="panel-section">
      <h2>Layers</h2>
      <div className="two-col">
        <Toggle label="True" checked={settings.trueLocations} onChange={(v) => patch({ trueLocations: v })} />
        <Toggle label="Predicted" checked={settings.predictedLocations} onChange={(v) => patch({ predictedLocations: v })} />
        <Toggle label="Arrows" checked={settings.arrows} onChange={(v) => patch({ arrows: v })} />
        <Toggle label="Heatmap" checked={settings.heatmap} onChange={(v) => patch({ heatmap: v })} />
        <Toggle
          label="Potential outliers"
          checked={settings.potentialOutliers}
          onChange={(v) => patch({ potentialOutliers: v })}
        />
        <Toggle label="Uncertainty" checked={settings.uncertainty && hasSigma} onChange={(v) => patch({ uncertainty: v })} />
        <Toggle label="Selected only density" checked={settings.selectedDensityOnly} onChange={(v) => patch({ selectedDensityOnly: v })} />
      </div>
      {!hasSigma && <p className="muted">Uncertainty controls appear when sigma_final exists.</p>}
      {!hasPotentialOutliers && <p className="muted">Potential outlier highlights appear when potential_outlier exists.</p>}
      <div className="two-col">
        <label>
          Point opacity
          <input type="range" min={0} max={1} step={0.05} value={settings.trueOpacity} onChange={(e) => patch({ trueOpacity: Number(e.target.value), predictedOpacity: Number(e.target.value) })} />
        </label>
        <label>
          Arrow opacity
          <input type="range" min={0} max={1} step={0.05} value={settings.arrowOpacity} onChange={(e) => patch({ arrowOpacity: Number(e.target.value) })} />
        </label>
        <label>
          Heatmap opacity
          <input type="range" min={0} max={1} step={0.05} value={settings.heatmapOpacity} onChange={(e) => patch({ heatmapOpacity: Number(e.target.value) })} />
        </label>
        <label>
          Circle opacity
          <input type="range" min={0} max={1} step={0.05} value={settings.uncertaintyOpacity} onChange={(e) => patch({ uncertaintyOpacity: Number(e.target.value) })} />
        </label>
      </div>
      <div className="two-col">
        <label>
          Point color
          <select value={settings.pointColorMode} onChange={(e) => patch({ pointColorMode: e.target.value as LayerSettings["pointColorMode"] })}>
            <option value="group">Group</option>
            <option value="sequencing_type">Sequencing</option>
            <option value="age_bp">Age</option>
            <option value="constant">Constant</option>
          </select>
        </label>
        <label>
          Arrow color
          <select value={settings.arrowColorMode} onChange={(e) => patch({ arrowColorMode: e.target.value as LayerSettings["arrowColorMode"] })}>
            <option value="error_km">Error</option>
            <option value="alpha_precision">Alpha precision</option>
            <option value="age_bp">Age</option>
            <option value="group">Group</option>
            <option value="sequencing_type">Sequencing</option>
            <option value="constant">Constant</option>
          </select>
        </label>
      </div>
      <div className="two-col">
        <label>
          Arrow width
          <select value={settings.arrowWidthMode} onChange={(e) => patch({ arrowWidthMode: e.target.value as LayerSettings["arrowWidthMode"] })}>
            <option value="constant">Constant</option>
            <option value="error_km">Error km</option>
          </select>
        </label>
        <label>
          Max arrows
          <input type="number" value={settings.maxArrows} onChange={(e) => patch({ maxArrows: Number(e.target.value) })} />
        </label>
      </div>
      <div className="two-col">
        <label>
          Sigma multiplier
          <select value={settings.uncertaintyMultiplier} onChange={(e) => patch({ uncertaintyMultiplier: Number(e.target.value) as 1 | 2 | 3 })}>
            <option value={1}>1 sigma</option>
            <option value={2}>2 sigma</option>
            <option value={3}>3 sigma</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.heatmapUseSigma} onChange={(e) => patch({ heatmapUseSigma: e.target.checked })} />
          Weight heatmap by sigma
        </label>
      </div>
      <div className="two-col">
        <label>
          KDE bandwidth
          <input type="number" value={settings.heatmapBandwidth} onChange={(e) => patch({ heatmapBandwidth: Number(e.target.value) })} />
        </label>
        <label>
          KDE source
          <select value={settings.heatmapSource} onChange={(e) => patch({ heatmapSource: e.target.value as LayerSettings["heatmapSource"] })}>
            <option value="predicted">Predicted</option>
            <option value="true">True</option>
            <option value="error_endpoints">Both endpoints</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export const LayerControls = memo(LayerControlsComponent);
