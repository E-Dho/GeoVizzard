import type { DatasetMetadata } from "../data/schema";
import type { TimeSettings } from "../data/time";

type Props = {
  metadata: DatasetMetadata;
  timeSettings: TimeSettings;
  setTimeSettings: React.Dispatch<React.SetStateAction<TimeSettings>>;
  setCenterAge: (age: number) => void;
  window: { start: number; end: number };
  primaryWindowCount: number;
};

export function TimeControls({
  metadata,
  timeSettings,
  setTimeSettings,
  setCenterAge,
  window,
  primaryWindowCount
}: Props) {
  const [minAge, maxAge] = metadata.ageExtent;
  return (
    <section className="panel-section">
      <h2>Time</h2>
      <div className="metric-row">
        <span>Center: {Math.round(timeSettings.centerAgeBp)} BP</span>
        <span>Visible: {Math.round(window.start)}-{Math.round(window.end)} BP</span>
        <span>Samples: {primaryWindowCount}</span>
      </div>
      <label>
        Center age
        <input
          type="range"
          min={minAge}
          max={maxAge}
          value={timeSettings.centerAgeBp}
          onChange={(event) => setCenterAge(Number(event.target.value))}
        />
      </label>
      <label>
        Window width years
        <input
          type="number"
          min={1}
          value={timeSettings.windowWidthYears}
          onChange={(event) =>
            setTimeSettings((current) => ({ ...current, windowWidthYears: Number(event.target.value) }))
          }
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={timeSettings.snapToAvailableDates}
          onChange={(event) =>
            setTimeSettings((current) => ({ ...current, snapToAvailableDates: event.target.checked }))
          }
        />
        Snap to available dates
      </label>
      <div className="two-col">
        <label className="check">
          <input
            type="checkbox"
            checked={timeSettings.temporalFadeEnabled}
            onChange={(event) =>
              setTimeSettings((current) => ({ ...current, temporalFadeEnabled: event.target.checked }))
            }
          />
          Temporal fade
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={timeSettings.fadeOlderOnly}
            onChange={(event) =>
              setTimeSettings((current) => ({ ...current, fadeOlderOnly: event.target.checked }))
            }
          />
          Older only
        </label>
      </div>
      <div className="two-col">
        <label>
          Lookback years
          <input
            type="number"
            value={timeSettings.fadeLookbackYears}
            onChange={(event) =>
              setTimeSettings((current) => ({ ...current, fadeLookbackYears: Number(event.target.value) }))
            }
          />
        </label>
        <label>
          Min alpha
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={timeSettings.minimumFadedAlpha}
            onChange={(event) =>
              setTimeSettings((current) => ({ ...current, minimumFadedAlpha: Number(event.target.value) }))
            }
          />
        </label>
      </div>
      <div className="two-col">
        <label>
          Window alpha
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={timeSettings.currentWindowAlpha}
            onChange={(event) =>
              setTimeSettings((current) => ({ ...current, currentWindowAlpha: Number(event.target.value) }))
            }
          />
        </label>
        <label>
          Fade curve
          <select
            value={timeSettings.fadeCurve}
            onChange={(event) =>
              setTimeSettings((current) => ({
                ...current,
                fadeCurve: event.target.value as TimeSettings["fadeCurve"]
              }))
            }
          >
            <option value="linear">Linear</option>
            <option value="exponential">Exponential</option>
            <option value="step">Step</option>
          </select>
        </label>
      </div>
      {timeSettings.fadeCurve === "exponential" && (
        <label>
          Fade strength
          <input
            type="number"
            step={0.25}
            value={timeSettings.fadeStrength}
            onChange={(event) =>
              setTimeSettings((current) => ({ ...current, fadeStrength: Number(event.target.value) }))
            }
          />
        </label>
      )}
    </section>
  );
}
