import {
  EVENT_REFRESH_MONITOR_AND_SESSION_PREFIXES,
  EVENT_REFRESH_MONITOR_AND_SESSION_TYPES,
  EVENT_REFRESH_MONITOR_ONLY_PREFIXES,
  EVENT_REFRESH_MONITOR_ONLY_TYPES,
  EVENT_REFRESH_NONE,
  TEXT_ATTACHMENT_EXTENSIONS
} from './constants';
import type {
  ComposerMention,
  ComposerToken,
  EventRefreshScope,
  McpServerOption,
  ModelOption,
  OpenCodePtySession,
  OpenCodeSessionMessage,
  PermissionContext,
  ProviderOption,
  QuestionContext,
  ThemePalette,
  ThemeStyle
} from './types';

export function toUniqueStrings(values: string[], limit = 120): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(trimmed);
    if (next.length >= limit) break;
  }

  return next;
}

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileSignature(file: File): string {
  return `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
}

export function isTextAttachment(file: File): boolean {
  if (file.type.startsWith('text/')) return true;
  if (
    file.type === 'application/json' ||
    file.type === 'application/xml' ||
    file.type === 'application/javascript' ||
    file.type === 'application/x-sh'
  ) {
    return true;
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
  return extension ? TEXT_ATTACHMENT_EXTENSIONS.has(extension) : false;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error(`Unable to read ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function collectStringFields(value: unknown, fieldNames: string[], depth = 0, bucket: string[] = []): string[] {
  if (!value || depth > 4) return bucket;
  if (Array.isArray(value)) {
    for (const nested of value) {
      collectStringFields(nested, fieldNames, depth + 1, bucket);
      if (bucket.length >= 240) break;
    }
    return bucket;
  }

  const record = asRecord(value);
  if (!record) return bucket;

  for (const fieldName of fieldNames) {
    const fieldValue = record[fieldName];
    if (typeof fieldValue === 'string') {
      bucket.push(fieldValue);
    }
  }

  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== 'object') continue;
    collectStringFields(nested, fieldNames, depth + 1, bucket);
    if (bucket.length >= 240) break;
  }

  return bucket;
}

export function collectLikelyFilePaths(messages: OpenCodeSessionMessage[]): string[] {
  const pattern = /(?:^|[\s"'`(])((?:\.{1,2}\/)?(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+|[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+)(?=$|[\s"'`),:;])/g;
  const matches: string[] = [];

  for (const message of messages) {
    const text = message.text;
    let match: RegExpExecArray | null = pattern.exec(text);
    while (match) {
      const candidate = match[1]?.trim();
      if (
        candidate &&
        !candidate.startsWith('http://') &&
        !candidate.startsWith('https://') &&
        !candidate.startsWith('@')
      ) {
        matches.push(candidate);
      }
      match = pattern.exec(text);
    }
    pattern.lastIndex = 0;
  }

  return toUniqueStrings(matches, 100);
}

export function extractComposerToken(value: string, caretPosition: number): ComposerToken | null {
  const safeCaret = Math.max(0, Math.min(caretPosition, value.length));
  const textBeforeCursor = value.slice(0, safeCaret);
  const match = /(?:^|\s)([@/][^\s]*)$/.exec(textBeforeCursor);
  if (!match) return null;

  const raw = match[1];
  const trigger = raw[0];
  if (trigger !== '@' && trigger !== '/') return null;

  return {
    trigger,
    value: raw.slice(1),
    start: safeCaret - raw.length,
    end: safeCaret
  };
}

export function parseComposerMentions(value: string): ComposerMention[] {
  const mentions: ComposerMention[] = [];
  const seen = new Set<string>();
  const pattern = /(^|\s)@(file|agent|mcp):([^\s]+)/gi;
  let match: RegExpExecArray | null = pattern.exec(value);

  while (match) {
    const leading = match[1] ?? '';
    const categoryRaw = (match[2] || '').toLowerCase();
    const mentionValue = (match[3] || '').trim();
    if (mentionValue && (categoryRaw === 'file' || categoryRaw === 'agent' || categoryRaw === 'mcp')) {
      const category = categoryRaw;
      const key = `${category}:${mentionValue.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        mentions.push({
          category,
          value: mentionValue,
          token: `@${category}:${mentionValue}`,
          index: match.index + leading.length,
          length: category.length + mentionValue.length + 2
        });
      }
    }

    if (mentions.length >= 40) break;
    match = pattern.exec(value);
  }

  return mentions;
}

export function stripComposerMentions(value: string, categories?: ComposerMention['category'][]): string {
  const allowed = categories ? new Set(categories) : null;
  const pattern = /(^|\s)@(file|agent|mcp):([^\s]+)/gi;
  const replaced = value.replace(pattern, (full, leading, rawCategory) => {
    const category = String(rawCategory || '').toLowerCase() as ComposerMention['category'];
    if (allowed && !allowed.has(category)) return full;
    return leading || '';
  });

  return replaced.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function appendRawQueryParams(params: URLSearchParams, raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed) return;
  const normalized = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
  const extra = new URLSearchParams(normalized);
  for (const [key, value] of extra.entries()) {
    if (!key.trim()) continue;
    params.set(key, value);
  }
}

export function summarizeDraftDiff(base: string, draft: string): { changed: boolean; changedLines: number } {
  if (base === draft) return { changed: false, changedLines: 0 };
  const baseLines = base.split('\n');
  const draftLines = draft.split('\n');
  const length = Math.max(baseLines.length, draftLines.length);
  let changedLines = 0;

  for (let index = 0; index < length; index += 1) {
    if ((baseLines[index] ?? '') !== (draftLines[index] ?? '')) {
      changedLines += 1;
    }
  }

  return { changed: true, changedLines };
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function extractString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

export function extractIdentifier(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const direct = extractString(record, ['requestID', 'id', 'sessionID']);
  if (direct) return direct;
  const nested = asRecord(record.request);
  if (!nested) return null;
  return extractString(nested, ['requestID', 'id', 'sessionID']);
}

export function collectRecords(
  value: unknown,
  depth = 0,
  bucket: Array<Record<string, unknown>> = []
): Array<Record<string, unknown>> {
  if (!value || depth > 4) return bucket;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecords(item, depth + 1, bucket);
      if (bucket.length >= 400) break;
    }
    return bucket;
  }

  const record = asRecord(value);
  if (!record) return bucket;

  bucket.push(record);
  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== 'object') continue;
    collectRecords(nested, depth + 1, bucket);
    if (bucket.length >= 400) break;
  }

  return bucket;
}

export function toStringList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    const strings: string[] = [];
    for (const item of value) {
      if (typeof item === 'string') {
        strings.push(item);
        continue;
      }
      const record = asRecord(item);
      if (!record) continue;
      const candidate = extractString(record, ['id', 'name', 'slug', 'title', 'value']);
      if (candidate) strings.push(candidate);
    }
    return strings;
  }
  return [];
}

export function findFirstString(value: unknown, keys: string[], depth = 0): string | null {
  if (!value || depth > 4) return null;
  const record = asRecord(value);
  if (!record) return null;

  const direct = extractString(record, keys);
  if (direct) return direct;

  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== 'object') continue;
    const found = findFirstString(nested, keys, depth + 1);
    if (found) return found;
  }

  return null;
}

export function findFirstStringArray(value: unknown, keys: string[], depth = 0): string[] {
  if (!value || depth > 4) return [];
  const record = asRecord(value);
  if (!record) return [];

  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      const values = candidate.filter((item): item is string => typeof item === 'string');
      if (values.length > 0) return values;
    }
  }

  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== 'object') continue;
    const values = findFirstStringArray(nested, keys, depth + 1);
    if (values.length > 0) return values;
  }

  return [];
}

export function findFirstArray(value: unknown, keys: string[], depth = 0): unknown[] {
  if (!value || depth > 4) return [];
  const record = asRecord(value);
  if (!record) return [];

  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
  }

  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== 'object') continue;
    const found = findFirstArray(nested, keys, depth + 1);
    if (found.length > 0) return found;
  }

  return [];
}

function trimInline(value: string, maxLength = 220): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function summarizeMetadataValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized ? trimInline(normalized, 220) : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const primitive = value.filter(
      (entry): entry is string | number | boolean => typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean'
    );
    if (primitive.length > 0) {
      return trimInline(primitive.slice(0, 6).map((entry) => String(entry)).join(', '), 220);
    }
    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }

  const record = asRecord(value);
  if (record) {
    const keys = Object.keys(record);
    if (keys.length === 0) return '{}';
    return `{${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ', ...' : ''}}`;
  }

  return null;
}

function summarizeMetadataLines(value: unknown): string[] {
  const record = asRecord(value);
  if (!record) return [];

  const lines: string[] = [];
  for (const [key, nested] of Object.entries(record)) {
    if (!key.trim()) continue;
    const summarized = summarizeMetadataValue(nested);
    if (!summarized) continue;
    lines.push(`${key}: ${summarized}`);
    if (lines.length >= 12) break;
  }

  return lines;
}

export function summarizeRuntimeService(value: unknown): { entries: number; active: number | null; sampleStatuses: string[] } {
  const records = collectRecords(value);
  if (records.length === 0) {
    return { entries: 0, active: null, sampleStatuses: [] };
  }

  const statuses = toUniqueStrings(
    collectStringFields(value, ['status', 'state', 'mode', 'phase', 'health']).filter((entry) => entry.length <= 40),
    8
  );
  let activeCount = 0;
  let observedBoolean = false;
  for (const record of records) {
    const flags = [record.running, record.connected, record.active, record.enabled];
    for (const flag of flags) {
      if (typeof flag === 'boolean') {
        observedBoolean = true;
        if (flag) activeCount += 1;
        break;
      }
    }
  }

  return {
    entries: records.length,
    active: observedBoolean ? activeCount : null,
    sampleStatuses: statuses
  };
}

export function summarizePermissionContext(value: unknown): PermissionContext {
  const record = asRecord(value);
  const toolRecord =
    asRecord(record?.tool) ||
    asRecord(record?.metadata && asRecord(record.metadata)?.tool) ||
    null;
  const metadata = record?.metadata;
  const patterns = toUniqueStrings(
    [
      ...findFirstStringArray(value, ['patterns']),
      ...(findFirstString(value, ['pattern']) ? [findFirstString(value, ['pattern']) as string] : [])
    ],
    24
  );
  const alwaysPatterns = toUniqueStrings(findFirstStringArray(value, ['always']), 24);

  return {
    sessionId: findFirstString(value, ['sessionID', 'sessionId', 'session_id']),
    permission: findFirstString(value, ['permission']),
    tool: findFirstString(value, ['tool', 'toolName']),
    command: findFirstString(value, ['command', 'action', 'path']),
    prompt: findFirstString(value, ['prompt', 'reason', 'message', 'title']),
    patterns,
    alwaysPatterns,
    metadataLines: summarizeMetadataLines(metadata),
    toolMessageId: toolRecord ? extractString(toolRecord, ['messageID', 'messageId']) : null,
    toolCallId: toolRecord ? extractString(toolRecord, ['callID', 'callId']) : null
  };
}

export function summarizeQuestionContext(value: unknown): QuestionContext {
  const questionRecords = findFirstArray(value, ['questions'])
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);

  const questions = questionRecords.map((questionRecord, index) => {
    const optionEntries = Array.isArray(questionRecord.options) ? questionRecord.options : [];
    const options = optionEntries
      .map((entry) => {
        if (typeof entry === 'string') {
          const label = entry.trim();
          if (!label) return null;
          return { label, description: null };
        }
        const optionRecord = asRecord(entry);
        if (!optionRecord) return null;
        const label = extractString(optionRecord, ['label', 'name', 'value', 'title']);
        if (!label) return null;
        return {
          label,
          description: extractString(optionRecord, ['description', 'detail', 'help'])
        };
      })
      .filter((entry): entry is { label: string; description: string | null } => entry !== null);

    const header = extractString(questionRecord, ['header', 'title', 'label']);
    const questionText = extractString(questionRecord, ['question', 'prompt', 'message', 'text']) || header || `Question ${index + 1}`;

    return {
      header,
      question: questionText,
      options,
      multiple: questionRecord.multiple === true,
      custom: questionRecord.custom !== false
    };
  });

  const rootRecord = asRecord(value);
  const toolRecord = asRecord(rootRecord?.tool);
  const title = questions[0]?.question || findFirstString(value, ['question', 'prompt', 'title', 'message', 'text']);

  return {
    sessionId: findFirstString(value, ['sessionID', 'sessionId', 'session_id']),
    title,
    options: toUniqueStrings(
      questions.flatMap((question) => question.options.map((option) => option.label)),
      24
    ),
    questions,
    toolMessageId: toolRecord ? extractString(toolRecord, ['messageID', 'messageId']) : null,
    toolCallId: toolRecord ? extractString(toolRecord, ['callID', 'callId']) : null
  };
}

export function buildQuestionReplyTemplate(
  context: QuestionContext,
  strategy: 'empty' | 'first-option' = 'empty'
): string {
  const answers = context.questions.map((question) => {
    if (strategy === 'first-option') {
      const first = question.options[0]?.label;
      return first ? [first] : [];
    }
    return [];
  });

  return prettyJson({ answers });
}

export function mergeModelOptions(models: ModelOption[]): ModelOption[] {
  const map = new Map<string, ModelOption>();

  for (const model of models) {
    const modelId = model.id.trim();
    if (!modelId) continue;
    const existing = map.get(modelId);
    if (!existing) {
      map.set(modelId, {
        id: modelId,
        label: model.label || modelId,
        variants: toUniqueStrings(model.variants, 64)
      });
      continue;
    }

    existing.variants = toUniqueStrings([...existing.variants, ...model.variants], 64);
    if (!existing.label && model.label) {
      existing.label = model.label;
    }
  }

  return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export function extractModelOptionsFromUnknown(value: unknown): ModelOption[] {
  const models: ModelOption[] = [];

  for (const entry of toStringList(value)) {
    const id = entry.trim();
    if (!id) continue;
    models.push({ id, label: id, variants: [] });
  }

  const records = collectRecords(value);
  for (const record of records) {
    const modelId = extractString(record, ['modelID', 'modelId']);
    const modelLabel = extractString(record, ['name', 'title', 'label']) ?? modelId;
    if (!modelId) continue;
    const variants = toUniqueStrings(
      [
        ...toStringList(record.variants),
        ...toStringList(record.variantIDs),
        ...toStringList(record.variantIds),
        ...toStringList(record.modelVariants)
      ],
      64
    );

    models.push({
      id: modelId,
      label: modelLabel || modelId,
      variants
    });
  }

  return mergeModelOptions(models);
}

export function extractProviderOptions(value: unknown): ProviderOption[] {
  const providerMap = new Map<string, ProviderOption>();

  const addProvider = (providerIdRaw: string, providerLabelRaw?: string | null, modelsRaw?: unknown): void => {
    const providerId = providerIdRaw.trim();
    if (!providerId) return;

    const providerLabel = providerLabelRaw?.trim() || providerId;
    const models = extractModelOptionsFromUnknown(modelsRaw);
    const existing = providerMap.get(providerId);

    if (!existing) {
      providerMap.set(providerId, {
        id: providerId,
        label: providerLabel,
        models
      });
      return;
    }

    existing.models = mergeModelOptions([...existing.models, ...models]);
    if (!existing.label && providerLabel) {
      existing.label = providerLabel;
    }
  };

  const rootRecord = asRecord(value);
  if (rootRecord) {
    const providerCollection = rootRecord.providers ?? rootRecord.list ?? rootRecord.items ?? rootRecord.data;
    if (providerCollection !== undefined) {
      const providerItems = Array.isArray(providerCollection) ? providerCollection : [providerCollection];
      for (const providerEntry of providerItems) {
        const providerRecord = asRecord(providerEntry);
        if (!providerRecord) continue;
        const providerId = extractString(providerRecord, ['id', 'providerID', 'providerId', 'slug', 'name']);
        if (!providerId) continue;
        addProvider(providerId, extractString(providerRecord, ['name', 'title', 'label']), providerRecord.models);
      }
    }

    for (const [key, nestedValue] of Object.entries(rootRecord)) {
      if (key === 'providers' || key === 'list' || key === 'items' || key === 'data') continue;
      const nestedRecord = asRecord(nestedValue);
      if (!nestedRecord) continue;
      if (!nestedRecord.models && !nestedRecord.modelIDs && !nestedRecord.modelId && !nestedRecord.modelID) continue;
      const providerId = extractString(nestedRecord, ['id', 'providerID', 'providerId', 'slug']) ?? key;
      addProvider(providerId, extractString(nestedRecord, ['name', 'title', 'label']) ?? key, nestedRecord.models ?? nestedRecord.modelIDs);
    }
  }

  const records = collectRecords(value);
  for (const record of records) {
    const providerId = extractString(record, ['providerID', 'providerId']);
    if (!providerId) continue;
    addProvider(
      providerId,
      extractString(record, ['providerName', 'name', 'title', 'label']),
      record.models ?? record.modelIDs ?? record.modelId
    );
  }

  if (providerMap.size === 0) {
    const fallbackIds = toUniqueStrings(
      collectStringFields(value, ['providerID', 'providerId', 'provider', 'id', 'name', 'slug']).filter((entry) => entry.length <= 80),
      40
    );
    for (const providerId of fallbackIds) {
      addProvider(providerId, providerId, undefined);
    }
  }

  return Array.from(providerMap.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export function extractMcpServers(value: unknown): McpServerOption[] {
  const map = new Map<string, McpServerOption>();

  const addServer = (nameRaw: string, input: { label?: string | null; status?: string | null; connected?: boolean | null; resources?: unknown }): void => {
    const name = nameRaw.trim();
    if (!name) return;

    const label = input.label?.trim() || name;
    const resources = toUniqueStrings(toStringList(input.resources), 80);
    const existing = map.get(name);
    if (!existing) {
      map.set(name, {
        name,
        label,
        status: input.status ?? null,
        connected: typeof input.connected === 'boolean' ? input.connected : null,
        resources
      });
      return;
    }

    existing.resources = toUniqueStrings([...existing.resources, ...resources], 80);
    if (!existing.status && input.status) existing.status = input.status;
    if (existing.connected === null && typeof input.connected === 'boolean') {
      existing.connected = input.connected;
    }
    if (!existing.label && label) existing.label = label;
  };

  const rootRecord = asRecord(value);
  if (rootRecord) {
    const serverCollection = rootRecord.servers ?? rootRecord.list ?? rootRecord.items ?? rootRecord.data;
    if (serverCollection !== undefined) {
      const serverItems = Array.isArray(serverCollection) ? serverCollection : [serverCollection];
      for (const serverEntry of serverItems) {
        const serverRecord = asRecord(serverEntry);
        if (!serverRecord) continue;
        const serverName = extractString(serverRecord, ['name', 'id', 'server']);
        if (!serverName) continue;
        const status = extractString(serverRecord, ['status', 'state']);
        const connected =
          typeof serverRecord.connected === 'boolean'
            ? serverRecord.connected
            : typeof serverRecord.active === 'boolean'
              ? serverRecord.active
              : typeof serverRecord.enabled === 'boolean'
                ? serverRecord.enabled
                : null;
        addServer(serverName, {
          label: extractString(serverRecord, ['title', 'label', 'name']),
          status,
          connected,
          resources: serverRecord.resources
        });
      }
    }

    for (const [key, nestedValue] of Object.entries(rootRecord)) {
      if (key === 'servers' || key === 'list' || key === 'items' || key === 'data') continue;
      const nestedRecord = asRecord(nestedValue);
      if (!nestedRecord) continue;
      if (!nestedRecord.resources && !nestedRecord.status && !nestedRecord.state) continue;
      const serverName = extractString(nestedRecord, ['name', 'id', 'server']) ?? key;
      const status = extractString(nestedRecord, ['status', 'state']);
      const connected =
        typeof nestedRecord.connected === 'boolean'
          ? nestedRecord.connected
          : typeof nestedRecord.active === 'boolean'
            ? nestedRecord.active
            : typeof nestedRecord.enabled === 'boolean'
              ? nestedRecord.enabled
              : null;
      addServer(serverName, {
        label: extractString(nestedRecord, ['title', 'label']) ?? key,
        status,
        connected,
        resources: nestedRecord.resources
      });
    }
  }

  const records = collectRecords(value);
  for (const record of records) {
    const hasMcpShape = 'resources' in record || 'status' in record || 'state' in record || 'connected' in record;
    if (!hasMcpShape) continue;
    const serverName = extractString(record, ['name', 'id', 'server']);
    if (!serverName) continue;
    const status = extractString(record, ['status', 'state']);
    const connected =
      typeof record.connected === 'boolean'
        ? record.connected
        : typeof record.active === 'boolean'
          ? record.active
          : typeof record.enabled === 'boolean'
            ? record.enabled
            : null;

    addServer(serverName, {
      label: extractString(record, ['title', 'label', 'name']),
      status,
      connected,
      resources: record.resources
    });
  }

  return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export function extractPtySessions(value: unknown): OpenCodePtySession[] {
  const rootArray = Array.isArray(value)
    ? value
    : Array.isArray(asRecord(value)?.items)
      ? (asRecord(value)?.items as unknown[])
      : Array.isArray(asRecord(value)?.data)
        ? (asRecord(value)?.data as unknown[])
        : [];

  const sessions: OpenCodePtySession[] = [];
  const seen = new Set<string>();

  for (const entry of rootArray) {
    const record = asRecord(entry);
    if (!record) continue;

    const id = extractString(record, ['id', 'ptyID', 'ptyId']);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const title = extractString(record, ['title', 'name']) ?? id;
    const command = extractString(record, ['command']) ?? '';
    const cwd = extractString(record, ['cwd', 'directory']) ?? '';
    const status = extractString(record, ['status', 'state']) ?? 'unknown';
    const args = toStringList(record.args);
    const pid = extractNumber(record.pid);

    sessions.push({
      id,
      title,
      command,
      args,
      cwd,
      status,
      pid
    });
  }

  sessions.sort((left, right) => left.title.localeCompare(right.title));
  return sessions;
}

export function parseEventJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function findSessionId(value: unknown, depth = 0): string | null {
  if (depth > 4) return null;
  const record = asRecord(value);
  if (!record) return null;

  const direct = extractString(record, ['sessionId', 'sessionID', 'session_id', 'id', 'session']);
  if (direct && direct.startsWith('ses_')) return direct;

  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== 'object') continue;
    const found = findSessionId(nested, depth + 1);
    if (found) return found;
  }

  return null;
}

export function resolveEventRefreshScope(eventType: string): EventRefreshScope {
  const normalized = eventType.trim().toLowerCase();
  if (!normalized || EVENT_REFRESH_NONE.has(normalized)) {
    return 'none';
  }

  if (
    EVENT_REFRESH_MONITOR_ONLY_TYPES.has(normalized) ||
    EVENT_REFRESH_MONITOR_ONLY_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    return 'monitor';
  }

  if (
    EVENT_REFRESH_MONITOR_AND_SESSION_TYPES.has(normalized) ||
    EVENT_REFRESH_MONITOR_AND_SESSION_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    return 'monitor-session';
  }

  return 'monitor-session';
}

export function extractNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function joinUrlPath(basePath: string, nextPath: string): string {
  const left = basePath.replace(/\/+$/, '');
  const right = nextPath.replace(/^\/+/, '');
  if (!left && !right) return '/';
  if (!left) return `/${right}`;
  if (!right) return left;
  return `${left}/${right}`;
}

export function normalizeSocketHost(host: string): string {
  const trimmed = host.trim();
  if (trimmed && trimmed !== '0.0.0.0' && trimmed !== '::' && trimmed !== '[::]') {
    return trimmed;
  }
  if (typeof window !== 'undefined' && window.location.hostname.trim()) {
    return window.location.hostname;
  }
  return '127.0.0.1';
}

export function resolvePtySocketUrl(input: {
  ptyId: string;
  cursor: number;
  apiUrl: string | null;
  host: string;
  port: number | null;
}): string | null {
  const encodedPtyId = encodeURIComponent(input.ptyId);
  const cursor = Number.isFinite(input.cursor) ? Math.max(-1, Math.floor(input.cursor)) : 0;

  if (input.apiUrl?.trim()) {
    try {
      const parsed = new URL(input.apiUrl);
      parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      parsed.pathname = joinUrlPath(parsed.pathname, `/pty/${encodedPtyId}/connect`);
      parsed.search = '';
      parsed.searchParams.set('cursor', String(cursor));
      return parsed.toString();
    } catch {
      // Fall through to host/port derivation.
    }
  }

  if (!input.host || typeof input.port !== 'number' || !Number.isFinite(input.port)) {
    return null;
  }

  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const resolvedHost = normalizeSocketHost(input.host);

  try {
    const fallback = new URL(`${protocol}//${resolvedHost}:${Math.floor(input.port)}`);
    fallback.pathname = `/pty/${encodedPtyId}/connect`;
    fallback.searchParams.set('cursor', String(cursor));
    return fallback.toString();
  } catch {
    return null;
  }
}

export function decodePtyFrame(buffer: ArrayBuffer): { text: string | null; cursor: number | null } {
  const bytes = new Uint8Array(buffer);
  if (bytes.length > 1 && bytes[0] === 0) {
    try {
      const raw = new TextDecoder().decode(bytes.slice(1));
      const parsed = parseEventJson(raw);
      const record = asRecord(parsed);
      return {
        text: null,
        cursor: extractNumber(record?.cursor)
      };
    } catch {
      return { text: null, cursor: null };
    }
  }

  return {
    text: new TextDecoder().decode(bytes),
    cursor: null
  };
}

export function summarizeTodoItems(value: unknown): { total: number; done: number; open: number } {
  const stack: unknown[] = Array.isArray(value) ? value : [value];
  let total = 0;
  let done = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    if (Array.isArray(current)) {
      for (const entry of current) stack.push(entry);
      continue;
    }

    const record = asRecord(current);
    if (!record) continue;

    const looksLikeTodo =
      typeof record.title === 'string' ||
      typeof record.text === 'string' ||
      typeof record.content === 'string' ||
      typeof record.status === 'string' ||
      typeof record.done === 'boolean';

    if (looksLikeTodo) {
      total += 1;
      const status = typeof record.status === 'string' ? record.status.toLowerCase() : '';
      const state = typeof record.state === 'string' ? record.state.toLowerCase() : '';
      const completed =
        record.done === true ||
        status === 'done' ||
        status === 'completed' ||
        status === 'complete' ||
        state === 'done' ||
        state === 'completed' ||
        state === 'complete';
      if (completed) done += 1;
    }

    for (const nested of Object.values(record)) {
      if (nested && typeof nested === 'object') {
        stack.push(nested);
      }
    }
  }

  return {
    total,
    done,
    open: Math.max(0, total - done)
  };
}

export function summarizeDiff(value: unknown): { files: number | null; additions: number | null; deletions: number | null } {
  const record = asRecord(value);
  if (!record) {
    return { files: null, additions: null, deletions: null };
  }

  const summary = asRecord(record.summary) ?? record;
  const files = extractNumber(summary.files ?? summary.filesChanged ?? summary.fileCount);
  const additions = extractNumber(summary.additions ?? summary.added ?? summary.insertions);
  const deletions = extractNumber(summary.deletions ?? summary.removed ?? summary.removals);

  return { files, additions, deletions };
}

export function summarizeSessionUsage(value: unknown): { context: number | null; cost: number | null } {
  const record = asRecord(value);
  if (!record) return { context: null, cost: null };

  const context =
    extractNumber(record.contextTokens) ??
    extractNumber(record.context) ??
    extractNumber(record.promptTokens) ??
    extractNumber(record.tokens);
  const cost = extractNumber(record.costUsd) ?? extractNumber(record.cost) ?? extractNumber(record.estimatedCostUsd);
  return { context, cost };
}

export function resolveSessionPath(templatePath: string, sessionId: string): string {
  return templatePath.replaceAll('{sessionID}', encodeURIComponent(sessionId));
}

export function formatDateTime(value: string | null): string {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString();
}

export function formatRelativeTime(value: string | null): string {
  if (!value) return 'unknown';

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'unknown';

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const absoluteSeconds = Math.abs(seconds);

  if (absoluteSeconds < 60) return formatter.format(seconds, 'second');

  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');

  const days = Math.round(hours / 24);
  return formatter.format(days, 'day');
}

export function roleTone(role: OpenCodeSessionMessage['role']): string {
  if (role === 'assistant') return 'border-[var(--info)]/40 bg-[var(--accent-soft)] text-[var(--info)]';
  if (role === 'user') return 'border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]';
  if (role === 'system') return 'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]';
  if (role === 'tool') return 'border-[var(--border-selected)]/45 bg-[var(--accent-soft)] text-[var(--accent)]';
  return 'border-[var(--border-weak)] bg-[var(--surface-base)] text-[var(--text-weak)]';
}

export function toThemeStyle(theme: ThemePalette): ThemeStyle {
  return {
    '--background': theme.background,
    '--background-weak': theme.backgroundWeak,
    '--background-stronger': theme.backgroundStronger,
    '--surface-base': theme.surfaceBase,
    '--surface-raised': theme.surfaceRaised,
    '--surface-hover': theme.surfaceHover,
    '--surface-inset': theme.surfaceInset,
    '--border-base': theme.borderBase,
    '--border-weak': theme.borderWeak,
    '--border-selected': theme.borderSelected,
    '--text-base': theme.textBase,
    '--text-weak': theme.textWeak,
    '--text-weaker': theme.textWeaker,
    '--text-strong': theme.textStrong,
    '--text-inverse': theme.textInverse,
    '--button-primary': theme.buttonPrimary,
    '--button-primary-hover': theme.buttonPrimaryHover,
    '--button-primary-foreground': theme.buttonPrimaryForeground,
    '--button-secondary': theme.buttonSecondary,
    '--button-secondary-hover': theme.buttonSecondaryHover,
    '--input-bg': theme.inputBg,
    '--accent': theme.accent,
    '--accent-soft': theme.accentSoft,
    '--success': theme.success,
    '--success-soft': theme.successSoft,
    '--success-border': theme.successBorder,
    '--warning': theme.warning,
    '--warning-soft': theme.warningSoft,
    '--warning-border': theme.warningBorder,
    '--critical': theme.critical,
    '--critical-soft': theme.criticalSoft,
    '--critical-border': theme.criticalBorder,
    '--info': theme.info,
    '--gradient-a': theme.gradientA,
    '--gradient-b': theme.gradientB,
    '--gradient-c': theme.gradientC,
    '--shadow-xs-border': theme.shadowXsBorder
  };
}
