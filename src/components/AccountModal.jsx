import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { hasAnyAccount, normalizeAccounts } from '../lib/accounts.js';
import { AccountFields } from './AccountFields.jsx';

export function AccountModal({ open, accounts, onClose, onSave, onClear, saving }) {
  const [values, setValues] = useState(() => normalizeAccounts(accounts));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValues(normalizeAccounts(accounts));
    setError('');
  }, [open, accounts]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('modal-open');

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [open, onClose]);

  if (!open) return null;

  const update = (platform, value) => {
    setValues((prev) => ({ ...prev, [platform]: value }));
    if (error) setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    if (!hasAnyAccount(values)) {
      setError('至少填写一个账号。如需重新开始，请使用下方的「清空全部」。');
      return;
    }
    onSave(normalizeAccounts(values));
  };

  return (
    <div className="modal-layer" role="presentation" onMouseDown={onClose}>
      <form
        className="account-modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
      >
        <div className="account-modal__head">
          <div>
            <span className="modal-kicker">TRACKING ACCOUNTS</span>
            <h2 id="account-modal-title">管理追踪账号</h2>
            <p>每个平台可绑定多个账号，修改后会立刻重新同步发生变化的平台。</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <AccountFields values={values} onChange={update} compact />

        {error ? <div className="form-error">{error}</div> : null}

        <div className="account-modal__foot">
          <div>
            <p>
              同平台多账号会自动合并并按题目去重。
              <br />
              洛谷账号可以在 Cookie 设置中补充登录态。
            </p>
            {onClear ? (
              <button
                type="button"
                className="clear-accounts"
                onClick={onClear}
              >
                清空全部账号
              </button>
            ) : null}
          </div>
          <div className="account-modal__actions">
            <button type="button" className="ghost-button" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? <RefreshCw className="spin" size={16} /> : null}
              保存并同步
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
