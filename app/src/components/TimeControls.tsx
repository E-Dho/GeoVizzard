import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, SkipBack, SkipForward, Square } from "lucide-react";
import type { DatasetMetadata } from "../data/schema";
import type { TimeSettings } from "../data/time";

type PlaybackDirection = "younger" | "older";

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
  const [showPlayback, setShowPlayback] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playbackDirection, setPlaybackDirection] = useState<PlaybackDirection>("older");
  const [playbackIntervalMs, setPlaybackIntervalMs] = useState(900);
  const [minAge, maxAge] = metadata.ageExtent;
  const availableAges = useMemo(
    () => [...metadata.availableAges].sort((a, b) => a - b),
    [metadata.availableAges]
  );

  const getNextAge = useCallback(
    (direction: PlaybackDirection) => {
      if (!availableAges.length) return undefined;
      const center = timeSettings.centerAgeBp;
      if (direction === "older") {
        return availableAges.find((age) => age > center);
      }
      for (let index = availableAges.length - 1; index >= 0; index -= 1) {
        if (availableAges[index] < center) return availableAges[index];
      }
      return undefined;
    },
    [availableAges, timeSettings.centerAgeBp]
  );

  const stepTime = useCallback(
    (direction: PlaybackDirection) => {
      const nextAge = getNextAge(direction);
      if (nextAge === undefined) return false;
      setCenterAge(nextAge);
      return true;
    },
    [getNextAge, setCenterAge]
  );

  useEffect(() => {
    if (!showPlayback) setPlaying(false);
  }, [showPlayback]);

  useEffect(() => {
    if (!playing) return undefined;
    const interval = globalThis.setInterval(() => {
      const moved = stepTime(playbackDirection);
      if (!moved) setPlaying(false);
    }, Math.max(150, playbackIntervalMs));
    return () => globalThis.clearInterval(interval);
  }, [playbackDirection, playbackIntervalMs, playing, stepTime]);

  const canStepYounger = getNextAge("younger") !== undefined;
  const canStepOlder = getNextAge("older") !== undefined;

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
      <label className="check">
        <input
          type="checkbox"
          checked={showPlayback}
          onChange={(event) => setShowPlayback(event.target.checked)}
        />
        Show playback controls
      </label>
      {showPlayback && (
        <div className="playback-controls">
          <div className="playback-row">
            <button
              type="button"
              onClick={() => stepTime("younger")}
              disabled={!canStepYounger}
              title="Step to the next younger available sample age"
            >
              <SkipBack size={15} />
              Younger
            </button>
            <button
              type="button"
              className={playing ? "active-action" : ""}
              onClick={() => setPlaying((current) => !current)}
              disabled={
                playbackDirection === "older" ? !canStepOlder : !canStepYounger
              }
              title={playing ? "Stop playback" : "Play through available sample ages"}
            >
              {playing ? <Square size={15} /> : <Play size={15} />}
              {playing ? "Stop" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => stepTime("older")}
              disabled={!canStepOlder}
              title="Step to the next older available sample age"
            >
              <SkipForward size={15} />
              Older
            </button>
          </div>
          <div className="two-col">
            <label>
              Play direction
              <select
                value={playbackDirection}
                onChange={(event) =>
                  setPlaybackDirection(event.target.value as PlaybackDirection)
                }
              >
                <option value="older">Older</option>
                <option value="younger">Younger</option>
              </select>
            </label>
            <label>
              Step delay ms
              <input
                type="number"
                min={150}
                step={50}
                value={playbackIntervalMs}
                onChange={(event) =>
                  setPlaybackIntervalMs(
                    Math.max(150, Number(event.target.value) || 900)
                  )
                }
              />
            </label>
          </div>
        </div>
      )}
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
