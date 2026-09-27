import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Cloud, Server, Layout, Cpu } from 'lucide-react';

export const SkillsSection: React.FC = () => {
  const { language, t } = useLanguage();

  const skillGroups = [
    {
      id: 'grp-cloud',
      icon: Cloud,
      titleEn: 'Cloud & Infrastructure',
      titleAr: 'البنية التحتية والسحابة',
      skills: ['Google Cloud Platform', 'Cloud Run & GKE', 'Kubernetes & Docker', 'Terraform (IaC)', 'CI/CD Pipelines', 'Cloud Firestore & Spanner']
    },
    {
      id: 'grp-backend',
      icon: Server,
      titleEn: 'Backend & Distributed Systems',
      titleAr: 'الأنظمة الخلفية وقواعد البيانات',
      skills: ['Go (Golang)', 'Node.js / Express', 'Python / FastAPI', 'PostgreSQL & Drizzle', 'Redis & Caching', 'Event-Driven Architectures']
    },
    {
      id: 'grp-frontend',
      icon: Layout,
      titleEn: 'Modern Frontend & UX',
      titleAr: 'واجهات الويب الحديثة والموبايل',
      skills: ['Next.js & React 19', 'TypeScript (Strict)', 'Tailwind CSS v4', 'Bilingual RTL/LTR', 'WebGL & Three.js', 'Progressive Web Apps (PWA)']
    },
    {
      id: 'grp-ai',
      icon: Cpu,
      titleEn: 'Applied AI & Generative Workflows',
      titleAr: 'الذكاء الاصطناعي التوليدي والوكلاء',
      skills: ['Gemini 2.5/3 SDK', 'RAG & Vector Search', 'Multimodal Vision Agents', 'Function Calling & Tooling', 'PyTorch Inference', 'Semantic Embeddings']
    }
  ];

  return (
    <section id="skills" className="py-20 bg-[#0e0f13] border-y border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mb-14 space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
            {language === 'ar' ? 'الكفاءات المتخصصة' : 'Core Proficiencies'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t('skills.heading')}
          </h2>
          <p className="text-base sm:text-lg text-neutral-400">
            {t('skills.sub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {skillGroups.map((group) => {
            const Icon = group.icon;
            const title = language === 'ar' ? group.titleAr : group.titleEn;
            return (
              <div 
                key={group.id}
                className="p-6 rounded-2xl bg-[#13141a] border border-neutral-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all duration-300"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-cyan-400 border border-neutral-800 mb-4">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-4">
                    {title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {group.skills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
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
