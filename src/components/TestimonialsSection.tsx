import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Quote, Star } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { LazyImage } from './LazyImage';

export interface TestimonialItem {
  id: string;
  nameEn: string;
  nameAr: string;
  roleEn: string;
  roleAr: string;
  contentEn: string;
  contentAr: string;
  avatar?: string;
  rating?: number;
}

export const TestimonialsSection: React.FC = () => {
  const { language } = useLanguage();
  const [endorsements, setEndorsements] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTestimonials() {
      try {
        const snap = await getDocs(collection(db, 'testimonials'));
        if (!snap.empty) {
          const list: TestimonialItem[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as TestimonialItem));
          setEndorsements(list);
        } else {
          setEndorsements([]);
        }
      } catch (e) {
        setEndorsements([]);
      } finally {
        setLoading(false);
      }
    }
    loadTestimonials();
  }, []);

  // When empty (no real data added yet to database), cleanly hide the section
  if (endorsements.length === 0 && !loading) {
    return null;
  }

  return (
    <section id="testimonials" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            {language === 'ar' ? 'آراء الشركاء والعملاء' : 'Client Endorsements'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {language === 'ar' ? 'شهادات وتوصيات الشركاء' : 'Trusted by Technology Leaders'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {endorsements.map((item) => {
            const name = language === 'ar' ? item.nameAr : item.nameEn;
            const role = language === 'ar' ? item.roleAr : item.roleEn;
            const content = language === 'ar' ? item.contentAr : item.contentEn;

            return (
              <div
                key={item.id}
                className="p-7 sm:p-8 rounded-2xl bg-[#111216] border border-neutral-800 shadow-sm flex flex-col justify-between space-y-6 hover:border-neutral-700 transition-all duration-300"
              >
                <div className="space-y-4">
                  {item.rating && item.rating > 0 ? (
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(item.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  ) : null}
                  <p className="text-sm sm:text-base text-neutral-300 leading-relaxed italic">
                    "{content}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-neutral-800">
                  {item.avatar && (
                    <LazyImage
                      src={item.avatar}
                      alt={name}
                      className="w-11 h-11 rounded-full object-cover"
                      containerClassName="w-11 h-11 rounded-full overflow-hidden border border-neutral-700 shrink-0"
                    />
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {name}
                    </h4>
                    <p className="text-xs text-neutral-400">
                      {role}
                    </p>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
