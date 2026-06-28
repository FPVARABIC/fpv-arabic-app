import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SplashView } from './views/SplashView';
import { SafetyGateView } from './views/SafetyGateView';
import { HomeView } from './views/HomeView';
import { BuildRoadmapView } from './views/BuildRoadmapView';
import { LessonsView } from './views/LessonsView';
import { LessonDetailView } from './views/LessonDetailView';
import { ChecklistView } from './views/ChecklistView';
import { BetaflightView } from './views/BetaflightView';
import { BetaflightDetailView } from './views/BetaflightDetailView';
import { TroubleshootingView } from './views/TroubleshootingView';
import { ProgressView } from './views/ProgressView';
import { SettingsView } from './views/SettingsView';
import { AboutView } from './views/AboutView';
import { ContactView } from './views/ContactView';
import { NotFoundView } from './views/NotFoundView';
import { BotV2AssistantView } from './views/BotV2AssistantView';

const RedirectLogic: React.FC = () => <Navigate to="/welcome" replace/>;

export const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<RedirectLogic/>}/>
    <Route path="/welcome" element={<SplashView/>}/>
    <Route path="/splash" element={<SplashView/>}/>
    <Route path="/safety" element={<SafetyGateView/>}/>
    <Route path="/home" element={<HomeView/>}/>
    <Route path="/roadmap" element={<BuildRoadmapView/>}/>
    <Route path="/lessons" element={<LessonsView/>}/>
    <Route path="/lessons/:lessonId" element={<LessonDetailView/>}/>
    <Route path="/checklists" element={<ChecklistView/>}/>
    <Route path="/betaflight" element={<BetaflightView/>}/>
    <Route path="/betaflight/:sectionId" element={<BetaflightDetailView/>}/>
    <Route path="/troubleshooting" element={<TroubleshootingView/>}/>
    <Route path="/progress" element={<ProgressView/>}/>
    <Route path="/settings" element={<SettingsView/>}/>
    <Route path="/about" element={<AboutView/>}/>
    <Route path="/contact" element={<ContactView/>}/>
    <Route path="/bot" element={<BotV2AssistantView/>}/>
    <Route path="*" element={<NotFoundView/>}/>
  </Routes>
);
