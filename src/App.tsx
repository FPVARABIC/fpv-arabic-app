import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SplashView } from './views/SplashView';
// import { SafetyGateView } from './views/SafetyGateView'; // reserved for BuildRoadmap flow
import { HomeView } from './views/HomeView';
import { BuildRoadmapView } from './views/BuildRoadmapView';
import { BuildRoadmapStageDetailView } from './views/BuildRoadmapStageDetailView';
import { LessonsView } from './views/LessonsView';
import { LessonDetailView } from './views/LessonDetailView';
import { ChecklistView } from './views/ChecklistView';
import { ProgrammingView } from './views/ProgrammingView';
import { ExpressLrsView } from './views/ExpressLrsView';
import { ExpressLrsSetupView } from './views/ExpressLrsSetupView';
import { ExpressLrsTroubleshootingView } from './views/ExpressLrsTroubleshootingView';
import { BetaflightView } from './views/BetaflightView';
import { BetaflightDetailView } from './views/BetaflightDetailView';
import { TroubleshootingView } from './views/TroubleshootingView';
import { ProgressView } from './views/ProgressView';
import { AssemblyView } from './views/AssemblyView';
import { SettingsView } from './views/SettingsView';
import { AboutView } from './views/AboutView';
import { ContactView } from './views/ContactView';
import { NotFoundView } from './views/NotFoundView';
import { PrivacyView } from './views/PrivacyView';
import { BotV2AssistantView } from './views/BotV2AssistantView';

// The encyclopedia, global search, glossary and diagnostics are code-split.
// The baseline build was already a single 2.4 MB chunk with an explicit Vite
// size warning; loading this much new content eagerly would have made that
// materially worse for every user, including those who never open these routes.
const KbHubView = lazy(() => import('./views/KbHubView').then(m => ({ default: m.KbHubView })));
const KbModuleView = lazy(() => import('./views/KbModuleView').then(m => ({ default: m.KbModuleView })));
const KbArticleView = lazy(() => import('./views/KbArticleView').then(m => ({ default: m.KbArticleView })));
const KbMatrixView = lazy(() => import('./views/KbMatrixView').then(m => ({ default: m.KbMatrixView })));
const SearchView = lazy(() => import('./views/SearchView').then(m => ({ default: m.SearchView })));
const GlossaryView = lazy(() => import('./views/GlossaryView').then(m => ({ default: m.GlossaryView })));
const DiagnoseView = lazy(() => import('./views/DiagnoseView').then(m => ({ default: m.DiagnoseView })));

const RouteFallback: React.FC = () => (
  <div
    data-testid="route-loading"
    style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#64748b', fontSize: 13,
    }}
  >
    جارٍ التحميل…
  </div>
);

const RedirectLogic: React.FC = () => <Navigate to="/welcome" replace/>;

export const App: React.FC = () => (
  <Suspense fallback={<RouteFallback/>}>
  <Routes>
    <Route path="/" element={<RedirectLogic/>}/>
    <Route path="/welcome" element={<SplashView/>}/>
    <Route path="/splash" element={<SplashView/>}/>
    {/* <Route path="/safety" element={<SafetyGateView/>}/> */}{/* reserved for BuildRoadmap flow.
        NOTE: SettingsView used to navigate here and landed users on the 404 view
        — see docs/platform/00-AUDIT.md item A3. That button no longer navigates. */}
    <Route path="/home" element={<HomeView/>}/>
    <Route path="/roadmap" element={<BuildRoadmapView/>}/>
    <Route path="/roadmap/:stageId" element={<BuildRoadmapStageDetailView/>}/>
    <Route path="/lessons" element={<LessonsView/>}/>
    <Route path="/lessons/:lessonId" element={<LessonDetailView/>}/>
    <Route path="/checklists" element={<ChecklistView/>}/>
    <Route path="/programming" element={<ProgrammingView/>}/>
    <Route path="/programming/expresslrs" element={<ExpressLrsView/>}/>
    <Route path="/programming/expresslrs/setup" element={<ExpressLrsSetupView/>}/>
    <Route path="/programming/expresslrs/troubleshooting" element={<ExpressLrsTroubleshootingView/>}/>
    <Route path="/betaflight" element={<BetaflightView/>}/>
    <Route path="/betaflight/:sectionId" element={<BetaflightDetailView/>}/>
    <Route path="/troubleshooting" element={<TroubleshootingView/>}/>
    <Route path="/progress" element={<ProgressView/>}/>
    <Route path="/assembly" element={<AssemblyView/>}/>
    <Route path="/settings" element={<SettingsView/>}/>
    <Route path="/about" element={<AboutView/>}/>
    <Route path="/contact" element={<ContactView/>}/>
    <Route path="/bot" element={<BotV2AssistantView/>}/>
    <Route path="/privacy" element={<PrivacyView/>}/>

    {/* Encyclopedia + reference mode */}
    <Route path="/kb" element={<KbHubView/>}/>
    <Route path="/kb/matrix" element={<KbMatrixView/>}/>
    <Route path="/kb/:moduleId" element={<KbModuleView/>}/>
    <Route path="/kb/:moduleId/:articleId" element={<KbArticleView/>}/>
    <Route path="/search" element={<SearchView/>}/>
    <Route path="/glossary" element={<GlossaryView/>}/>
    <Route path="/diagnose" element={<DiagnoseView/>}/>
    <Route path="/diagnose/:treeId" element={<DiagnoseView/>}/>

    <Route path="*" element={<NotFoundView/>}/>
  </Routes>
  </Suspense>
);
