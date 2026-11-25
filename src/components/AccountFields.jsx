import { Check, Plus, X } from 'lucide-react';
import { PLATFORM_ORDER, PLATFORMS } from '../lib/platforms.js';
import { PlatformMark } from './PlatformMark.jsx';

export function AccountFields({ values, onChange, compact = false }) {
  return (
    <div className={`account-fields${compact ? ' account-fields--compact' : ''}`}>
      {PLATFORM_ORDER.map((platform) => {
        const meta = PLATFORMS[platform];
        const handles = Array.isArray(values[platform]) ? values[platform] : [];
        const rows = handles.length ? handles : [''];
        const filledCount = handles.filter((handle) => handle.trim()).length;

        const setRows = (next) => onChange(platform, next);
        const updateRow = (index, value) => {
          const next = [...rows];
          next[index] = value;
          setRows(next);
        };
        const removeRow = (index) => {
          const next = rows.filter((_, rowIndex) => rowIndex !== index);
          setRows(next.length ? next : ['']);
        };
        const addRow = () => setRows([...rows, '']);

        return (
          <fieldset
            className={`account-group account-group--${platform}${
              filledCount ? ' has-value' : ''
            }`}
            key={platform}
          >
            <div className="account-group__head">
              <PlatformMark platform={platform} size={compact ? 'sm' : 'md'} />
              <div className="account-group__title">
                <strong>{meta.name}</strong>
                <span>{meta.handleLabel}</span>
              </div>
              <span className="account-group__count">
                {filledCount ? `${filledCount} 个账号` : '可留空'}
              </span>
            </div>

            <div className="account-group__rows">
              {rows.map((value, index) => (
                <div
                  className={`account-input${value.trim() ? ' has-value' : ''}`}
                  key={index}
                >
                  <span className="account-input__index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <input
                    type="text"
                    value={value}
                    placeholder={meta.placeholder}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-label={`${meta.name}账号 ${index + 1}`}
                    onChange={(event) => updateRow(index, event.target.value)}
                  />
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      className="account-input__remove"
                      onClick={() => removeRow(index)}
                      aria-label={`移除第 ${index + 1} 个${meta.name}账号`}
                    >
                      <X size={13} />
                    </button>
                  ) : (
                    <span className="account-input__status" aria-hidden="true">
                      {value.trim() ? <Check size={13} strokeWidth={2.6} /> : null}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="account-group__add"
              onClick={addRow}
            >
              <Plus size={12} />
              再添加一个账号
            </button>
          </fieldset>
        );
      })}
    </div>
  );
}
