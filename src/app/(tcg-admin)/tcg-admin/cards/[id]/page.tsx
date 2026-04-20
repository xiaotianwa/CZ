'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import CardForm, { CardFormData, DEFAULT_FORM } from '../_CardForm';

export default function TcgCardEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<CardFormData | null>(null);

  useEffect(() => {
    const id = decodeURIComponent(String(params.id));
    fetch(`/api/tcg/admin/cards/${encodeURIComponent(id)}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code !== 0) {
          setError(json.message || '加载失败');
          if (json.code === 401) router.push('/tcg-admin/login');
          return;
        }
        const card = json.data;
        setData({
          ...DEFAULT_FORM,
          id: card.id,
          name: card.name,
          type: card.type,
          subtype: card.subtype ?? null,
          rarity: card.rarity,
          cost: card.cost ?? 0,
          attack: card.attack ?? null,
          health: card.health ?? null,
          description: card.description ?? '',
          flavor: card.flavor ?? null,
          imagePath: card.imagePath ?? null,
          effectHooks: Array.isArray(card.effectHooks) ? card.effectHooks : [],
          keywords: Array.isArray(card.keywords) ? card.keywords : [],
          synergies: Array.isArray(card.synergies) ? card.synergies : [],
          seasonId: card.seasonId ?? null,
          status: card.status ?? 'active',
          sortOrder: card.sortOrder ?? 0,
        });
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return <div className="text-white/40 text-sm tracking-widest">LOADING · · ·</div>;
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm max-w-xl">
        <AlertCircle className="w-4 h-4" /> {error || '卡牌不存在'}
      </div>
    );
  }

  return <CardForm mode="edit" initial={data} />;
}
