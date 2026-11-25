import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import {
  LUOGU_TIERS,
  PLATFORMS,
  PLATFORM_ORDER,
  formatNumber,
} from '../lib/platforms.js';
import { manualProblemKey } from '../lib/manual.js';
import { PlatformMark } from './PlatformMark.jsx';

function difficultyLabel(platform, difficulty) {
  if (difficulty == null) return '未定';
  if (platform === 'luogu') {
    return (
      LUOGU_TIERS.find((tier) => Number(tier.value) === Number(difficulty))
        ?.label || '未定'
    );
  }
  return String(difficulty);
}

export function ManualProblemModal({
  open,
  defaultPlatform = 'codeforces',
  manualProblems,
  onClose,
  onAdd,
  onRemove,
}) {
  const [platform, setPlatform] = useState(defaultPlatform);
  const [problemId, setProblemId] = useState('');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [url, setUrl] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const meta = PLATFORMS[platform];
  const allCount = useMemo(
    () =>
      PLATFORM_ORDER.reduce(
        (total, item) => total + (manualProblems?.[item]?.length || 0),
        0,
      ),
    [manualProblems],
  );

  useEffect(() => {
    if (!open) return;
    setPlatform(defaultPlatform);
    setProblemId('');
    setTitle('');
    setDifficulty('');
    setUrl('');
    setFeedback('');
    setError('');
  }, [open, defaultPlatform]);

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

  const switchPlatform = (nextPlatform) => {
    setPlatform(nextPlatform);
    setProblemId('');
    setTitle('');
    setDifficulty('');
    setUrl('');
    setFeedback('');
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    const id = problemId.trim();
    if (!id) {
      setError('请先填写题目编号。');
      return;
    }

    onAdd(platform, {
      id,
      title: title.trim() || id,
      difficulty: difficulty === '' ? null : Number(difficulty),
      url: url.trim() || undefined,
    });

    setFeedback(`已添加 ${id}${title.trim() ? ` · ${title.trim()}` : ''}`);
    setError('');
    setProblemId('');
    setTitle('');
    setDifficulty('');
    setUrl('');
  };

  const existingGroups = PLATFORM_ORDER.map((item) => ({
    platform: item,
    entries: manualProblems?.[item] || [],
  })).filter((group) => group.entries.length);

  return (
    <div className="modal-layer" role="presentation" onMouseDown={onClose}>
      <div
        className="account-modal manual-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-modal-title"
      >
        <div className="account-modal__head">
          <div>
            <span className="modal-kicker">MANUAL ENTRY</span>
            <h2 id="manual-modal-title">手动补题</h2>
            <p>补录自动同步遗漏的 AC，记录会直接并进你的题迹。</p>
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

        <div className="manual-platform-tabs" role="tablist">
          {PLATFORM_ORDER.map((item) => (
            <button
              type="button"
              key={item}
              className={item === platform ? 'is-active' : ''}
              onClick={() => switchPlatform(item)}
              role="tab"
              aria-selected={item === platform}
            >
              <PlatformMark platform={item} size="xs" />
              {PLATFORMS[item].name}
              {manualProblems?.[item]?.length ? (
                <span>{manualProblems[item].length}</span>
              ) : null}
            </button>
          ))}
        </div>

        <form className="manual-form" onSubmit={submit}>
          <div className="manual-form__row">
            <label className="manual-field manual-field--id">
              <span>题目编号</span>
              <input
                value={problemId}
                onChange={(event) => setProblemId(event.target.value)}
                placeholder={
                  platform === 'codeforces'
                    ? '例如 1920E'
                    : platform === 'luogu'
                      ? '例如 P1001'
                      : '例如 abc300_a'
                }
                autoFocus
              />
            </label>

            <label className="manual-field">
              <span>题目名称 <em>可选</em></span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="不填则使用题目编号"
              />
            </label>
          </div>

          <div className="manual-form__row">
            <label className="manual-field">
              <span>
                难度
                {platform === 'luogu' ? (
                  <em>洛谷难度</em>
                ) : (
                  <em>Rating / Difficulty</em>
                )}
              </span>
              {platform === 'luogu' ? (
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                >
                  <option value="">未定 / 暂无评定</option>
                  {LUOGU_TIERS.map((tier) => (
                    <option value={tier.value} key={tier.key}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                  placeholder={platform === 'codeforces' ? '例如 2100' : '例如 1800'}
                  min="0"
                  step="100"
                />
              )}
            </label>

            <label className="manual-field">
              <span>题目链接 <em>可选</em></span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="默认根据题号生成"
              />
            </label>
          </div>

          {error ? <div className="form-error">{error}</div> : null}
          {feedback ? (
            <div className="form-success">
              <Check size={13} />
              {feedback}
            </div>
          ) : null}

          <div className="manual-form__foot">
            <span>
              当前为 {meta.name} · 已记录 {formatNumber(manualProblems?.[platform]?.length || 0)} 题
            </span>
            <button type="submit" className="primary-button">
              <Plus size={15} />
              添加补录
            </button>
          </div>
        </form>

        {existingGroups.length ? (
          <div className="manual-existing">
            <div className="manual-existing__head">
              <strong>已手动补录</strong>
              <span>{allCount} 题</span>
            </div>
            <div className="manual-existing__scroll">
              {existingGroups.map((group) => (
                <div className="manual-existing__group" key={group.platform}>
                  <div className="manual-existing__platform">
                    <PlatformMark platform={group.platform} size="xs" />
                    {PLATFORMS[group.platform].name}
                    <span>{group.entries.length}</span>
                  </div>
                  {group.entries.map((entry) => {
                    const key = manualProblemKey(group.platform, entry);
                    return (
                      <div className="manual-record" key={key}>
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noreferrer"
                          className="manual-record__main"
                        >
                          <span>{entry.id}</span>
                          <strong>{entry.title}</strong>
                          <em>
                            {difficultyLabel(
                              group.platform,
                              entry.difficulty,
                            )}
                          </em>
                        </a>
                        <button
                          type="button"
                          className="manual-record__remove"
                          onClick={() =>
                            onRemove(group.platform, key)
                          }
                          aria-label={`移除 ${entry.id}`}
                          title="移除这条手动记录"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
