import { humanizeLabel, formatDate } from '../utils/credentialHelpers';

interface FieldRendererProps {
  label: string;
  value: unknown;
  depth?: number;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T|\s|$)/;
const IMAGE_FIELD_KEYWORDS = ['portrait', 'photo', 'image', 'picture', 'face', 'thumbnail'];

function isImageField(label: string, value: string): boolean {
  const lowerLabel = label.toLowerCase();
  return (
    value.startsWith('data:image/') ||
    (value.startsWith('https://') && IMAGE_FIELD_KEYWORDS.some((k) => lowerLabel.includes(k))) ||
    IMAGE_FIELD_KEYWORDS.some((k) => lowerLabel.includes(k) && value.length > 50)
  );
}

function renderValue(label: string, value: unknown, depth: number): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-white/40 italic">—</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-400' : 'text-red-400'}>
        {value ? '✓ Yes' : '✗ No'}
      </span>
    );
  }

  if (typeof value === 'number') {
    return <span>{value.toLocaleString()}</span>;
  }

  if (typeof value === 'string') {
    // ISO date detection
    if (ISO_DATE_REGEX.test(value)) {
      return <span>{formatDate(value)}</span>;
    }

    // Image detection
    if (isImageField(label, value)) {
      const src = value.startsWith('data:') ? value : value;
      return (
        <img
          src={src}
          alt={label}
          className="w-24 h-32 object-cover rounded-lg border border-white/10 mt-1"
          loading="lazy"
        />
      );
    }

    // Long string — break word
    if (value.length > 60) {
      return <span className="break-all text-sm">{value}</span>;
    }

    return <span>{value}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside space-y-1 text-sm">
        {value.map((item, i) => (
          <li key={i} className="text-white/80">
            {typeof item === 'object' ? (
              <FieldRenderer label="" value={item} depth={depth + 1} />
            ) : (
              String(item)
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className={`space-y-2 ${depth > 0 ? 'pl-3 border-l border-white/10' : ''}`}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <FieldRenderer key={k} label={humanizeLabel(k)} value={v} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

export default function FieldRenderer({ label, value, depth = 0 }: FieldRendererProps) {
  return (
    <div className={`${depth === 0 ? 'py-3 border-b border-white/5 last:border-0' : 'py-1.5'}`}>
      {label && (
        <p className="text-xs font-medium text-white/50 mb-1 uppercase tracking-wide">{label}</p>
      )}
      <div className="text-sm text-white/90">{renderValue(label, value, depth)}</div>
    </div>
  );
}
