"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  FileCode2,
  FilePlus2,
  Terminal,
  Pencil,
  Brain,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { ActionSummary } from "@/lib/builder/bolt";

// ─── Thinking Section ───────────────────────────────────────────────

interface ThinkingSectionProps {
  content: string;
  isThinking: boolean;
}

export const ThinkingSection: React.FC<ThinkingSectionProps> = ({
  content,
  isThinking,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-3"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <div
          className={`flex items-center justify-center w-5 h-5 rounded-md ${
            isThinking
              ? "bg-violet-500/20 text-violet-400"
              : "bg-neutral-700/50 text-neutral-400"
          }`}
        >
          {isThinking ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Brain className="w-3 h-3" />
          )}
        </div>
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            isThinking ? "text-violet-400" : "text-neutral-500"
          }`}
        >
          {isThinking ? "Thinking..." : "Thought process"}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-neutral-500 transition-transform ml-auto ${
            !isOpen ? "-rotate-90" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pl-7 text-[13px] leading-6 text-neutral-400 whitespace-pre-wrap border-l-2 border-neutral-700/50 ml-2.5">
              {content}
              {isThinking && (
                <span className="inline-block w-1.5 h-4 bg-violet-400/60 animate-pulse ml-0.5 align-middle rounded-sm" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Action Step Card ───────────────────────────────────────────────

interface ActionStepCardProps {
  action: ActionSummary;
  index: number;
}

const getActionIcon = (type: string) => {
  switch (type) {
    case "edit":
      return { Icon: Pencil, color: "text-amber-400", bg: "bg-amber-500/15" };
    case "file":
      return { Icon: FilePlus2, color: "text-emerald-400", bg: "bg-emerald-500/15" };
    case "shell":
      return { Icon: Terminal, color: "text-blue-400", bg: "bg-blue-500/15" };
    default:
      return { Icon: FileCode2, color: "text-neutral-400", bg: "bg-neutral-500/15" };
  }
};

export const ActionStepCard: React.FC<ActionStepCardProps> = ({
  action,
  index,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { Icon, color, bg } = getActionIcon(action.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="mb-1.5"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 w-full text-left py-1.5 px-2 rounded-lg hover:bg-[#1e1e1e] transition-colors group"
      >
        <div
          className={`flex items-center justify-center w-5 h-5 rounded-md ${bg} shrink-0`}
        >
          <Icon className={`w-3 h-3 ${color}`} />
        </div>
        <span className="text-[13px] text-neutral-300 font-medium truncate flex-1">
          {action.label}
        </span>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60 shrink-0" />
        <ChevronDown
          className={`w-3 h-3 text-neutral-600 transition-transform shrink-0 ${
            !isOpen ? "-rotate-90" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="ml-9 mt-1 mb-2">
              <pre className="text-[12px] leading-5 text-neutral-400 bg-[#111] border border-[#2a2a2a] rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {action.content.length > 800
                  ? action.content.slice(0, 800) + "\n..."
                  : action.content}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Agent Message (Full Component) ─────────────────────────────────

interface AgentMessageProps {
  /** The raw content being streamed */
  content: string;
  /** Parsed thinking content */
  thinkingContent: string;
  /** Whether the model is still thinking */
  isThinking: boolean;
  /** Whether the stream is still active */
  isStreaming: boolean;
  /** Completed action summaries */
  completedActions: ActionSummary[];
  /** Custom markdown renderer */
  renderMarkdown: (content: string) => React.ReactNode;
}

export const AgentMessage: React.FC<AgentMessageProps> = ({
  content,
  thinkingContent,
  isThinking,
  isStreaming,
  completedActions,
  renderMarkdown,
}) => {
  // Extract the "answer" portion (everything outside <think> and <boltArtifact> tags)
  let answerContent = content;

  // Remove think tags
  answerContent = answerContent.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // Remove open think tags (still streaming)
  const openThinkIdx = answerContent.toLowerCase().indexOf("<think>");
  if (openThinkIdx >= 0) {
    answerContent = answerContent.slice(0, openThinkIdx);
  }

  // Remove boltArtifact blocks
  answerContent = answerContent.replace(
    /<boltArtifact[\s\S]*?<\/boltArtifact>/g,
    ""
  );
  // Remove open boltArtifact tags (still streaming)
  const openArtifactIdx = answerContent.indexOf("<boltArtifact");
  if (openArtifactIdx >= 0) {
    answerContent = answerContent.slice(0, openArtifactIdx);
  }

  answerContent = answerContent.trim();

  return (
    <div className="space-y-2">
      {/* Thinking Section */}
      <ThinkingSection content={thinkingContent} isThinking={isThinking} />

      {/* Answer text (before actions) */}
      {answerContent && (
        <div className="text-sm leading-7">
          {renderMarkdown(answerContent)}
          {isStreaming && completedActions.length === 0 && (
            <span className="inline-block w-1.5 h-4 bg-neutral-400/60 animate-pulse ml-0.5 align-middle rounded-sm" />
          )}
        </div>
      )}

      {/* Action Steps */}
      {completedActions.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {completedActions.map((action, idx) => (
            <ActionStepCard key={idx} action={action} index={idx} />
          ))}
        </div>
      )}

      {/* Streaming indicator (when generating actions) */}
      {isStreaming && completedActions.length > 0 && (
        <div className="flex items-center gap-2 pl-2 py-1">
          <Loader2 className="w-3.5 h-3.5 text-neutral-500 animate-spin" />
          <span className="text-xs text-neutral-500">Generating...</span>
        </div>
      )}
    </div>
  );
};

export default AgentMessage;
