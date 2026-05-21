"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassToast, useToast } from '@/components/ui/glass/GlassToast';
import { useAuthUser } from '@/app/components/AuthContext';
import type { SmsTransfer as PendingTransfer } from '@/lib/sms-types';
import { formatDistanceToNow } from 'date-fns';
import { normalizeCambodiaTimeString } from '@/lib/cambodiaTime';
import { ArrowLeft, CheckCircle2, Clock, Loader2, Package, RefreshCw, Users, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ImageModal from '../assets/components/ImageModal';

interface LocalUser {
  username: string;
  full_name?: string;
  role?: string;
  email?: string;
  phone?: string;
  profile_picture?: string;
  staff_id?: number;
}

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

const UserAvatar = ({ userId, users }: { userId: string; users: LocalUser[] }) => {
  const user = users.find(u => u.username === userId);
  const initial = user ? (user.full_name || user.username || 'U').charAt(0).toUpperCase() : '?';

  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
      {user?.profile_picture ? (
        <Image
          src={user.profile_picture}
          alt=""
          width={40}
          height={40}
          className="w-full h-full rounded-xl object-cover"
        />
      ) : initial}
    </div>
  );
};

export default function PendingPage() {
  const currentUser = useAuthUser();
  const [pending, setPending] = useState<LocalPendingTransfer[]>([]);
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [rejectRemarks, setRejectRemarks] = useState<Record<string, string>>({});
  const [rejectErrors, setRejectErrors] = useState<Record<string, string>>({});
  const { toasts, removeToast, success: toastSuccess, error: toastError } = useToast();
  const [viewImage, setViewImage] = useState<{ src: string; alt: string } | null>(null);


  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.ok && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (_error) {
      console.error('Failed to fetch users', _error);
    }
  }, []);

  const getUserDisplay = useCallback((userId: string) => {
    const user = users.find(u => u.username === userId);
    return user ? (user.full_name || user.username || userId) : userId;
  }, [users]);

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
    const loadData = async () => {
      await Promise.all([fetchUsers(), fetchPending()]);
    };
    loadData();
  }, [fetchUsers, fetchPending]);

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
        toastSuccess(`Transfer #${transferId.slice(-8)} ${action === 'accept' ? 'accepted' : 'rejected'}`);
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
      ? formatDistanceToNow(new Date(pending[0].createdAt), { addSuffix: true })
      : null,
  }), [pending]);

  const SkeletonCard = () => (
    <div className="group p-6 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 overflow-hidden animate-pulse">
      <div className="h-6 bg-slate-200 rounded-xl w-48 mb-3"></div>
      <div className="h-4 bg-slate-200 rounded-lg w-64 mb-4"></div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="h-4 bg-slate-200 rounded w-32"></div>
        <div className="h-4 bg-slate-200 rounded w-24"></div>
      </div>
    </div>
  );

  if (loading && pending.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl">
            <div className="w-12 h-12 bg-slate-200 rounded-2xl animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-8 bg-slate-200 rounded-xl w-64"></div>
              <div className="h-5 bg-slate-200 rounded-lg w-48"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({length: 4}).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:to-slate-900 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white/70 backdrop-blur-xl rounded-3xl p-6 lg:p-8 border border-slate-200/50 shadow-2xl">
          <div className="flex items-center gap-4">
            <Link 
              href="/sms" 
              className="group p-3 -m-3 rounded-2xl bg-slate-100/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-slate-600 hover:text-slate-900"
              aria-label="Back to SMS Dashboard"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 bg-clip-text text-transparent">
                Review Requests
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Pending SMS asset transfers ({stats.total})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={fetchPending}
              disabled={loading}
              className="gap-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all bg-white/50 backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link 
              href="/sms/transfer" 
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300"
            >
              + New Transfer
            </Link>
          </div>
        </div>

        {/* Stats Card */}
        {stats.total > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="group p-8 bg-gradient-to-br from-slate-500/10 to-slate-600/10 border border-slate-200/50 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-6 right-6 w-20 h-20 bg-slate-400 rounded-3xl opacity-10 -rotate-12" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-slate-200/50 backdrop-blur-sm shadow-lg">
                  <Users className="w-6 h-6 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Pending Requests</p>
                  <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                </div>
              </div>
            </div>
            <div className="group p-8 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-200/50 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-6 right-6 w-20 h-20 bg-emerald-500 rounded-3xl opacity-10" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-200/50 backdrop-blur-sm shadow-lg">
                  <Clock className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Oldest Request</p>
                  <div className="text-xl font-bold text-emerald-900">{stats.avgWait}</div>
                </div>
              </div>
            </div>
            <div className="md:col-span-1 p-8 bg-gradient-to-br from-amber-500/10 to-amber-600/10 border border-amber-200/50 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-6 right-6 w-20 h-20 bg-amber-500 rounded-3xl opacity-10" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-200/50 backdrop-blur-sm shadow-lg">
                  <Package className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Asset Types</p>
                  <div className="text-xl font-bold text-amber-900">
                    {[...new Set(pending.map(t => t.asset?.name || 'Unknown'))].length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {pending.length === 0 ? (
            <div className="group p-16 lg:p-24 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl text-center hover:shadow-3xl transition-all duration-300">
              <div className="w-24 h-24 mx-auto mb-6 p-6 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4 bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
                No Pending Requests
              </h2>
              <p className="text-xl text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
                All SMS asset transfers are processed and approved. 
                <span className="block mt-2 font-medium">Great job keeping things moving!</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/sms/transfer" 
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 flex-1 sm:flex-none text-center"
                >
                  Create New Transfer
                </Link>
                <Button 
                  variant="outline" 
                  onClick={fetchPending}
                  className="px-8 py-4 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all bg-white/50 backdrop-blur-sm"
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
                className="group bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative"
                role="article"
                aria-labelledby={`transfer-title-${transfer.id}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-500/5 to-slate-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-4 pt-6 px-6 relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle id={`transfer-title-${transfer.id}`} className="font-bold text-xl mb-1">
                        Transfer #{transfer.id.slice(-8).toUpperCase()}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {transfer.asset ? (
                          <>
                            <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full text-sm font-medium text-blue-800">
                              {transfer.asset.name}
                            </div>
                            <div className="text-xs text-slate-500">({transfer.asset.item_code})</div>
                          </>
                        ) : (
                          <div className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-700">Unknown Asset</div>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 border-slate-300 shadow-sm px-3 py-1 font-semibold"
                    >
                      Pending Review
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-8 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 text-sm">
                    <div className="flex items-center gap-3 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl backdrop-blur-sm border border-slate-200/50">
                      <UserAvatar userId={transfer.senderId} users={users} />
                      <div>
                        <div className="font-medium text-slate-900">From</div>
                        <div className="text-slate-800 font-semibold">{getUserDisplay(transfer.senderId)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl backdrop-blur-sm border border-emerald-200/50">
                      <UserAvatar userId={transfer.receiverId} users={users} />
                      <div>
                        <div className="font-medium text-slate-900">To</div>
                        <div className="text-slate-800 font-semibold">{getUserDisplay(transfer.receiverId)}</div>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50/50 rounded-2xl backdrop-blur-sm border border-blue-200/50 grid gap-2">
                      <div className="font-medium text-slate-900">Location</div>
                      <div className="text-lg font-bold text-blue-900">{transfer.location}</div>
                    </div>
                    <div className="p-4 bg-amber-50/50 rounded-2xl backdrop-blur-sm border border-amber-200/50 grid gap-2">
                      <div className="font-medium text-slate-900">Requested</div>
                      <div className="flex items-center gap-2 text-slate-800">
                        <Clock className="w-4 h-4 text-amber-600" />
                        {formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  {transfer.remark && (
                    <div className="mt-6 rounded-2xl border border-blue-200/60 bg-blue-50/70 p-4">
                      <div className="mb-1 text-sm font-semibold text-blue-950">Message from sender</div>
                      <p className="text-sm leading-6 text-blue-900">{transfer.remark}</p>
                    </div>
                  )}

                  {transfer.imageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewImage({
                          src: transfer.imageUrl!,
                          alt: `Transfer proof - Transfer #${transfer.id.slice(-8)}`,
                        })
                      }
                      className="relative mt-6 h-40 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:w-64 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      aria-label="View transfer proof larger"
                    >
                      <Image
                        src={transfer.imageUrl!}
                        alt="Transfer proof"
                        fill
                        sizes="256px"
                        className="object-cover"
                      />
                    </button>
                  )}
                </CardContent>
                <div className="px-6 pb-6 relative z-10 bg-gradient-to-t from-slate-50/80 to-transparent rounded-b-3xl pt-4">
                  {canManageTransfer(transfer) ? (
                  <div className="flex gap-3 justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          disabled={actionLoading[transfer.id]}
                          className="flex-1 md:flex-none bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 px-6 font-semibold transition-all"
                        >
                          {actionLoading[transfer.id] ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Accept Transfer'
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            Accept Transfer
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Confirm accepting transfer #{transfer.id.slice(-8)} from{' '}
                            <span className="font-semibold">{getUserDisplay(transfer.senderId)}</span>{' '}
                            to <span className="font-semibold">{getUserDisplay(transfer.receiverId)}</span>?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleAction(transfer.id, 'accept')}
                            disabled={actionLoading[transfer.id]}
                          >
                            Accept
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
                          className="flex-1 md:flex-none bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 px-6 font-semibold transition-all"
                        >
                          {actionLoading[transfer.id] ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Reject Transfer'
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            Reject Transfer
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Reject transfer from <span className="font-semibold">{getUserDisplay(transfer.senderId)}</span>?
                          </AlertDialogDescription>
                          <div className="space-y-2 mt-4">
                            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/50">
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
                                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-vertical ${
                                  rejectErrors[`remark-${transfer.id}`]
                                    ? 'border-red-300 bg-red-50 focus:ring-red-500/20 focus:border-red-500'
                                    : 'border-slate-200 focus:ring-red-500/20 focus:border-red-500'
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
                            Reject
                          </AlertDialogAction>

                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-medium text-slate-600">
                      Waiting for {getUserDisplay(transfer.receiverId)} or an admin to review this transfer.
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

<GlassToast toasts={toasts} onRemove={removeToast} />

      {/* Image lightbox modal */}
      <ImageModal
        src={viewImage?.src || ""}
        alt={viewImage?.alt || ""}
        isOpen={!!viewImage}
        onClose={() => setViewImage(null)}
      />
    </div>
  );
}
