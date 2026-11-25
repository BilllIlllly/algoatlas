import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  getLuoguCookieStatus,
  saveLuoguCookie,
} from '../api.js';

export function LuoguCookieModal({ open, onClose, onSaved }) {
  const [cookie, setCookie] = useState('');
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();
    setCookie('');
    setError('');
    setMessage('');
    setLoadingStatus(true);

    getLuoguCookieStatus({ signal: controller.signal })
      .then((result) => setStatus(result))
      .catch(() => setStatus(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStatus(false);
      });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('modal-open');

    return () => {
      controller.abort();
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [open, onClose]);

  if (!open) return null;

  const save = async (event) => {
    event.preventDefault();
    if (!cookie.trim()) {
      setError('请粘贴洛谷 Cookie。');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await saveLuoguCookie(cookie.trim());
      setStatus(result);
      setCookie('');
      setMessage('Cookie 已保存，正在重新同步洛谷账号…');
      await onSaved?.();
    } catch (saveError) {
      setError(saveError.message || 'Cookie 保存失败。');
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await saveLuoguCookie('');
      setStatus(result);
      setCookie('');
      setMessage('已清除 Cookie。');
      await onSaved?.();
    } catch (clearError) {
      setError(clearError.message || 'Cookie 清除失败。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-layer" role="presentation" onMouseDown={onClose}>
      <div
        className="account-modal cookie-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-modal-title"
      >
        <div className="account-modal__head">
          <div>
            <span className="modal-kicker">LUOGU SESSION</span>
            <h2 id="cookie-modal-title">洛谷 Cookie</h2>
            <p>用登录态读取自己的练习数据，并应对题单隐藏、限流等情况。</p>
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

        <div className="cookie-status">
          <span className={`cookie-status__icon${status?.configured ? ' is-on' : ''}`}>
            {status?.configured ? (
              <ShieldCheck size={17} />
            ) : (
              <KeyRound size={17} />
            )}
          </span>
          <div>
            <strong>
              {loadingStatus
                ? '正在读取状态…'
                : status?.configured
                  ? '已配置 Cookie'
                  : '尚未配置 Cookie'}
            </strong>
            <p>
              {status?.configured
                ? '服务端内存中已有登录态，重启服务后需要重新填写。'
                : '保存后以你的洛谷账号登录态读取练习数据。'}
            </p>
          </div>
          {status?.configured ? (
            <CheckCircle2 size={16} className="cookie-status__check" />
          ) : null}
        </div>

        <form onSubmit={save}>
          <label className="cookie-field">
            <span>Cookie 请求头</span>
            <textarea
              value={cookie}
              onChange={(event) => setCookie(event.target.value)}
              spellCheck={false}
              placeholder="__client_id=...; _uid=...; 或者直接粘贴完整的 Cookie: ..."
              rows={4}
            />
          </label>

          <p className="cookie-hint">
            在已登录洛谷的浏览器中打开开发者工具 → Network → 任意请求 →
            复制请求头里的 Cookie。Cookie 只保存在本机 AlgoAtlas
            服务内存中，重启服务后重新填写即可。
          </p>

          {error ? <div className="form-error">{error}</div> : null}
          {message ? (
            <div className="form-success">
              <CheckCircle2 size={13} />
              {message}
            </div>
          ) : null}

          <div className="cookie-actions">
            <button
              type="button"
              className="text-button cookie-clear"
              onClick={clear}
              disabled={saving || !status?.configured}
            >
              <Trash2 size={13} />
              清除 Cookie
            </button>
            <div>
              <button
                type="button"
                className="ghost-button"
                onClick={onClose}
              >
                取消
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={15} className="spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                保存并重试洛谷同步
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
