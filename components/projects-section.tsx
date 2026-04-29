"use client"

import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import {
  Copy01Icon,
  FavouriteIcon,
  PencilEdit02Icon,
  Share01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { InlineDisclosureMenu } from "@/components/ui/menu";

const items = [
  { icon: <HugeiconsIcon icon={PencilEdit02Icon} />, label: "Edit" },
  { icon: <HugeiconsIcon icon={Copy01Icon} />, label: "Duplicate" },
  { icon: <HugeiconsIcon icon={FavouriteIcon} />, label: "Favourite" },
  { icon: <HugeiconsIcon icon={Share01Icon} />, label: "Share" },
];

export function ProjectsSection() {
  const [projectsOpen, setProjectsOpen] = React.useState(true)
  const [templatesOpen, setTemplatesOpen] = React.useState(false)

  return (
    <div className="flex flex-col w-full text-neutral-200 py-12 px-4 md:px-8 mt-12 border-t border-[#2E2F2F]">
      {/* Header */}
      <div className="flex w-full items-center justify-between mb-8">
        <div className="hidden md:block w-1/4" /> {/* Spacer for alignment */}
        <h2 className="text-xl font-semibold flex-1 text-left px-0 md:px-4">Your Projects</h2>
        <button className="flex items-center gap-2 bg-[#1C1C1C] hover:bg-[#262626] transition-colors px-3 py-1.5 rounded-full text-sm border border-[#2E2F2F]">
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 overflow-hidden flex items-center justify-center text-[8px] font-bold text-black" />
          <span>All Chains</span>
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row w-full gap-8 md:gap-0">
        {/* Left Sidebar Filters */}
        <div className="w-full md:w-1/4 flex flex-col gap-2 shrink-0">
          {/* Projects Group */}
          <div className="flex flex-col">
            <button
              onClick={() => setProjectsOpen(!projectsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold rounded-md bg-[#1C1C1C] hover:bg-[#262626] transition-colors"
            >
              <span>Projects</span>
              {projectsOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>
            {projectsOpen && (
              <div className="flex flex-col gap-1 mt-1 pl-3">
                <button className="text-left px-3 py-1.5 text-sm text-neutral-100 font-medium">
                  All
                </button>
                <button className="text-left px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                  Full Stack Dapp
                </button>
                <button className="text-left px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                  Smart Contract
                </button>
                <button className="text-left px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                  Mobile
                </button>
                <button className="text-left px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                  Games
                </button>
              </div>
            )}
          </div>

          <div className="h-px bg-[#2E2F2F] my-2 w-full" />

          {/* Templates Group */}
          <div className="flex flex-col">
            <button
              onClick={() => setTemplatesOpen(!templatesOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold rounded-md hover:bg-[#1C1C1C] transition-colors"
            >
              <span>Templates</span>
              {templatesOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>
          </div>
        </div>

        {/* Main Content Area (Empty State) */}
        <div className="flex-1 flex flex-col items-center justify-center py-24 px-4 text-center">
          <h3 className="text-neutral-300 font-medium text-lg mb-2">No projects found</h3>
          <p className="text-neutral-500 text-sm max-w-sm leading-relaxed">
            Start building amazing decentralized<br />
            applications. Create your first project and bring<br />
            your ideas to life.
          </p>
        </div>
      </div>
    </div>
  )
}
