import { useState } from 'react';
import { ArrowRight, Orbit, RefreshCw } from 'lucide-react';
import { hasAnyAccount, normalizeAccounts } from '../lib/accounts.js';
import { AccountFields } from './AccountFields.jsx';

const FEATURES = [
  {
    title: '三站多号',
    text: '同一平台支持多个账号，主号和小号的题迹会自动合并去重。',
  },
  {
    title: '难度一眼可见',
    text: '洛谷红绿蓝紫黑、CF Rating、AtCoder Difficulty 原生配色。',
  },
  {
    title: '自动同步',
    text: '只需填写 Handle，已通过题目、比赛归档和统计自动生成。',
  },
];

export function Onboarding({ onSave, saving }) {
  const [values, setValues] = useState(normalizeAccounts());
  const [error, setError] = useState('');
  const canSubmit = hasAnyAccount(values) && !saving;

  const update = (platform, value) => {
    setValues((prev) => ({ ...prev, [platform]: value }));
    if (error) setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    if (!hasAnyAccount(values)) {
      setError('至少填写一个账号，才能开始生成题迹。');
      return;
    }
    onSave(normalizeAccounts(values));
  };

  return (
    <section className="onboarding">
      <div className="onboarding__intro">
        <div className="eyebrow">
          <Orbit size={15} />
          YOUR ALGORITHM ATLAS
        </div>
        <h1>
          把散落的 AC，
          <br />
          收进<span>同一张地图。</span>
        </h1>
        <p className="onboarding__lede">
          输入你在各个 OJ 的用户名，AlgoAtlas 会自动读取已通过题目，
          用难度与比赛重新整理你的算法旅程。
        </p>

        <div className="onboarding__features">
          {FEATURES.map((feature) => (
            <div className="onboarding-feature" key={feature.title}>
              <span className="onboarding-feature__index" />
              <div>
                <strong>{feature.title}</strong>
                <p>{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form className="onboarding-form" onSubmit={submit}>
        <div className="onboarding-form__top">
          <span className="onboarding-form__badge">
            <span />
            FIRST SYNC
          </span>
          <h2>连接你的账号</h2>
          <p>每个平台都可以添加多个账号，题迹会自动合并去重。</p>
        </div>

        <AccountFields values={values} onChange={update} />

        {error ? <div className="form-error">{error}</div> : null}

        <button className="primary-button onboarding-form__submit" disabled={!canSubmit}>
          {saving ? (
            <>
              <RefreshCw className="spin" size={17} />
              正在读取题迹…
            </>
          ) : (
            <>
              开始同步
              <ArrowRight size={17} />
            </>
          )}
        </button>


      </form>
    </section>
  );
}
