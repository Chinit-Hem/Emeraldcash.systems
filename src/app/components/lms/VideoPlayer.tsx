/**
 * Video Player Component with YouTube Integration
 *
 * Features:
 * - YouTube video embed with react-player (no custom overlay controls)
 * - Step-by-step instructions panel
 * - Mark as complete button
 * - Progress tracking
 * - Responsive design
 *
 * WORKAROUND 1: Using react-player library for better origin handling
 * WORKAROUND 2: Removed sandbox attribute to prevent blocking
 * WORKAROUND 3: Dummy origin for local IPs implemented in buildYoutubeEmbedUrl
 *
 * @module VideoPlayer
 */

"use client";

import React, { useState, useRef } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  MonitorPlay,
  Maximize2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";

// ============================================================================
// Types
// ============================================================================

interface VideoPlayerProps {
  title: string;
  description: string | null;
  youtubeUrl: string;
  youtubeVideoId: string;
  stepByStepInstructions: string | null;
  durationMinutes: number | null;
  isCompleted: boolean;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================================
// Helper Components
// ============================================================================

const InstructionsPanel: React.FC<{
  instructions: string;
  currentStep: number;
  onStepClick: (step: number) => void;
}> = ({ instructions, currentStep, onStepClick }) => {
  // Parse markdown-style instructions
  const steps = instructions
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      // Remove markdown headers and clean up
      const cleanLine = line
        .replace(/^#{1,6}\s*/, "") // Remove headers
        .replace(/^\d+\.\s*/, "") // Remove numbered list markers
        .replace(/^[-*]\s*/, "") // Remove bullet points
        .trim();
      return cleanLine;
    })
    .filter((line) => line.length > 0);

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div
          key={index}
          onClick={() => onStepClick(index)}
          className={`p-3 rounded-lg cursor-pointer transition-all ${
            currentStep === index
              ? "bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500"
              : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                currentStep === index
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {index + 1}
            </div>
            <p
              className={`text-sm ${
                currentStep === index
                  ? "text-gray-900 dark:text-white font-medium"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {step}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function VideoPlayer({
  title,
  description,
  youtubeUrl,
  youtubeVideoId,
  stepByStepInstructions,
  durationMinutes,
  isCompleted: initialCompleted,
  onComplete,
  onBack,
}: VideoPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle player error - show fallback
  const handlePlayerReady = () => {
    setHasError(false);
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle complete button
  const handleComplete = () => {
    setIsCompleted(true);
    onComplete();
  };

  // Parse instructions for step navigation
  const instructionSteps = stepByStepInstructions
    ? stepByStepInstructions
        .split("\n")
        .filter((line) => line.trim())
        .map((line) =>
          line
            .replace(/^#{1,6}\s*/, "")
            .replace(/^\d+\.\s*/, "")
            .replace(/^[-*]\s*/, "")
            .trim()
        )
        .filter((line) => line.length > 0)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lms-lesson-page">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Completion Status */}
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Completed</span>
              </div>
            ) : (
              <GlassButton variant="primary" onClick={handleComplete}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Complete
              </GlassButton>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <div
              ref={containerRef}
              className={`overflow-hidden ${
                isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
              }`}
            >
              <GlassCard className="h-full">
                {/* Video Container - WORKAROUND 1: Using react-player */}
                <div className="relative aspect-video bg-black">
                  {!hasError ? (
                    <>
                      {/* Native iframe with Safari-compatible sandboxing */}
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeVideoId}?si=Endu7xKpwTIo3cPM`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        sandbox="allow-forms allow-scripts allow-pointer-lock allow-same-origin allow-presentation"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        onLoad={handlePlayerReady}
                      />

                      {/* Fullscreen Button Only - Native YouTube controls handle play/pause */}
                      <div className="absolute bottom-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={toggleFullscreen}
                          className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                          title="Fullscreen"
                        >
                          <Maximize2 className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    /* FALLBACK: Show link to open video in new tab */
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                          <MonitorPlay className="w-8 h-8 text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            Video Player Unavailable
                          </h3>
                          <p className="text-sm text-gray-400 mt-2 max-w-md">
                            The embedded video player cannot load due to network restrictions.
                            Please open the video directly on YouTube.
                          </p>
                        </div>
                        <a
                          href={youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <MonitorPlay className="w-5 h-5" />
                          Open Video on YouTube
                        </a>
                        <p className="text-xs text-gray-500">
                          Link opens in a new tab • You can still mark this lesson complete after watching
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Info Bar */}
                <div className="p-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {durationMinutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{durationMinutes} min</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MonitorPlay className="w-4 h-4" />
                      <span>YouTube</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowInstructions(!showInstructions)}
                      className={`p-2 rounded-lg transition-colors ${
                        showInstructions
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Progress Bar */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lesson Progress
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Step {currentStep + 1} of {instructionSteps.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentStep + 1) / Math.max(1, instructionSteps.length)) * 100}%`,
                  }}
                />
              </div>
            </GlassCard>
          </div>

          {/* Instructions Panel */}
          {showInstructions && (
            <div className="lg:col-span-1">
              <GlassCard className="h-full">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    Step-by-Step Instructions
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Follow along with the video
                  </p>
                </div>

                <div className="p-4 max-h-[600px] overflow-y-auto lms-instructions-panel">
                  {stepByStepInstructions ? (
                    <InstructionsPanel
                      instructions={stepByStepInstructions}
                      currentStep={currentStep}
                      onStepClick={setCurrentStep}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">
                        No instructions available for this lesson
                      </p>
                    </div>
                  )}
                </div>

                {/* Step Navigation */}
                {instructionSteps.length > 0 && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                      disabled={currentStep === 0}
                    >
                      Previous
                    </GlassButton>
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        setCurrentStep(
                          Math.min(instructionSteps.length - 1, currentStep + 1)
                        )
                      }
                      disabled={currentStep === instructionSteps.length - 1}
                    >
                      Next Step
                    </GlassButton>
                  </div>
                )}
              </GlassCard>
            </div>
          )}
        </div>

        {/* Completion CTA */}
        {!isCompleted && (
          <GlassCard className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Finished the lesson?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mark this lesson as complete to track your progress
                </p>
              </div>
              <GlassButton variant="primary" size="lg" onClick={handleComplete}>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Mark as Complete
              </GlassButton>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

export default VideoPlayer;
