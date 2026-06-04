"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { GlassToast, useToast } from '@/shared/components/ui/glass/GlassToast';
import { useAuthUser } from '@/shared/hooks/AuthContext';
import type { SmsTransfer as PendingTransfer } from '@/systems/sms/types/sms-types';
import { formatDistanceToNow } from 'date-fns';
import { toDateInstant } from '@/shared/utils/cambodiaTime';
import { CheckCircle2, Clock, Loader2, Package, RefreshCw, Users, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ImageModal from '@/systems/sms/components/assets/ImageModal';
import { useSmsUsers } from '@/systems/sms/hooks/useSmsUsers';
import type { SmsSettingsUser } from '@/systems/sms/utils/smsUsers';
import {
  SmsPageHeader,
  SmsPageShell,
  smsDangerButtonClass,
  smsPanelClass,
  smsPrimaryButtonClass,
  smsSecondaryButtonClass,
} from '@/systems/sms/components/SmsShared';

interface LocalPendingTransfer {
  id: string;
  assetId: string;
  asset?: { name: string; item_code: string };
  senderId: string;
  receiverId: string;
  location: string;
  status: 'pending';
  remark?: string;
  imageUrl?: string | null;
  createdAt: string;
}

const UserAvatar = ({ userId, users }: { userId: string; users: SmsSettingsUser[] }) => {
  if (userId === 'stock') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm">
        <Package className="h-5 w-5" />
      </div>
    );
  }

  const user = users.find(u => u.username === userId);
  const initial = user ? (user.full_name || user.username || 'U').charAt(0).toUpperCase() : '?';

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 shadow-sm">
      {user?.profile_picture ? (
        <Image
          src={user.profile_picture}
          alt=""
          width={40}
          height={40}
          className="h-full w-full rounded-md object-cover"
        />
      ) : initial}
    </div>
  );
};

function formatRelativeTime(value: string) {
  const date = toDateInstant(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : '—';
}

function isReturnRequest(transfer: Pick<LocalPendingTransfer, 'receiverId'>) {
  return transfer.receiverId === 'stock';
}

export default function PendingPage() {
  const currentUser = useAuthUser();
  const [pending, setPending] = useState<LocalPendingTransfer[]>([]);
  const { users } = useSmsUsers();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [rejectRemarks, setRejectRemarks] = useState<Record<string, string>>({});
  const [rejectErrors, setRejectErrors] = useState<Record<string, string>>({});
  const { toasts, removeToast, success: toastSuccess, error: toastError } = useToast();
  const [viewImage, setViewImage] = useState<{ src: string; alt: string } | null>(null);
  const usersByUsername = useMemo(
    () => new Map(users.map((user) => [user.username, user])),
    [users]
  );

  const getUserDisplay = useCallback((userId: string) => {
    if (userId === 'stock') return 'Stock';

    const user = usersByUsername.get(userId);
    return user ? (user.full_name || user.username || userId) : userId;
  }, [usersByUsername]);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sms/transfers?status=pending');
      const data = await res.json();
      if (data.success) {
        setPending(data.data.filter((t: PendingTransfer) => t.status === 'pending') || []);
      }
    } catch (_error) {
      toastError('Failed to fetch pending transfers');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    void fetchPending();
  }, [fetchPending]);

  const validateRejectForm = (transferId: string): boolean => {
    const remark = rejectRemarks[transferId] || '';
    const errorKey = `remark-${transferId}`;
    
    setRejectErrors(prev => {
      const next = { ...prev };
      delete next[errorKey];
      if (remark.length > 500) {
        next[errorKey] = 'Reason too long (max 500 characters)';
      }
      return next;
    });
    
    return remark.length <= 500;
  };

  const canManageTransfer = useCallback((transfer: LocalPendingTransfer) => {
    if (isReturnRequest(transfer)) {
      return currentUser.role === 'Admin';
    }

    return currentUser.role === 'Admin' || transfer.receiverId === currentUser.username;
  }, [currentUser.role, currentUser.username]);


  const handleAction = async (transferId: string, action: 'accept' | 'reject', remark?: string) => {

    // Validate reject form if rejecting
    if (action === 'reject' && !validateRejectForm(transferId)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [transferId]: true }));
    try {
      const endpoint = `/api/sms/transfer/${action}`;
      const body = action === 'reject' 
        ? { id: transferId, remark: remark?.trim() || undefined } 
        : { id: transferId };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const transfer = pending.find((item) => item.id === transferId);
        const requestLabel = transfer && isReturnRequest(transfer) ? 'Return request' : 'Transfer';
        const actionLabel = action === 'accept' ? 'accepted' : transfer && isReturnRequest(transfer) ? 'sent back' : 'rejected';
        toastSuccess(`${requestLabel} #${transferId.slice(-8)} ${actionLabel}`);
        await fetchPending();
        if (action === 'reject') {
          setRejectRemarks(prev => {
            const next = { ...prev };
            delete next[transferId];
            return next;
          });
          setRejectErrors(prev => {
            const next = { ...prev };
            delete next[`remark-${transferId}`];
            return next;
          });
        }
      } else {
        const errorData = await res.json();
        toastError(errorData.error || 'Action failed. Please try again.');
      }
    } catch (_error) {
      toastError('Network error. Please check your connection.');
    } finally {
      setActionLoading(prev => ({ ...prev, [transferId]: false }));
    }
  };

  const stats = useMemo(() => ({
    total: pending.length,
    avgWait: pending.length > 0
      ? formatRelativeTime(pending[0].createdAt)
      : null,
  }), [pending]);

  const SkeletonCard = () => (
    <div className={`${smsPanelClass} animate-pulse p-5`}>
      <div className="mb-3 h-5 w-48 rounded-md bg-slate-200"></div>
      <div className="mb-4 h-4 w-64 rounded-md bg-slate-200"></div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="h-4 bg-slate-200 rounded w-32"></div>
        <div className="h-4 bg-slate-200 rounded w-24"></div>
      </div>
    </div>
  );

  if (loading && pending.length === 0) {
    return (
      <SmsPageShell maxWidth="max-w-5xl">
        <div className="space-y-4">
          <div className={`${smsPanelClass} flex items-center gap-4 p-5`}>
            <div className="h-10 w-10 animate-pulse rounded-md bg-slate-200"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 w-64 rounded-md bg-slate-200"></div>
              <div className="h-4 w-48 rounded-md bg-slate-200"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({length: 4}).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </SmsPageShell>
    );
  }

  return (
    <SmsPageShell maxWidth="max-w-5xl">
      <SmsPageHeader
        title="Transfer Requests"
        description="Review pending SMS asset handovers and return requests."
        icon={Clock}
        tone="slate"
        actions={
          <>
            <Button
              variant="outline"
              onClick={fetchPending}
              disabled={loading}
              className={smsSecondaryButtonClass}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link
              href="/sms/transfer"
              className={smsPrimaryButtonClass}
            >
              + New Transfer
            </Link>
          </>
        }
      />

        {/* Stats Card */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={`${smsPanelClass} p-5`}>
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-slate-100 p-3">
                <Users className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Pending</p>
                <div className="text-3xl font-semibold text-slate-900">{stats.total}</div>
              </div>
            </div>
          </div>
          {stats.total > 0 && (
            <>
            <div className={`${smsPanelClass} p-5`}>
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-emerald-50 p-3">
                  <Clock className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Oldest Request</p>
                  <div className="text-xl font-semibold text-emerald-900">{stats.avgWait}</div>
                </div>
              </div>
            </div>
            <div className={`${smsPanelClass} p-5`}>
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-amber-50 p-3">
                  <Package className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Asset Types</p>
                  <div className="text-xl font-semibold text-amber-900">
                    {[...new Set(pending.map(t => t.asset?.name || 'Unknown'))].length}
                  </div>
                </div>
              </div>
            </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {pending.length === 0 ? (
            <div className={`${smsPanelClass} p-10 text-center lg:p-16`}>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-md bg-emerald-50">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="mb-3 text-2xl font-semibold text-slate-900">
                No Pending Transfer Requests
              </h2>
              <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-slate-500">
                All SMS asset handovers and return requests are processed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/sms/transfer"
                  className={`${smsPrimaryButtonClass} flex-1 sm:flex-none`}
                >
                  Create New Transfer
                </Link>
                <Button
                  variant="outline"
                  onClick={fetchPending}
                  className={smsSecondaryButtonClass}
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Check Again
                </Button>
              </div>
            </div>
          ) : (
            pending.map((transfer) => (
              <Card
                key={transfer.id}
                className="overflow-hidden rounded-lg border-0 bg-white shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
                role="article"
                aria-labelledby={`transfer-title-${transfer.id}`}
              >
                <CardHeader className="px-5 pb-4 pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle id={`transfer-title-${transfer.id}`} className="font-bold text-xl mb-1">
                        {isReturnRequest(transfer) ? 'Return' : 'Transfer'} #{transfer.id.slice(-8).toUpperCase()}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {transfer.asset ? (
                          <>
                            <div className="rounded-md bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-800">
                              {transfer.asset.name}
                            </div>
                            <div className="text-xs text-slate-500">({transfer.asset.item_code})</div>
                          </>
                        ) : (
                          <div className="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">Unknown Asset</div>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="bg-slate-100 text-slate-800"
                    >
                      {isReturnRequest(transfer) ? 'Return Review' : 'Pending Review'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 text-sm">
                    <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                      <UserAvatar userId={transfer.senderId} users={users} />
                      <div>
                        <div className="font-medium text-slate-900">{isReturnRequest(transfer) ? 'Returning Person' : 'From'}</div>
                        <div className="text-slate-800 font-semibold">{getUserDisplay(transfer.senderId)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 ring-1 ring-emerald-100">
                      <UserAvatar userId={transfer.receiverId} users={users} />
                      <div>
                        <div className="font-medium text-slate-900">{isReturnRequest(transfer) ? 'Destination' : 'To'}</div>
                        <div className="text-slate-800 font-semibold">{getUserDisplay(transfer.receiverId)}</div>
                      </div>
                    </div>
                    <div className="grid gap-2 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-100">
                      <div className="font-medium text-slate-900">{isReturnRequest(transfer) ? 'Return Location' : 'Location'}</div>
                      <div className="text-lg font-bold text-blue-900">{transfer.location}</div>
                    </div>
                    <div className="grid gap-2 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-100">
                      <div className="font-medium text-slate-900">Requested</div>
                      <div className="flex items-center gap-2 text-slate-800">
                        <Clock className="w-4 h-4 text-amber-600" />
                        {formatRelativeTime(transfer.createdAt)}
                      </div>
                    </div>
                  </div>
                  {transfer.remark && (
                    <div className="mt-5 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-100">
                      <div className="mb-1 text-sm font-semibold text-blue-950">
                        {isReturnRequest(transfer) ? 'Return Note' : 'Message from sender'}
                      </div>
                      <p className="text-sm leading-6 text-blue-900">{transfer.remark}</p>
                    </div>
                  )}

                  {transfer.imageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewImage({
                          src: transfer.imageUrl!,
                          alt: `${isReturnRequest(transfer) ? 'Return' : 'Transfer'} proof - #${transfer.id.slice(-8)}`,
                        })
                      }
                      className="relative mt-5 h-40 w-full cursor-zoom-in overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-64"
                      aria-label={`View ${isReturnRequest(transfer) ? 'return' : 'transfer'} proof larger`}
                    >
                      <Image
                        src={transfer.imageUrl!}
                        alt={`${isReturnRequest(transfer) ? 'Return' : 'Transfer'} proof`}
                        fill
                        sizes="256px"
                        className="object-cover"
                      />
                    </button>
                  )}
                </CardContent>
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
                  {canManageTransfer(transfer) ? (
                  <div className="flex gap-3 justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          disabled={actionLoading[transfer.id]}
                          className={`${smsPrimaryButtonClass} flex-1 md:flex-none`}
                        >
                          {actionLoading[transfer.id] ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            isReturnRequest(transfer) ? 'Accept Return' : 'Accept Transfer'
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-md rounded-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            {isReturnRequest(transfer) ? 'Accept Return' : 'Accept Transfer'}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {isReturnRequest(transfer) ? (
                              <>
                                Confirm returning #{transfer.id.slice(-8)} from{' '}
                                <span className="font-semibold">{getUserDisplay(transfer.senderId)}</span>{' '}
                                back to stock?
                              </>
                            ) : (
                              <>
                                Confirm accepting transfer #{transfer.id.slice(-8)} from{' '}
                                <span className="font-semibold">{getUserDisplay(transfer.senderId)}</span>{' '}
                                to <span className="font-semibold">{getUserDisplay(transfer.receiverId)}</span>?
                              </>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleAction(transfer.id, 'accept')}
                            disabled={actionLoading[transfer.id]}
                          >
                            {isReturnRequest(transfer) ? 'Accept Return' : 'Accept'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog onOpenChange={(open) => {
                      if (open) {
                        setRejectErrors(prev => {
                          const next = { ...prev };
                          delete next[`remark-${transfer.id}`];
                          return next;
                        });
                      }
                    }}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive"

                          disabled={actionLoading[transfer.id]}
                          className={`${smsDangerButtonClass} flex-1 md:flex-none`}
                        >
                          {actionLoading[transfer.id] ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            isReturnRequest(transfer) ? 'Send Back' : 'Reject Transfer'
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-md rounded-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            {isReturnRequest(transfer) ? 'Send Return Back' : 'Reject Transfer'}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {isReturnRequest(transfer) ? (
                              <>
                                Send this return request back to{' '}
                                <span className="font-semibold">{getUserDisplay(transfer.senderId)}</span>? The asset will stay assigned.
                              </>
                            ) : (
                              <>
                                Reject transfer from <span className="font-semibold">{getUserDisplay(transfer.senderId)}</span>?
                              </>
                            )}
                          </AlertDialogDescription>
                          <div className="space-y-2 mt-4">
                            <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                              <label className="block text-sm font-medium text-slate-700 mb-2">Reason (optional)</label>
                              <textarea
                                value={rejectRemarks[transfer.id] || ''}
                                onChange={(e) => {
                                  setRejectRemarks(prev => ({ ...prev, [transfer.id]: e.target.value })); 
                                  // Clear error when user starts typing
                                  if (rejectErrors[`remark-${transfer.id}`]) {
                                    setRejectErrors(prev => {
                                      const next = { ...prev };
                                      delete next[`remark-${transfer.id}`];
                                      return next;
                                    });
                                  }
                                }}
                                placeholder="Enter rejection reason..."
                                rows={3}
                                maxLength={500}
                                className={`w-full rounded-md border px-3 py-2 transition-colors focus:outline-none focus:ring-2 resize-vertical ${
                                  rejectErrors[`remark-${transfer.id}`]
                                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                                    : 'border-slate-200 focus:border-red-500 focus:ring-red-500/20'
                                }`}
                              />
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-slate-500">{(rejectRemarks[transfer.id] || '').length}/500</span>
                                {rejectErrors[`remark-${transfer.id}`] && (
                                  <span className="text-xs text-red-600 font-medium">{rejectErrors[`remark-${transfer.id}`]}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleAction(transfer.id, 'reject', rejectRemarks[transfer.id])}
                            disabled={actionLoading[transfer.id] || !!rejectErrors[`remark-${transfer.id}`]}
                          >
                            {isReturnRequest(transfer) ? 'Send Back' : 'Reject'}
                          </AlertDialogAction>

                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  ) : (
                    <div className="rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
                      {isReturnRequest(transfer)
                        ? 'Waiting for an admin to review this return request.'
                        : `Waiting for ${getUserDisplay(transfer.receiverId)} or an admin to review this transfer.`}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

      <GlassToast toasts={toasts} onRemove={removeToast} />

      {/* Image lightbox modal */}
      <ImageModal
        src={viewImage?.src || ""}
        alt={viewImage?.alt || ""}
        isOpen={!!viewImage}
        onClose={() => setViewImage(null)}
      />
    </SmsPageShell>
  );
}
