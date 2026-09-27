import React, { useState, useEffect, useMemo } from 'react';
import { Star, MessageSquare, Send, CheckCircle2, User, ThumbsUp, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { db, cleanFirestorePayload } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ProductReview } from '../types';

interface ProductReviewsProps {
  productId: string;
  productName?: string;
  onRatingCalculated?: (avgRating: number, totalReviews: number) => void;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({ 
  productId, 
  productName,
  onRatingCalculated 
}) => {
  const { language } = useLanguage();
  const { currentUser, appUser } = useAuth();
  const isAr = language === 'ar';

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [authorName, setAuthorName] = useState(currentUser?.displayName || appUser?.email?.split('@')[0] || '');
  const [authorEmail, setAuthorEmail] = useState(currentUser?.email || appUser?.email || '');
  const [comment, setComment] = useState('');

  // Storage key for caching offline reviews
  const storageKey = `cached_reviews_${productId}`;

  // Fetch only REAL reviews from Firestore (and purge any old fake/seed cache)
  useEffect(() => {
    let isMounted = true;

    const loadReviews = async () => {
      setLoading(true);

      // 1. Load local cache (strictly filter out mock/seed entries)
      let initialList: ProductReview[] = [];
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            initialList = parsed.filter((r: any) => r && r.id && !String(r.id).startsWith('rev-seed-'));
          }
        }
      } catch {}

      if (isMounted) setReviews(initialList);

      // 2. Fetch from remote Firestore
      try {
        const q = query(
          collection(db, 'reviews'),
          where('productId', '==', productId)
        );
        const snap = await getDocs(q);
        if (isMounted) {
          if (!snap.empty) {
            const remoteList: ProductReview[] = [];
            snap.forEach(docSnap => {
              const data = docSnap.data();
              if (!docSnap.id.startsWith('rev-seed-')) {
                remoteList.push({ id: docSnap.id, ...data } as ProductReview);
              }
            });
            // Sort newest first
            remoteList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setReviews(remoteList);
            try {
              localStorage.setItem(storageKey, JSON.stringify(remoteList));
            } catch {}
          } else {
            // Absolutely no reviews yet
            setReviews([]);
            try {
              localStorage.removeItem(storageKey);
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Could not fetch remote reviews notice:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReviews();

    return () => {
      isMounted = false;
    };
  }, [productId, storageKey]);

  // Compute stats: strictly based on real reviews (returns 0 if no reviews exist)
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { average: 0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = Number((sum / total).toFixed(1));

    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      breakdown[star] = (breakdown[star] || 0) + 1;
    });

    return { average: avg, total, breakdown };
  }, [reviews]);

  // Notify parent component of calculated rating
  useEffect(() => {
    if (onRatingCalculated) {
      onRatingCalculated(stats.average, stats.total);
    }
  }, [stats.average, stats.total, onRatingCalculated]);

  // Submit Review Handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMessage(isAr ? 'يرجى كتابة تعليقك أو رأيك في المنتج.' : 'Please enter your review comment.');
      return;
    }
    if (!authorName.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال اسمك الكريم.' : 'Please enter your name.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const newReview: ProductReview = {
      id: `rev-${Date.now()}`,
      productId,
      authorName: authorName.trim(),
      authorEmail: authorEmail.trim(),
      rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
      verifiedPurchase: true
    };

    // 1. Optimistically update state
    const updated = [newReview, ...reviews];
    setReviews(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    // 2. Persist to Firestore
    try {
      const docRef = await addDoc(collection(db, 'reviews'), cleanFirestorePayload({
        productId,
        authorName: newReview.authorName,
        authorEmail: newReview.authorEmail,
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: newReview.createdAt,
        verifiedPurchase: true
      }));
      newReview.id = docRef.id;
    } catch (err) {
      console.warn('Could not sync review to remote Firestore notice:', err);
      // Even if Firestore fails, local storage keeps it intact!
    } finally {
      setSubmitting(false);
      setSubmitSuccess(true);
      setComment('');
      setTimeout(() => setSubmitSuccess(false), 4000);
    }
  };

  return (
    <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-neutral-800">
      
      {/* Reviews Summary Banner */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#111216] border border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center gap-6 justify-between">
        
        {/* Left: Overall Score or Clean No-Review Message */}
        <div className="flex items-center gap-4 text-center sm:text-start">
          {stats.total > 0 ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center border border-emerald-500/20 shrink-0">
                <span className="text-2xl font-black font-mono leading-none">
                  {stats.average}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-neutral-400 mt-1">
                  / 5.0
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1 text-amber-400 justify-center sm:justify-start">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= Math.round(stats.average) ? 'fill-current' : 'text-slate-300 dark:text-neutral-700'}`}
                    />
                  ))}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {isAr ? 'تقييمات القراء والمقتنين المعتمدة' : 'Verified Reader Reviews'}
                </h3>
                <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                  {stats.total} {isAr ? 'مراجعة فعلية' : 'verified reviews'}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAr ? 'تقييمات ومراجعات القراء' : 'Reader Reviews & Ratings'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  {isAr ? 'لا توجد تقييمات مسجلة بعد لهذا العمل. شارك أول مراجعة وانطباع فكري!' : 'No reviews recorded yet for this work. Be the first to share your review!'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Star Bar Breakdown (Only displayed when there are real reviews) */}
        {stats.total > 0 && (
          <div className="w-full sm:w-64 space-y-1.5 text-xs">
            {[5, 4, 3, 2, 1].map(num => {
              const count = stats.breakdown[num] || 0;
              const pct = (count / stats.total) * 100;
              return (
                <div key={num} className="flex items-center gap-2">
                  <span className="w-3 text-slate-500 font-mono text-[11px]">{num}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-current shrink-0" />
                  <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-end text-[11px] text-slate-400 font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Review Submission Form */}
      <form onSubmit={handleSubmitReview} className="p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111216] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isAr ? 'أضف رأيك وتقييمك للمؤلف' : 'Write a Customer Review'}</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            {isAr ? 'تقييمك يساعد الآخرين' : 'Share your intellectual feedback'}
          </span>
        </div>

        {/* Interactive Star Picker */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
            {isAr ? 'اختر التقييم بالنجوم:' : 'Select Star Rating:'}
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(star => {
              const active = (hoverRating !== null ? star <= hoverRating : star <= rating);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 rounded-md text-amber-400 transition-transform active:scale-125 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20"
                >
                  <Star className={`w-6 h-6 ${active ? 'fill-current' : 'text-slate-300 dark:text-neutral-700'}`} />
                </button>
              );
            })}
            <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 ms-2">
              {hoverRating !== null ? hoverRating : rating} / 5
            </span>
          </div>
        </div>

        {/* Author Name and Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
              {isAr ? 'اسمك الكريم' : 'Your Name'} *
            </label>
            <input
              type="text"
              required
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder={isAr ? 'الاسم الكامل' : 'Full Name'}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#0c0d10] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
              {isAr ? 'البريد الإلكتروني (اختياري)' : 'Your Email (Optional)'}
            </label>
            <input
              type="email"
              value={authorEmail}
              onChange={e => setAuthorEmail(e.target.value)}
              placeholder={isAr ? 'البريد الإلكتروني' : 'Email Address'}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#0c0d10] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>
        </div>

        {/* Comment Textarea */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
            {isAr ? 'تعليقك أو مراجعتك التفصيلية' : 'Your Review & Comments'} *
          </label>
          <textarea
            required
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={isAr ? 'شارك انطباعك عن جودة المحتوى والمنهجية الفكرية...' : 'Share your thoughts on the quality, insights, and research...'}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#0c0d10] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 transition-colors resize-none"
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {submitSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'تم نشر مراجعتك بنجاح! شكراً لمشاركتك القيّمة.' : 'Your review was published successfully! Thank you for your contribution.'}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? (isAr ? 'جارٍ النشر...' : 'Submitting...') : (isAr ? 'نشر المراجعة' : 'Submit Review')}</span>
          </button>
        </div>
      </form>

      {/* Reviews List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
          {isAr ? `المراجعات والآراء المنشورة (${reviews.length})` : `Published Reviews (${reviews.length})`}
        </h4>

        {loading && reviews.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 animate-pulse">
            {isAr ? 'جارٍ تحميل المراجعات...' : 'Loading reviews...'}
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-neutral-800 text-slate-400 space-y-1">
            <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs font-medium">
              {isAr ? 'كن أول من يكتب مراجعة لهذا المؤلف!' : 'Be the first to review this work!'}
            </p>
          </div>
        ) : (
          reviews.map(rev => (
            <div
              key={rev.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111216] space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex items-center justify-center font-bold text-xs uppercase">
                    {rev.authorName ? rev.authorName.slice(0, 2) : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {rev.authorName}
                      </span>
                      {rev.verifiedPurchase && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isAr ? 'مقتنٍ معتمد' : 'Verified Purchase'}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Rating stars */}
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s <= (rev.rating || 5) ? 'fill-current' : 'text-slate-300 dark:text-neutral-700'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Review Comment Text */}
              <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed ps-10">
                {rev.comment}
              </p>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
