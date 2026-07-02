import type { LegendMapCorner, LegendPlacement, UiSettings } from "../state/useAppState";

type Props = {
  settings: UiSettings;
  setSettings: React.Dispatch<React.SetStateAction<UiSettings>>;
};

export function LayoutControls({ settings, setSettings }: Props) {
  const patch = (partial: Partial<UiSettings>) =>
    setSettings((current) => ({ ...current, ...partial }));

  return (
    <section className="panel-section">
      <h2>Layout</h2>
      <label>
        Legend location
        <select
          value={settings.legendPlacement}
          onChange={(event) => patch({ legendPlacement: event.target.value as LegendPlacement })}
        >
          <option value="left">Left controls</option>
          <option value="map">Map overlay</option>
          <option value="right-top">Right panel top</option>
          <option value="right-bottom">Right panel bottom</option>
        </select>
      </label>
      {settings.legendPlacement === "map" && (
        <label>
          Map corner
          <select
            value={settings.legendMapCorner}
            onChange={(event) => patch({ legendMapCorner: event.target.value as LegendMapCorner })}
          >
            <option value="top-left">Top left</option>
            <option value="top-right">Top right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-right">Bottom right</option>
          </select>
        </label>
      )}
    </section>
  );
}
