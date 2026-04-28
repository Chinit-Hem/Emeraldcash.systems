"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { useRouter } from 'next/navigation';
import { ArrowLeft, History, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';

interface SmsAsset {
  id: string;
  name: string;
  status: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<SmsAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [history, setHistory] = useState<{assetId: string; assetName: string; totalEvents: number; events: unknown[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/sms/assets');
      const data = await res.json();
      if (data.success) {
        setAssets(data.data.slice(0, 20));
      }
    } catch (_e) {}
  };

  const fetchHistory = async (assetId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sms/history/${assetId}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="hover:bg-slate-100 h-12 w-12 p-0"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <History className="h-8 w-8" />
            {`${t.history} & ${t.auditTrail}`}
          </h1>
          <p className="text-slate-600 text-lg">{t.auditTrail}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Search className="h-6 w-6 text-slate-400" />
              <h3 className="font-bold text-xl">{t.selectAsset}</h3>
            </div>
            <Select value={selectedAsset} onValueChange={(id) => {
              setSelectedAsset(id);
              if (id) fetchHistory(id);
            }}>
              <SelectTrigger className="w-full h-14">
                <SelectValue placeholder="{t.chooseAssetHistory}" />
              </SelectTrigger>
              <SelectContent className="max-h-96 overflow-auto">
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name} ({asset.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {history && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-6">
              <h4 className="font-bold mb-2">{t.stats}</h4>
              <p className="text-2xl font-bold text-emerald-600">{history.totalEvents} {t.events}</p>
              <p className="text-sm text-slate-500">{t.for} {history.assetName}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {loading && (
            <div className="flex flex-col items-center py-24 text-slate-500">
              <Loader2 className="h-12 w-12 animate-spin mb-4" />
              <p>{t.loading} timeline...</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
              <p className="text-red-600 font-medium">{error}</p>
              <Button onClick={() => selectedAsset && fetchHistory(selectedAsset)} className="mt-4">
                {t.retry}
              </Button>
            </div>
          )}
          {!selectedAsset && !loading && !error && (
            <div className="text-center py-24 text-slate-500">
              <History className="h-24 w-24 mx-auto mb-4 opacity-40" />
              <h3 className="text-2xl font-bold mb-2">{t.noAssetSelected}</h3>
              <p>{t.selectAssetViewHistory}</p>
            </div>
          )}
          {history && history.events && history.events.length === 0 && (
            <div className="text-center py-24 text-slate-500">
              <p>{t.noEventsFound}</p>
            </div>
          )}
          {history && history.events && history.events.length > 0 && (
            <div className="space-y-4">
              {history.events.map((event: {id: string; type: string; timestamp: string; description: string; location?: string; status?: string; metadata?: Record<string, unknown>}) => (
                <div key={event.id} className="group">
                  <div className="flex gap-4 items-start p-6 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 hover:border-purple-300 transition-all hover:shadow-xl">
                    <div className="w-2 h-2 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full mt-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          event.type === 'transfer' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {event.type.toUpperCase()}
                        </span>
                        <span className="text-sm text-slate-500">{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="font-semibold text-lg mb-1">{event.description}</p>
                      {event.location && (
                        <p className="text-slate-600 mb-1"><strong>{t.location}:</strong> {event.location}</p>
                      )}
                      {event.status && (
                        <p className="text-slate-600 mb-1"><strong>{t.status}:</strong> {event.status}</p>
                      )}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-slate-500 cursor-pointer underline underline-offset-2">{t.viewMetadata}</summary>
                          <pre className="mt-2 p-3 bg-slate-900/5 rounded-xl text-xs text-slate-700 overflow-auto max-h-32">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
