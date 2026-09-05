import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { lessonsData } from '../data/lessonsData';
import { groupLessonsByTrack } from '../data/lessons/lessonTracks';
import { useProgressContext } from '../contexts/ProgressContext';
import { CheckCircle2, Clock, ChevronLeft } from 'lucide-react';

export const LessonsView: React.FC = () => {
  const navigate = useNavigate();
  const { completedLessons } = useProgressContext();

  // Grouped by each lesson's own `track`, never by array position — the old
  // slice(0,5)/(5,10)/(10,16) silently dropped any seventeenth lesson.
  const stages = groupLessonsByTrack(lessonsData).map(g => ({
    title: g.titleAr, subtitle: g.subtitleAr, lessons: g.lessons,
  }));

  return (
    <AppShell>
      <Header title="الدروس" />
      <div
        className="px-4 py-4 space-y-3 fade-in"
        style={{ background: 'linear-gradient(180deg, #0E2A36 0%, #123A46 100%)', minHeight: '100%' }}
      >
        <p className="text-sm" style={{ color: '#CBD5E1' }}>{completedLessons.length} من {lessonsData.length} درسًا مكتملًا</p>
        <div className="h-1.5 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(completedLessons.length/lessonsData.length)*100}%`, background: 'linear-gradient(to right, #5EEAD4, #A7F3D0)' }}
          />
        </div>
        {stages.map((stage, si) => (
          <div
            key={si}
            className={`space-y-2.5${si > 0 ? ' pt-3' : ''}`}
            style={si > 0 ? { borderTop: '1px solid rgba(94,234,212,0.08)' } : {}}
          >
            <div className="flex items-start justify-between gap-2 pb-0.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.28)', color: '#5EEAD4' }}
                >
                  {si + 1}
                </span>
                <div>
                  <h2 className="text-sm font-extrabold leading-tight" style={{ color: '#F8FAFC' }}>{stage.title}</h2>
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ color: '#CBD5E1' }}>{stage.subtitle}</p>
                </div>
              </div>
              <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: '#94a3b8' }}>{stage.lessons.length} دروس</span>
            </div>
            {stage.lessons.map(lesson => {
              const done = completedLessons.includes(lesson.id);
              return (
                <div
                  key={lesson.id}
                  className="glass-card p-4 transition-all"
                  style={{
                    background: 'rgba(20,59,72,0.82)',
                    border: `1px solid ${done ? 'rgba(74,222,128,0.25)' : 'rgba(94,234,212,0.12)'}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={done
                        ? { background: 'rgba(74,222,128,0.18)', color: '#4ADE80' }
                        : { background: 'rgba(94,234,212,0.1)', color: '#5EEAD4' }
                      }
                    >
                      {done ? <CheckCircle2 size={18}/> : lesson.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm" style={{ color: '#F8FAFC' }}>{lesson.title}</h3>
                        {done && (
                          <span className="text-xs px-2 py-0.5 rounded-full border" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', borderColor: 'rgba(74,222,128,0.2)' }}>
                            مكتمل
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#CBD5E1' }}>{lesson.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}><Clock size={10}/>{lesson.duration}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(94,234,212,0.1)', color: '#5EEAD4' }}>{lesson.level}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/lessons/${lesson.id}`)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: 'rgba(94,234,212,0.1)', color: '#5EEAD4' }}
                    >
                      <ChevronLeft size={16}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </AppShell>
  );
};
