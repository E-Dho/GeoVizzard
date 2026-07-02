import { memo, type CSSProperties, useCallback, useEffect, useMemo, useState, useTransition } from "react";
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

function lowerBoundIndex(values: number[], target: number) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (values[mid] < target) low = mid + 1;
    else high = mid;
  }
  return low;
}

function upperBoundIndex(values: number[], target: number) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (values[mid] <= target) low = mid + 1;
    else high = mid;
  }
  return low;
}

function parseDraftNumber(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDraftNumber(value: number | undefined) {
  return value === undefined ? "" : String(value);
}

const DraftNumberInput = memo(function DraftNumberInput({
  value,
  clipMin,
  clipMax,
  fallbackValue,
  onCommit
}: {
  value: number;
  clipMin: number;
  clipMax: number;
  fallbackValue: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(formatDraftNumber(value));

  useEffect(() => {
    setDraft(formatDraftNumber(value));
  }, [value]);

  const commit = useCallback(() => {
    const parsed = parseDraftNumber(draft);
    const clipped = clamp(parsed ?? fallbackValue, clipMin, clipMax);
    setDraft(formatDraftNumber(clipped));
    onCommit(clipped);
  }, [clipMax, clipMin, draft, fallbackValue, onCommit]);

  return (
    <input
      type="number"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setDraft(formatDraftNumber(value));
          event.currentTarget.blur();
        }
      }}
    />
  );
});

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
  const [, startPlaybackTransition] = useTransition();
  const [minAge, maxAge] = metadata.ageExtent;
  const availableAges = useMemo(
    () => [...metadata.availableAges].sort((a, b) => a - b),
    [metadata.availableAges]
  );
  const ageLookup = useMemo(
    () => ({
      nextOlder: (age: number) => availableAges[upperBoundIndex(availableAges, age)],
      nextYounger: (age: number) => availableAges[lowerBoundIndex(availableAges, age) - 1],
      nearest: (age: number) => {
        if (!availableAges.length) return age;
        const index = lowerBoundIndex(availableAges, age);
        const previous = availableAges[index - 1];
        const next = availableAges[index];
        if (previous === undefined) return next;
        if (next === undefined) return previous;
        return Math.abs(previous - age) <= Math.abs(next - age) ? previous : next;
      }
    }),
    [availableAges]
  );
  const rangeSpan = Math.max(1, maxAge - minAge);
  const sliderAge = (age: number) =>
    timeSettings.reverseTimeAxis ? minAge + maxAge - age : age;
  const ageFromSlider = (age: number) =>
    timeSettings.reverseTimeAxis ? minAge + maxAge - age : age;
  const agePercent = (age: number) =>
    ((sliderAge(age) - minAge) / rangeSpan) * 100;
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
  const rangeStartPercent = Math.min(agePercent(lowerBound), agePercent(upperBound));
  const rangeEndPercent = Math.max(agePercent(lowerBound), agePercent(upperBound));
  const compareRangeStartPercent = Math.min(
    agePercent(compareLowerBound),
    agePercent(compareUpperBound)
  );
  const compareRangeEndPercent = Math.max(
    agePercent(compareLowerBound),
    agePercent(compareUpperBound)
  );
  const rangeSliderStyle = {
    "--range-start": `${rangeStartPercent}%`,
    "--range-end": `${rangeEndPercent}%`
  } as CSSProperties;
  const compareRangeSliderStyle = {
    "--range-start": `${compareRangeStartPercent}%`,
    "--range-end": `${compareRangeEndPercent}%`
  } as CSSProperties;

  const getNextAge = useCallback(
    (direction: PlaybackDirection) => {
      if (!availableAges.length) return undefined;
      const center = timeSettings.centerAgeBp;
      return direction === "older" ? ageLookup.nextOlder(center) : ageLookup.nextYounger(center);
    },
    [ageLookup, availableAges.length, timeSettings.centerAgeBp]
  );

  const stepTime = useCallback(
    (direction: PlaybackDirection, options?: { lowPriority?: boolean }) => {
      const nextAge = getNextAge(direction);
      if (nextAge === undefined) return false;
      if (nextAge === timeSettings.centerAgeBp) return false;
      if (options?.lowPriority) {
        startPlaybackTransition(() => setCenterAge(nextAge));
      } else {
        setCenterAge(nextAge);
      }
      return true;
    },
    [getNextAge, setCenterAge, startPlaybackTransition, timeSettings.centerAgeBp]
  );

  useEffect(() => {
    if (!showPlayback || timeSettings.timeMode === "bounds") setPlaying(false);
  }, [showPlayback, timeSettings.timeMode]);

  useEffect(() => {
    if (!playing) return undefined;
    let frameId: number | undefined;
    const timeoutId = globalThis.setTimeout(() => {
      frameId = globalThis.requestAnimationFrame(() => {
        const moved = stepTime(playbackDirection, { lowPriority: true });
        if (!moved) setPlaying(false);
      });
    }, Math.max(150, playbackIntervalMs));
    return () => {
      globalThis.clearTimeout(timeoutId);
      if (frameId !== undefined) globalThis.cancelAnimationFrame(frameId);
    };
  }, [playbackDirection, playbackIntervalMs, playing, stepTime]);

  const canStepYounger = getNextAge("younger") !== undefined;
  const canStepOlder = getNextAge("older") !== undefined;
  const snapCenterAge = () => setCenterAge(timeSettings.centerAgeBp, { snap: true });
  const snapAge = (age: number) =>
    ageLookup.nearest(age);
  const commitTimeInputAge = useCallback(
    (age: number) => (timeSettings.snapToAvailableDates ? snapAge(age) : age),
    [snapAge, timeSettings.snapToAvailableDates]
  );
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
      <label className="check">
        <input
          type="checkbox"
          checked={timeSettings.reverseTimeAxis}
          onChange={(event) =>
            setTimeSettings((current) => ({ ...current, reverseTimeAxis: event.target.checked }))
          }
        />
        Older samples on left
      </label>
      <div className="time-axis-labels">
        <span>{timeSettings.reverseTimeAxis ? "Older" : "Younger"}</span>
        <span>{timeSettings.reverseTimeAxis ? "Younger" : "Older"}</span>
      </div>
      {timeSettings.timeMode === "center" ? (
        <>
          <label>
            Center age
            <input
              type="range"
              min={minAge}
              max={maxAge}
              value={sliderAge(timeSettings.centerAgeBp)}
              onChange={(event) => setCenterAge(ageFromSlider(Number(event.target.value)))}
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
              value={sliderAge(lowerBound)}
              aria-label="Lower time bound"
              onChange={(event) => setRangeStart(ageFromSlider(Number(event.target.value)))}
              onKeyUp={snapRangeStart}
              onMouseUp={snapRangeStart}
              onTouchEnd={snapRangeStart}
            />
            <input
              className="upper"
              type="range"
              min={minAge}
              max={maxAge}
              value={sliderAge(upperBound)}
              aria-label="Upper time bound"
              onChange={(event) => setRangeEnd(ageFromSlider(Number(event.target.value)))}
              onKeyUp={snapRangeEnd}
              onMouseUp={snapRangeEnd}
              onTouchEnd={snapRangeEnd}
            />
          </div>
          <div className="two-col">
            <label>
              Lower bound
              <DraftNumberInput
                value={Math.round(lowerBound)}
                clipMin={minAge}
                clipMax={maxAge}
                fallbackValue={lowerBound}
                onCommit={(age) => setRangeStart(commitTimeInputAge(age))}
              />
            </label>
            <label>
              Upper bound
              <DraftNumberInput
                value={Math.round(upperBound)}
                clipMin={minAge}
                clipMax={maxAge}
                fallbackValue={upperBound}
                onCommit={(age) => setRangeEnd(commitTimeInputAge(age))}
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
                  value={sliderAge(compareLowerBound)}
                  aria-label="Comparison lower time bound"
                  onChange={(event) => setCompareRangeStart(ageFromSlider(Number(event.target.value)))}
                  onKeyUp={snapCompareRangeStart}
                  onMouseUp={snapCompareRangeStart}
                  onTouchEnd={snapCompareRangeStart}
                />
                <input
                  className="upper"
                  type="range"
                  min={minAge}
                  max={maxAge}
                  value={sliderAge(compareUpperBound)}
                  aria-label="Comparison upper time bound"
                  onChange={(event) => setCompareRangeEnd(ageFromSlider(Number(event.target.value)))}
                  onKeyUp={snapCompareRangeEnd}
                  onMouseUp={snapCompareRangeEnd}
                  onTouchEnd={snapCompareRangeEnd}
                />
              </div>
              <div className="two-col">
                <label>
                  Compare lower
                  <DraftNumberInput
                    value={Math.round(compareLowerBound)}
                    clipMin={minAge}
                    clipMax={maxAge}
                    fallbackValue={compareLowerBound}
                    onCommit={(age) => setCompareRangeStart(commitTimeInputAge(age))}
                  />
                </label>
                <label>
                  Compare upper
                  <DraftNumberInput
                    value={Math.round(compareUpperBound)}
                    clipMin={minAge}
                    clipMax={maxAge}
                    fallbackValue={compareUpperBound}
                    onCommit={(age) => setCompareRangeEnd(commitTimeInputAge(age))}
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
