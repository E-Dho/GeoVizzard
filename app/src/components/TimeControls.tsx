import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { Play, SkipBack, SkipForward, Square } from "lucide-react";
import type { DatasetMetadata } from "../data/schema";
import type { TimeSettings } from "../data/time";

type PlaybackDirection = "younger" | "older";

type Props = {
  metadata: DatasetMetadata;
  timeSettings: TimeSettings;
  setTimeSettings: React.Dispatch<React.SetStateAction<TimeSettings>>;
  setCenterAge: (age: number, options?: { snap?: boolean }) => void;
  window: { start: number; end: number };
  primaryWindowCount: number;
  comparisonWindowCount: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function TimeControls({
  metadata,
  timeSettings,
  setTimeSettings,
  setCenterAge,
  window,
  primaryWindowCount,
  comparisonWindowCount
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
  const rangeSpan = Math.max(1, maxAge - minAge);
  const lowerBound = clamp(
    Math.min(timeSettings.rangeStartAgeBp, timeSettings.rangeEndAgeBp),
    minAge,
    maxAge
  );
  const upperBound = clamp(
    Math.max(timeSettings.rangeStartAgeBp, timeSettings.rangeEndAgeBp),
    minAge,
    maxAge
  );
  const compareLowerBound = clamp(
    Math.min(timeSettings.compareRangeStartAgeBp, timeSettings.compareRangeEndAgeBp),
    minAge,
    maxAge
  );
  const compareUpperBound = clamp(
    Math.max(timeSettings.compareRangeStartAgeBp, timeSettings.compareRangeEndAgeBp),
    minAge,
    maxAge
  );
  const rangeSliderStyle = {
    "--range-start": `${((lowerBound - minAge) / rangeSpan) * 100}%`,
    "--range-end": `${((upperBound - minAge) / rangeSpan) * 100}%`
  } as CSSProperties;
  const compareRangeSliderStyle = {
    "--range-start": `${((compareLowerBound - minAge) / rangeSpan) * 100}%`,
    "--range-end": `${((compareUpperBound - minAge) / rangeSpan) * 100}%`
  } as CSSProperties;

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
    if (!showPlayback || timeSettings.timeMode === "bounds") setPlaying(false);
  }, [showPlayback, timeSettings.timeMode]);

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
  const snapCenterAge = () => setCenterAge(timeSettings.centerAgeBp, { snap: true });
  const snapAge = (age: number) =>
    availableAges.length
      ? availableAges.reduce((best, candidate) =>
          Math.abs(candidate - age) < Math.abs(best - age) ? candidate : best
        )
      : age;
  const setRangeStart = (age: number) => {
    setTimeSettings((current) => ({
      ...current,
      rangeStartAgeBp: Math.min(age, current.rangeEndAgeBp)
    }));
  };
  const setRangeEnd = (age: number) => {
    setTimeSettings((current) => ({
      ...current,
      rangeEndAgeBp: Math.max(age, current.rangeStartAgeBp)
    }));
  };
  const setCompareRangeStart = (age: number) => {
    setTimeSettings((current) => ({
      ...current,
      compareRangeStartAgeBp: Math.min(age, current.compareRangeEndAgeBp)
    }));
  };
  const setCompareRangeEnd = (age: number) => {
    setTimeSettings((current) => ({
      ...current,
      compareRangeEndAgeBp: Math.max(age, current.compareRangeStartAgeBp)
    }));
  };
  const snapRangeStart = () => {
    if (!timeSettings.snapToAvailableDates) return;
    setRangeStart(snapAge(timeSettings.rangeStartAgeBp));
  };
  const snapRangeEnd = () => {
    if (!timeSettings.snapToAvailableDates) return;
    setRangeEnd(snapAge(timeSettings.rangeEndAgeBp));
  };
  const snapCompareRangeStart = () => {
    if (!timeSettings.snapToAvailableDates) return;
    setCompareRangeStart(snapAge(timeSettings.compareRangeStartAgeBp));
  };
  const snapCompareRangeEnd = () => {
    if (!timeSettings.snapToAvailableDates) return;
    setCompareRangeEnd(snapAge(timeSettings.compareRangeEndAgeBp));
  };

  return (
    <section className="panel-section">
      <h2>Time</h2>
      <div className="metric-row">
        {timeSettings.timeMode === "center" && (
          <span>Center: {Math.round(timeSettings.centerAgeBp)} BP</span>
        )}
        {timeSettings.timeMode === "bounds" && (
          <span>Range: {Math.round(lowerBound)}-{Math.round(upperBound)} BP</span>
        )}
        <span>Visible: {Math.round(window.start)}-{Math.round(window.end)} BP</span>
        <span>Samples: {primaryWindowCount}</span>
        {timeSettings.compareWindowEnabled && (
          <span>Compare: {comparisonWindowCount}</span>
        )}
      </div>
      <div className="segmented-control" role="group" aria-label="Time slider mode">
        <button
          type="button"
          className={timeSettings.timeMode === "center" ? "active" : ""}
          onClick={() =>
            setTimeSettings((current) => ({
              ...current,
              timeMode: "center",
              compareWindowEnabled: false
            }))
          }
        >
          Center
        </button>
        <button
          type="button"
          className={timeSettings.timeMode === "bounds" ? "active" : ""}
          onClick={() => setTimeSettings((current) => ({ ...current, timeMode: "bounds" }))}
        >
          Manual range
        </button>
      </div>
      {timeSettings.timeMode === "center" ? (
        <>
          <label>
            Center age
            <input
              type="range"
              min={minAge}
              max={maxAge}
              value={timeSettings.centerAgeBp}
              onChange={(event) => setCenterAge(Number(event.target.value))}
              onKeyUp={snapCenterAge}
              onMouseUp={snapCenterAge}
              onTouchEnd={snapCenterAge}
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
        </>
      ) : (
        <div className="manual-range-control">
          <div className="range-readout">
            <span>Lower: {Math.round(lowerBound)} BP</span>
            <span>Upper: {Math.round(upperBound)} BP</span>
          </div>
          <div className="dual-range" style={rangeSliderStyle}>
            <input
              className="lower"
              type="range"
              min={minAge}
              max={maxAge}
              value={lowerBound}
              aria-label="Lower time bound"
              onChange={(event) => setRangeStart(Number(event.target.value))}
              onKeyUp={snapRangeStart}
              onMouseUp={snapRangeStart}
              onTouchEnd={snapRangeStart}
            />
            <input
              className="upper"
              type="range"
              min={minAge}
              max={maxAge}
              value={upperBound}
              aria-label="Upper time bound"
              onChange={(event) => setRangeEnd(Number(event.target.value))}
              onKeyUp={snapRangeEnd}
              onMouseUp={snapRangeEnd}
              onTouchEnd={snapRangeEnd}
            />
          </div>
          <div className="two-col">
            <label>
              Lower bound
              <input
                type="number"
                value={Math.round(lowerBound)}
                onChange={(event) => setRangeStart(Number(event.target.value))}
                onBlur={snapRangeStart}
              />
            </label>
            <label>
              Upper bound
              <input
                type="number"
                value={Math.round(upperBound)}
                onChange={(event) => setRangeEnd(Number(event.target.value))}
                onBlur={snapRangeEnd}
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={timeSettings.compareWindowEnabled}
              onChange={(event) =>
                setTimeSettings((current) => ({
                  ...current,
                  compareWindowEnabled: event.target.checked
                }))
              }
            />
            Compare second window
          </label>
          {timeSettings.compareWindowEnabled && (
            <div className="comparison-range-control">
              <div className="range-readout comparison">
                <span>Compare lower: {Math.round(compareLowerBound)} BP</span>
                <span>Upper: {Math.round(compareUpperBound)} BP</span>
              </div>
              <div className="dual-range comparison" style={compareRangeSliderStyle}>
                <input
                  className="lower"
                  type="range"
                  min={minAge}
                  max={maxAge}
                  value={compareLowerBound}
                  aria-label="Comparison lower time bound"
                  onChange={(event) => setCompareRangeStart(Number(event.target.value))}
                  onKeyUp={snapCompareRangeStart}
                  onMouseUp={snapCompareRangeStart}
                  onTouchEnd={snapCompareRangeStart}
                />
                <input
                  className="upper"
                  type="range"
                  min={minAge}
                  max={maxAge}
                  value={compareUpperBound}
                  aria-label="Comparison upper time bound"
                  onChange={(event) => setCompareRangeEnd(Number(event.target.value))}
                  onKeyUp={snapCompareRangeEnd}
                  onMouseUp={snapCompareRangeEnd}
                  onTouchEnd={snapCompareRangeEnd}
                />
              </div>
              <div className="two-col">
                <label>
                  Compare lower
                  <input
                    type="number"
                    value={Math.round(compareLowerBound)}
                    onChange={(event) => setCompareRangeStart(Number(event.target.value))}
                    onBlur={snapCompareRangeStart}
                  />
                </label>
                <label>
                  Compare upper
                  <input
                    type="number"
                    value={Math.round(compareUpperBound)}
                    onChange={(event) => setCompareRangeEnd(Number(event.target.value))}
                    onBlur={snapCompareRangeEnd}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}
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
      {timeSettings.timeMode === "center" && (
        <label className="check">
          <input
            type="checkbox"
            checked={showPlayback}
            onChange={(event) => setShowPlayback(event.target.checked)}
          />
          Show playback controls
        </label>
      )}
      {timeSettings.timeMode === "center" && showPlayback && (
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
