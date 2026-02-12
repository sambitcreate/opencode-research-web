import { useCallback, useReducer } from 'react';
import { DEBUG_EVENT_LIMIT } from './constants';
import type {
  EngineState,
  EventConnectionState,
  OpenCodeDebugEvent,
  OpenCodeMonitorSnapshot,
  OpenCodeSessionDetail,
  OpenCodeSessionTimeline,
  OpenCodeStatus,
} from './types';

export type OpenCodeEventDebugFilter = 'all' | 'instance' | 'global' | 'bridge';

export type OpenCodeMonitorStoreState = {
  monitor: OpenCodeMonitorSnapshot | null;
  engine: OpenCodeStatus | null;
  engineState: EngineState;
  monitorError: string | null;
  isMonitorLoading: boolean;
  sessionDetail: OpenCodeSessionDetail | null;
  sessionTimeline: OpenCodeSessionTimeline | null;
  activeSessionId: string | null;
  isSessionDetailLoading: boolean;
  sessionError: string | null;
  sessionSearch: string;
  isTimelineLoading: boolean;
  timelineError: string | null;
  eventConnectionState: EventConnectionState;
  eventConnectionError: string | null;
  eventDebugFilter: OpenCodeEventDebugFilter;
  eventDebugEvents: OpenCodeDebugEvent[];
};

export type OpenCodeMonitorStoreFieldUpdater<T> = T | ((current: T) => T);

export type OpenCodeMonitorStoreEventUpdate = {
  connectionState?: EventConnectionState;
  connectionError?: string | null;
  debugEvent?: OpenCodeDebugEvent;
};

type SetFieldAction = {
  [K in keyof OpenCodeMonitorStoreState]: {
    type: 'set-field';
    key: K;
    value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState[K]>;
  };
}[keyof OpenCodeMonitorStoreState];

type OpenCodeMonitorStoreAction =
  | SetFieldAction
  | {
      type: 'apply-monitor-snapshot';
      snapshot: OpenCodeMonitorSnapshot;
    }
  | {
      type: 'apply-event-update';
      update: OpenCodeMonitorStoreEventUpdate;
    };

export const INITIAL_OPENCODE_MONITOR_STORE_STATE: OpenCodeMonitorStoreState = {
  monitor: null,
  engine: null,
  engineState: 'checking',
  monitorError: null,
  isMonitorLoading: false,
  sessionDetail: null,
  sessionTimeline: null,
  activeSessionId: null,
  isSessionDetailLoading: false,
  sessionError: null,
  sessionSearch: '',
  isTimelineLoading: false,
  timelineError: null,
  eventConnectionState: 'connecting',
  eventConnectionError: null,
  eventDebugFilter: 'all',
  eventDebugEvents: [],
};

function resolveUpdater<T>(current: T, value: OpenCodeMonitorStoreFieldUpdater<T>): T {
  if (typeof value === 'function') {
    return (value as (previous: T) => T)(current);
  }
  return value;
}

function reduceWithMonitorSnapshot(
  state: OpenCodeMonitorStoreState,
  snapshot: OpenCodeMonitorSnapshot
): OpenCodeMonitorStoreState {
  const activeSessionId =
    state.activeSessionId && snapshot.sessions.sessions.some((session) => session.id === state.activeSessionId)
      ? state.activeSessionId
      : snapshot.sessions.sessions[0]?.id || null;

  return {
    ...state,
    monitor: snapshot,
    engine: snapshot.status,
    engineState: snapshot.status.running ? 'ready' : 'offline',
    monitorError: null,
    activeSessionId,
  };
}

function reduceWithEventUpdate(
  state: OpenCodeMonitorStoreState,
  update: OpenCodeMonitorStoreEventUpdate
): OpenCodeMonitorStoreState {
  const nextState: OpenCodeMonitorStoreState = {
    ...state,
    eventConnectionState: update.connectionState ?? state.eventConnectionState,
    eventConnectionError:
      update.connectionError === undefined ? state.eventConnectionError : update.connectionError,
  };

  if (!update.debugEvent) {
    return nextState;
  }

  return {
    ...nextState,
    eventDebugEvents: [update.debugEvent, ...nextState.eventDebugEvents].slice(0, DEBUG_EVENT_LIMIT),
  };
}

export function reduceOpenCodeMonitorStore(
  state: OpenCodeMonitorStoreState,
  action: OpenCodeMonitorStoreAction
): OpenCodeMonitorStoreState {
  switch (action.type) {
    case 'set-field': {
      const nextValue = resolveUpdater(state[action.key], action.value as never);
      if (Object.is(state[action.key], nextValue)) return state;
      return {
        ...state,
        [action.key]: nextValue,
      } as OpenCodeMonitorStoreState;
    }
    case 'apply-monitor-snapshot':
      return reduceWithMonitorSnapshot(state, action.snapshot);
    case 'apply-event-update':
      return reduceWithEventUpdate(state, action.update);
    default:
      return state;
  }
}

function createSetFieldAction<K extends keyof OpenCodeMonitorStoreState>(
  key: K,
  value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState[K]>
): SetFieldAction {
  return {
    type: 'set-field',
    key,
    value,
  } as SetFieldAction;
}

export function createOpenCodeDebugEvent(
  event: Omit<OpenCodeDebugEvent, 'id' | 'timestamp'>
): OpenCodeDebugEvent {
  const timestamp = new Date().toISOString();
  return {
    ...event,
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
  };
}

export function useOpenCodeMonitorStore() {
  const [state, dispatch] = useReducer(reduceOpenCodeMonitorStore, INITIAL_OPENCODE_MONITOR_STORE_STATE);

  const setField = useCallback(
    <K extends keyof OpenCodeMonitorStoreState>(
      key: K,
      value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState[K]>
    ) => {
      dispatch(createSetFieldAction(key, value));
    },
    [dispatch]
  );

  const setMonitor = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['monitor']>) => {
      setField('monitor', value);
    },
    [setField]
  );

  const setEngine = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['engine']>) => {
      setField('engine', value);
    },
    [setField]
  );

  const setEngineState = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['engineState']>) => {
      setField('engineState', value);
    },
    [setField]
  );

  const setMonitorError = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['monitorError']>) => {
      setField('monitorError', value);
    },
    [setField]
  );

  const setIsMonitorLoading = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['isMonitorLoading']>) => {
      setField('isMonitorLoading', value);
    },
    [setField]
  );

  const setSessionDetail = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['sessionDetail']>) => {
      setField('sessionDetail', value);
    },
    [setField]
  );

  const setSessionTimeline = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['sessionTimeline']>) => {
      setField('sessionTimeline', value);
    },
    [setField]
  );

  const setActiveSessionId = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['activeSessionId']>) => {
      setField('activeSessionId', value);
    },
    [setField]
  );

  const setIsSessionDetailLoading = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['isSessionDetailLoading']>) => {
      setField('isSessionDetailLoading', value);
    },
    [setField]
  );

  const setSessionError = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['sessionError']>) => {
      setField('sessionError', value);
    },
    [setField]
  );

  const setSessionSearch = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['sessionSearch']>) => {
      setField('sessionSearch', value);
    },
    [setField]
  );

  const setIsTimelineLoading = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['isTimelineLoading']>) => {
      setField('isTimelineLoading', value);
    },
    [setField]
  );

  const setTimelineError = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['timelineError']>) => {
      setField('timelineError', value);
    },
    [setField]
  );

  const setEventConnectionState = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['eventConnectionState']>) => {
      setField('eventConnectionState', value);
    },
    [setField]
  );

  const setEventConnectionError = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['eventConnectionError']>) => {
      setField('eventConnectionError', value);
    },
    [setField]
  );

  const setEventDebugFilter = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['eventDebugFilter']>) => {
      setField('eventDebugFilter', value);
    },
    [setField]
  );

  const setEventDebugEvents = useCallback(
    (value: OpenCodeMonitorStoreFieldUpdater<OpenCodeMonitorStoreState['eventDebugEvents']>) => {
      setField('eventDebugEvents', value);
    },
    [setField]
  );

  const applyMonitorSnapshot = useCallback(
    (snapshot: OpenCodeMonitorSnapshot) => {
      dispatch({ type: 'apply-monitor-snapshot', snapshot });
    },
    [dispatch]
  );

  const applyEventUpdate = useCallback(
    (update: OpenCodeMonitorStoreEventUpdate) => {
      dispatch({ type: 'apply-event-update', update });
    },
    [dispatch]
  );

  return {
    state,
    setMonitor,
    setEngine,
    setEngineState,
    setMonitorError,
    setIsMonitorLoading,
    setSessionDetail,
    setSessionTimeline,
    setActiveSessionId,
    setIsSessionDetailLoading,
    setSessionError,
    setSessionSearch,
    setIsTimelineLoading,
    setTimelineError,
    setEventConnectionState,
    setEventConnectionError,
    setEventDebugFilter,
    setEventDebugEvents,
    applyMonitorSnapshot,
    applyEventUpdate,
  };
}
