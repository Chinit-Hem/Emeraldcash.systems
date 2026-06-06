/**
 * Lesson Card Component
 * 
 * Professional lesson thumbnail card with:
 * - YouTube thumbnail preview
 * - Play button overlay
 * - Duration badge
 * - Completion status
 * - Liquid Glass hover effects
 * 
 * @module LessonCard
 */

"use client";

import React from "react";
import { Play, CheckCircle2, Clock, Lock } from "lucide-react";
import { GlassCard } from "@/shared/components/ui/glass/GlassCard";

// ============================================================================
// Types
// ============================================================================

interface LessonCardProps {
  id: number;
  title: string;
  description: string | null;
  youtubeVideoId: string;
  durationMinutes: number | null;
  orderIndex: number;
  isCompleted: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  onClick: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getYouTubeThumbnail(videoId: string): string {
  // Try maxres first, then fallback to hqdefault
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// ============================================================================
// Component
// ============================================================================

export function LessonCard({
  title,
  description,
  youtubeVideoId,
  durationMinutes,
  orderIndex,
  isCompleted,
  isLocked = false,
  isActive = false,
  onClick,
}: LessonCardProps) {
  const thumbnailUrl = getYouTubeThumbnail(youtubeVideoId);

  return (
    <GlassCard
      className={`group cursor-pointer overflow-hidden transition-all duration-300 ${
        isActive 
          ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20" 
          : "hover:shadow-xl hover:scale-[1.02]"
      } ${isLocked ? "opacity-75" : ""}`}
      onClick={!isLocked ? onClick : undefined}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video overflow-hidden bg-gray-900">
        {/* Thumbnail Image */}
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            // Fallback to default thumbnail if image fails
            (e.target as HTMLImageElement).src = "/placeholder-car.svg";
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        
        {/* Play Button Overlay */}
        {!isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              transition-all duration-300 transform
              ${isActive 
                ? "bg-emerald-500 scale-100" 
                : "bg-white/20 backdrop-blur-sm scale-90 group-hover:scale-100 group-hover:bg-emerald-500/90"
              }
            `}>
              {isCompleted ? (
                <CheckCircle2 className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </div>
          </div>
        )}
        
        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-gray-700/80 flex items-center justify-center">
              <Lock className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        )}
        
        {/* Duration Badge */}
        {durationMinutes && !isLocked && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-md text-xs text-white font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {`${durationMinutes} min`}
          </div>
        )}
        
        {/* Completion Badge */}
        {isCompleted && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500/90 backdrop-blur-sm rounded-md text-xs text-white font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </div>
        )}
        
        {/* Active Indicator */}
        {isActive && (
          <div className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Lesson Number */}
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
            ${isCompleted 
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" 
              : isActive
              ? "bg-emerald-500 text-white"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }
          `}>
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              orderIndex + 1
            )}
          </div>
          
          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`
              font-semibold text-sm line-clamp-2 mb-1
              ${isActive 
                ? "text-emerald-700 dark:text-emerald-300" 
                : "text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
              }
            `}>
              {title}
            </h3>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default LessonCard;
