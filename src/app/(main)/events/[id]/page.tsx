import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Users, ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await prisma.event.findUnique({ where: { id: params.id }, select: { title: true } });
  return { title: event?.title || '活动详情' };
}

function formatNum(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toLocaleString();
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return notFound();

  const statusLabel = event.status === 'upcoming' ? '即将开始' : event.status === 'ongoing' ? '进行中' : '已结束';
  const statusColor = event.status === 'upcoming' ? 'bg-primary' : event.status === 'ongoing' ? 'bg-success' : 'bg-gray-400';

  return (
    <div className="pt-20 pb-16 animate-fade-in-up">
      <div className="container-main px-4 sm:px-6 lg:px-8">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-body text-text-muted hover:text-primary transition-colors duration-150 cursor-pointer mb-6">
          <ArrowLeft className="w-4 h-4" />
          返回活动列表
        </Link>

        <div className="card p-0 overflow-hidden">
          <div className="relative aspect-[21/9] bg-gray-100">
            <Image src={event.cover} alt={event.title} fill className="object-cover" />
            <div className="absolute top-4 left-4">
              <span className={`tag text-white ${statusColor}`}>{statusLabel}</span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <h1 className="text-heading text-text-title">{event.title}</h1>

            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-body text-text-muted">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{new Date(event.startTime).toLocaleString('zh-CN')} ~ {new Date(event.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-2 text-body text-text-muted">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2 text-body text-text-muted">
                <Users className="w-4 h-4 text-primary" />
                <span>{formatNum(event.participants)} 人感兴趣</span>
              </div>
            </div>

            <div className="border-t border-divider mt-6 pt-6">
              <h2 className="text-heading-sm text-text-title mb-3">活动详情</h2>
              <p className="text-body text-text-body leading-relaxed">{event.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
