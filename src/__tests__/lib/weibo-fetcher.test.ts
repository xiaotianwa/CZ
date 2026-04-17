import { describe, it, expect } from 'vitest';
import {
  isOriginalPost,
  stripHtml,
  parseCreatedAt,
} from '@/lib/weibo/fetcher';

describe('stripHtml', () => {
  it('去除基础 HTML 标签', () => {
    expect(stripHtml('<p>hello</p>')).toBe('hello');
  });

  it('保留换行（<br> 转 \\n）', () => {
    expect(stripHtml('line1<br>line2<br/>line3')).toBe('line1\nline2\nline3');
  });

  it('保留 img 的 alt 属性（emoji 表情）', () => {
    expect(stripHtml('哈哈<img alt="[笑cry]" src="x.png">')).toBe('哈哈[笑cry]');
  });

  it('HTML 实体解码', () => {
    expect(stripHtml('a&amp;b&nbsp;c&quot;d&#39;e')).toBe('a&b c"d\'e');
  });

  it('空输入返回空串', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('parseCreatedAt', () => {
  it('微博 created_at 格式（带周几前缀）可正确解析', () => {
    const d = parseCreatedAt('Tue Apr 16 12:00:00 +0800 2026');
    expect(d.getTime()).toBeGreaterThan(0);
    expect(isNaN(d.getTime())).toBe(false);
  });

  it('ISO 格式可正确解析', () => {
    const d = parseCreatedAt('2026-04-16T12:00:00Z');
    expect(d.toISOString().startsWith('2026-04-16T12:00:00')).toBe(true);
  });

  it('空值返回当前时间（不报错）', () => {
    const d = parseCreatedAt(undefined);
    expect(d).toBeInstanceOf(Date);
  });
});

describe('isOriginalPost（原创过滤）', () => {
  it('普通原创微博 → 原创', () => {
    const r = isOriginalPost({ text: '今天天气真好' });
    expect(r.original).toBe(true);
    expect(r.reason).toBeUndefined();
  });

  it('存在 retweeted_status → 非原创', () => {
    const r = isOriginalPost({
      text: '我的评论',
      retweeted_status: { id: 'x' },
    });
    expect(r.original).toBe(false);
    expect(r.reason).toContain('retweeted_status');
  });

  it('以"转发"开头 → 非原创', () => {
    const r = isOriginalPost({ text: '转发微博', text_raw: '转发微博' });
    expect(r.original).toBe(false);
    expect(r.reason).toContain('转发');
  });

  it('包含 //@ → 非原创（转发串联）', () => {
    const r = isOriginalPost({
      text: '说得好 //@someone: 赞同',
      text_raw: '说得好 //@someone: 赞同',
    });
    expect(r.original).toBe(false);
    expect(r.reason).toContain('//@');
  });

  it('文字含"转发了某条微博"但无 //@ 且无 retweeted_status 仍过滤', () => {
    const r = isOriginalPost({
      text: '转发了微博',
      text_raw: '转发了微博',
    });
    expect(r.original).toBe(false);
  });

  it('HTML 文本中含 //@ → 非原创', () => {
    const r = isOriginalPost({
      text: '<a>@user</a> //@another: 附议',
    });
    expect(r.original).toBe(false);
  });

  it('emoji 表情的正常原创文本 → 原创', () => {
    const r = isOriginalPost({
      text: '今天好开心<img alt="[笑cry]" src="x.png">',
    });
    expect(r.original).toBe(true);
  });
});
